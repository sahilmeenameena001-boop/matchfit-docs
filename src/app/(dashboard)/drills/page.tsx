"use client";

/**
 * Pillar 2 — Gamified Drills workspace. QUICK LOCAL MODE.
 * Runs the optimization engine (src/lib/pillar2) right in the browser —
 * no login and no Supabase needed:
 *   §5.3 challenge picker  — relevance + need + novelty + fit − fatigue
 *   §5.5/5.6 live scoring  — attempts with anti-gaming rules + multipliers
 *   §5.7 XP board          — weighted blend, winner ≠ top XP by design
 * Spec: docs/Pillar2_Gamified_Drills.md
 */
import { useMemo, useState } from "react";
import {
  CHALLENGE_CATALOG,
  selectChallenges,
  scoreSquadChallenge,
  rankByXP,
  type Attempt,
  type ChallengeSelection,
  type DifficultyTier,
  type SkillFocus,
  type Space,
} from "@/lib/pillar2";

const SKILLS: { value: SkillFocus; label: string }[] = [
  { value: "passing", label: "Passing" },
  { value: "first_touch", label: "First touch" },
  { value: "dribbling", label: "Dribbling" },
  { value: "finishing", label: "Finishing" },
  { value: "defending", label: "Defending" },
  { value: "possession", label: "Possession" },
  { value: "reactions", label: "Reactions" },
  { value: "awareness", label: "Awareness" },
];

const EQUIPMENT = ["cones", "balls", "bibs", "goals"];
const DIFFICULTIES: DifficultyTier[] = [
  "foundation",
  "standard",
  "competitive",
  "advanced",
];

type XPRow = {
  name: string;
  result: string;
  execution: string;
  improvement: string;
  team: string;
  creativity: string;
  sportsmanship: string;
};

const num = (v: string, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const toggle = <T,>(list: T[], item: T): T[] =>
  list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

export default function DrillsPage() {
  /* ---------------------- §5.3 challenge picker ---------------------- */
  const [focus, setFocus] = useState<SkillFocus[]>(["first_touch"]);
  const [weaknesses, setWeaknesses] = useState<SkillFocus[]>([]);
  const [equipment, setEquipment] = useState<string[]>([...EQUIPMENT]);
  const [playedRecently, setPlayedRecently] = useState<string[]>([]);
  const [space, setSpace] = useState<Space>("large");
  const [squadSize, setSquadSize] = useState("5");
  const [gameCount, setGameCount] = useState("3");
  const [selection, setSelection] = useState<ChallengeSelection | null>(null);
  const [selErr, setSelErr] = useState("");

  const generateSelection = () => {
    setSelErr("");
    try {
      setSelection(
        selectChallenges({
          sessionFocus: focus,
          playerNeeds: Object.fromEntries(weaknesses.map((w) => [w, 0.8])),
          recentChallenges: playedRecently.map((id) => ({
            challengeId: id,
            sessionsAgo: 1,
          })),
          availableEquipment: equipment,
          availableSpace: space,
          squadSize: num(squadSize, 5),
          count: num(gameCount, 3),
        })
      );
    } catch (e) {
      setSelection(null);
      setSelErr(e instanceof Error ? e.message : "Could not select challenges.");
    }
  };

  /* -------------------- §5.5/5.6 live squad scoring ------------------- */
  const [players, setPlayers] = useState(
    [1, 2, 3, 4, 5].map((n) => ({
      name: `Player ${n}`,
      difficulty: "standard" as DifficultyTier,
      attempts: [] as Attempt[],
    }))
  );

  const addAttempt = (i: number, attempt: Attempt) =>
    setPlayers((rows) =>
      rows.map((r, j) => (j === i ? { ...r, attempts: [...r.attempts, attempt] } : r))
    );
  const undoAttempt = (i: number) =>
    setPlayers((rows) =>
      rows.map((r, j) =>
        j === i ? { ...r, attempts: r.attempts.slice(0, -1) } : r
      )
    );
  const setPlayerField = (i: number, patch: Partial<(typeof players)[number]>) =>
    setPlayers((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const squadScore = useMemo(() => {
    try {
      return scoreSquadChallenge({
        players: players.map((p, i) => ({
          playerId: `p${i + 1}`,
          name: p.name,
          difficulty: p.difficulty,
          attempts: p.attempts,
        })),
      });
    } catch {
      return null;
    }
  }, [players]);

  /* ---------------------------- §5.7 XP board -------------------------- */
  const [xpRows, setXpRows] = useState<XPRow[]>(
    [1, 2, 3, 4, 5].map((n) => ({
      name: `Player ${n}`,
      result: "50",
      execution: "50",
      improvement: "50",
      team: "50",
      creativity: "50",
      sportsmanship: "50",
    }))
  );
  const setXp = (i: number, patch: Partial<XPRow>) =>
    setXpRows((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const xpBoard = useMemo(
    () =>
      rankByXP(
        xpRows.map((r, i) => ({
          playerId: `p${i + 1}`,
          name: r.name,
          components: {
            challengeResult: num(r.result, 0),
            technicalExecution: num(r.execution, 0),
            improvement: num(r.improvement, 0),
            teamContribution: num(r.team, 0),
            creativity: num(r.creativity, 0),
            sportsmanship: num(r.sportsmanship, 0),
          },
        }))
      ),
    [xpRows]
  );

  const challengeName = (id: string) =>
    CHALLENGE_CATALOG.find((c) => c.id === id)?.name ?? id;

  return (
    <div className="dash-panel">
      <h1 className="dash-title">Gamified Drills</h1>
      <p className="dash-sub">
        Pillar 2 engine — pick the right games, score them live with anti-gaming
        rules, and rank the session XP. Computed on this device.
      </p>

      {/* ---------------------- §5.3 challenge picker -------------------- */}
      <form
        className="idea-card"
        onSubmit={(e) => {
          e.preventDefault();
          generateSelection();
        }}
      >
        <h2 className="dash-h2" style={{ marginTop: 0 }}>
          1 · Pick today&apos;s games
        </h2>
        {selErr && <div className="form-error">{selErr}</div>}

        <label>Session focus (programme relevance)</label>
        <div className="p2-chiprow">
          {SKILLS.map((s) => (
            <button
              key={s.value}
              type="button"
              className={focus.includes(s.value) ? "on" : ""}
              onClick={() => setFocus((f) => toggle(f, s.value))}
            >
              {s.label}
            </button>
          ))}
        </div>

        <label>
          Squad weaknesses from last session <span className="opt">(player need)</span>
        </label>
        <div className="p2-chiprow">
          {SKILLS.map((s) => (
            <button
              key={s.value}
              type="button"
              className={weaknesses.includes(s.value) ? "on" : ""}
              onClick={() => setWeaknesses((w) => toggle(w, s.value))}
            >
              {s.label}
            </button>
          ))}
        </div>

        <label>Equipment available</label>
        <div className="p2-chiprow">
          {EQUIPMENT.map((e) => (
            <button
              key={e}
              type="button"
              className={equipment.includes(e) ? "on" : ""}
              onClick={() => setEquipment((eq) => toggle(eq, e))}
            >
              {e}
            </button>
          ))}
        </div>

        <label>
          Played last session <span className="opt">(novelty penalty)</span>
        </label>
        <div className="p2-chiprow">
          {CHALLENGE_CATALOG.map((c) => (
            <button
              key={c.id}
              type="button"
              className={playedRecently.includes(c.id) ? "on" : ""}
              onClick={() => setPlayedRecently((p) => toggle(p, c.id))}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="row">
          <div className="field">
            <label htmlFor="space">Space</label>
            <select
              id="space"
              value={space}
              onChange={(e) => setSpace(e.target.value as Space)}
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="squad">Squad size</label>
            <input
              id="squad"
              type="number"
              min={1}
              max={11}
              value={squadSize}
              onChange={(e) => setSquadSize(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="count">Games</label>
            <input
              id="count"
              type="number"
              min={1}
              max={6}
              value={gameCount}
              onChange={(e) => setGameCount(e.target.value)}
            />
          </div>
        </div>

        <button className="btn btn-primary auto" type="submit">
          Select challenges
        </button>

        {selection && (
          <>
            {selection.selected.map((s) => (
              <div className="p2-pickcard" key={s.challenge.id}>
                <div className="p2-pickhead">
                  <h3>
                    {s.order} · {s.challenge.name}
                  </h3>
                  <span className="pillar-chip">
                    <b>score {s.score.total.toFixed(2)}</b>
                  </span>
                </div>
                <p className="p2-desc">{s.challenge.description}</p>
                <div className="p4-chips">
                  <span className="pillar-chip">relevance {s.score.relevance.toFixed(2)}</span>
                  <span className="pillar-chip">need {s.score.need.toFixed(2)}</span>
                  <span className="pillar-chip">novelty {s.score.novelty.toFixed(2)}</span>
                  <span className="pillar-chip">fit {s.score.equipmentFit.toFixed(2)}</span>
                  <span className="pillar-chip">fatigue −{s.score.fatigueRisk.toFixed(2)}</span>
                  <span className="pillar-chip">
                    {s.challenge.intensity} intensity · {s.challenge.mechanics.length} mechanics
                  </span>
                </div>
                {s.warnings.map((w, i) => (
                  <div className="form-error" key={i}>
                    {w}
                  </div>
                ))}
              </div>
            ))}
            {selection.excluded.length > 0 && (
              <p className="p2-desc">
                Not possible today:{" "}
                {selection.excluded
                  .map((e) => `${e.name} (${e.reasons[0]})`)
                  .join(" · ")}
              </p>
            )}
          </>
        )}
      </form>

      {/* -------------------- §5.5/5.6 live squad scoring ----------------- */}
      <div className="idea-card">
        <h2 className="dash-h2" style={{ marginTop: 0 }}>
          2 · Score the squad live
        </h2>
        <p className="p2-desc">
          Tap attempts as they happen. Incorrect attempts earn nothing, low-risk
          spam diminishes after 3, bonuses cap at ×1.5, and the difficulty tier
          multiplies the raw score (0.80 / 1.00 / 1.15 / 1.30).
        </p>

        <div className="p4-scroll">
          <table className="p4-table">
            <thead>
              <tr>
                <th className="name-cell">Player</th>
                <th>Difficulty</th>
                <th>Attempts</th>
                <th>✓ / ✗</th>
                <th>Raw</th>
                <th>Adjusted</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p, i) => {
                const result = squadScore?.players[i];
                return (
                  <tr key={i}>
                    <td className="name-cell">
                      <input
                        aria-label={`Player ${i + 1} name`}
                        value={p.name}
                        onChange={(e) => setPlayerField(i, { name: e.target.value })}
                        style={{ minWidth: 110 }}
                      />
                    </td>
                    <td>
                      <select
                        aria-label={`Player ${i + 1} difficulty`}
                        value={p.difficulty}
                        onChange={(e) =>
                          setPlayerField(i, {
                            difficulty: e.target.value as DifficultyTier,
                          })
                        }
                      >
                        {DIFFICULTIES.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div className="p2-attempt-btns">
                        <button type="button" onClick={() => addAttempt(i, { correct: true })}>
                          ✓ Good
                        </button>
                        <button
                          type="button"
                          title="Safe action — diminishes when spammed"
                          onClick={() => addAttempt(i, { correct: true, risk: "low" })}
                        >
                          ✓ Low-risk
                        </button>
                        <button
                          type="button"
                          title="Bonus target hit (×2, capped ×1.5)"
                          onClick={() =>
                            addAttempt(i, { correct: true, bonusMultiplier: 2 })
                          }
                        >
                          ✓ Bonus
                        </button>
                        <button type="button" onClick={() => addAttempt(i, { correct: false })}>
                          ✗ Miss
                        </button>
                        <button
                          type="button"
                          title="Undo last attempt"
                          onClick={() => undoAttempt(i)}
                          disabled={p.attempts.length === 0}
                        >
                          ↺
                        </button>
                      </div>
                    </td>
                    <td>
                      {result ? `${result.counted} / ${result.ignored}` : "0 / 0"}
                    </td>
                    <td>{result ? result.rawPoints : 0}</td>
                    <td>
                      <b>{result ? result.adjustedScore : 0}</b>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {squadScore && (
          <>
            <div className="p4-chips">
              <span className="pillar-chip">
                <b>squad total {squadScore.squadTotal}</b>
              </span>
              <span
                className={`p4-badge ${squadScore.participation.met ? "ok" : "bad"}`}
              >
                {squadScore.participation.met
                  ? "participation met"
                  : `waiting on: ${squadScore.participation.missing
                      .map((id) => players[Number(id.slice(1)) - 1]?.name ?? id)
                      .join(", ")}`}
              </span>
            </div>
            {squadScore.players
              .flatMap((p) => p.notes.map((n) => `${p.name}: ${n}`))
              .map((n, i) => (
                <p className="p2-desc" key={i} style={{ margin: "2px 0" }}>
                  {n}
                </p>
              ))}
          </>
        )}
      </div>

      {/* ---------------------------- §5.7 XP board ----------------------- */}
      <div className="idea-card">
        <h2 className="dash-h2" style={{ marginTop: 0 }}>
          3 · Session XP board
        </h2>
        <p className="p2-desc">
          Weighted blend — result 30%, execution 25%, improvement 20%, team 15%,
          creativity 5%, sportsmanship 5%. The challenge winner isn&apos;t
          automatically the XP winner.
        </p>

        <div className="p4-scroll">
          <table className="p4-table">
            <thead>
              <tr>
                <th className="name-cell">Player</th>
                <th>Result</th>
                <th>Execution</th>
                <th>Improve</th>
                <th>Team</th>
                <th>Creative</th>
                <th>Sports</th>
              </tr>
            </thead>
            <tbody>
              {xpRows.map((r, i) => (
                <tr key={i}>
                  <td className="name-cell">
                    <input
                      aria-label={`XP player ${i + 1} name`}
                      value={r.name}
                      onChange={(e) => setXp(i, { name: e.target.value })}
                      style={{ minWidth: 110 }}
                    />
                  </td>
                  {(
                    [
                      "result",
                      "execution",
                      "improvement",
                      "team",
                      "creativity",
                      "sportsmanship",
                    ] as const
                  ).map((key) => (
                    <td key={key}>
                      <input
                        className="p2-xp-input"
                        aria-label={`${r.name} ${key}`}
                        type="number"
                        min={0}
                        max={100}
                        value={r[key]}
                        onChange={(e) => setXp(i, { [key]: e.target.value })}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p4-scroll">
          <table className="p4-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th className="name-cell">Player</th>
                <th>XP</th>
                <th>Top contributor</th>
              </tr>
            </thead>
            <tbody>
              {xpBoard.map((p) => {
                const top = (
                  Object.entries(p.breakdown) as Array<[string, number]>
                ).sort((a, b) => b[1] - a[1])[0];
                return (
                  <tr key={p.playerId}>
                    <td>
                      <b>#{p.rank}</b>
                    </td>
                    <td className="name-cell">{p.name}</td>
                    <td>
                      <b>{p.xp.toFixed(2)}</b>
                    </td>
                    <td>{top ? `${top[0]} (+${top[1].toFixed(1)})` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
