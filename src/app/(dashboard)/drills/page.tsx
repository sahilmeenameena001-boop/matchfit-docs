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

const skillLabel = (v: string) => SKILLS.find((s) => s.value === v)?.label ?? v;

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

const medalClass = (rank: number) =>
  rank <= 3 ? `medal m${rank}` : "medal";

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

  const resetAttempts = () =>
    setPlayers((rows) => rows.map((r) => ({ ...r, attempts: [] })));

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

  return (
    <div className="dash-panel">
      <h1 className="dash-title">Gamified Drills</h1>
      <p className="dash-sub">
        Pillar 2 engine — pick the right games, score them live with anti-gaming
        rules, and rank the session XP. Computed on this device.
      </p>

      {/* ---------------------- §5.3 challenge picker -------------------- */}
      <form
        className="pw-card"
        onSubmit={(e) => {
          e.preventDefault();
          generateSelection();
        }}
      >
        <div className="pw-cardhead">
          <span className="pw-step">1</span>
          <h2>Pick today&apos;s games</h2>
        </div>
        <p className="pw-cardsub">
          Score = relevance + player need + novelty + equipment fit − fatigue risk.
        </p>
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
                  <span className="pick-rank">
                    <span className={medalClass(s.order)}>{s.order}</span>
                    <h3>{s.challenge.name}</h3>
                    <span
                      className={`dot ${s.challenge.intensity}`}
                      title={`${s.challenge.intensity} intensity`}
                    />
                  </span>
                  <span className="pillar-chip">
                    <b>score {s.score.total.toFixed(2)}</b>
                  </span>
                </div>
                <p className="p2-desc">{s.challenge.description}</p>
                <div className="tagline">
                  {s.challenge.skillFocus.map((sk) => (
                    <span className="tag" key={sk}>
                      {skillLabel(sk)}
                    </span>
                  ))}
                  <span className="tag">{s.challenge.mechanics.length} mechanics</span>
                  <span className="tag">{s.challenge.space} space</span>
                  <span className="tag">{s.challenge.equipment.join(" · ")}</span>
                </div>
                <div className="p4-chips">
                  <span className="pillar-chip">relevance {s.score.relevance.toFixed(2)}</span>
                  <span className="pillar-chip">need {s.score.need.toFixed(2)}</span>
                  <span className="pillar-chip">novelty {s.score.novelty.toFixed(2)}</span>
                  <span className="pillar-chip">fit {s.score.equipmentFit.toFixed(2)}</span>
                  <span className="pillar-chip">fatigue −{s.score.fatigueRisk.toFixed(2)}</span>
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
      <div className="pw-card">
        <div className="pw-cardhead">
          <span className="pw-step">2</span>
          <h2>Score the squad live</h2>
        </div>
        <p className="pw-cardsub">
          Tap attempts as they happen — misses earn nothing, low-risk spam
          diminishes after 3, bonuses cap at ×1.5, difficulty multiplies
          (0.80 / 1.00 / 1.15 / 1.30).
        </p>

        <div className="pcard-grid">
          {players.map((p, i) => {
            const result = squadScore?.players[i];
            return (
              <div className={`pcard ${result?.metParticipation ? "done" : ""}`} key={i}>
                <div className="pcard-top">
                  <input
                    aria-label={`Player ${i + 1} name`}
                    value={p.name}
                    onChange={(e) => setPlayerField(i, { name: e.target.value })}
                  />
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
                        {d} ×{{ foundation: 0.8, standard: 1, competitive: 1.15, advanced: 1.3 }[d]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="tap-row">
                  <button type="button" className="tap good"
                    onClick={() => addAttempt(i, { correct: true })}>
                    ✓ Good
                  </button>
                  <button type="button" className="tap low"
                    title="Safe action — diminishes when spammed"
                    onClick={() => addAttempt(i, { correct: true, risk: "low" })}>
                    ✓ Low-risk
                  </button>
                  <button type="button" className="tap bonus"
                    title="Bonus target hit (×2, capped ×1.5)"
                    onClick={() => addAttempt(i, { correct: true, bonusMultiplier: 2 })}>
                    ★ Bonus
                  </button>
                  <button type="button" className="tap miss"
                    onClick={() => addAttempt(i, { correct: false })}>
                    ✗ Miss
                  </button>
                  <button type="button" className="tap undo"
                    title="Undo last attempt"
                    onClick={() => undoAttempt(i)}
                    disabled={p.attempts.length === 0}>
                    ↺
                  </button>
                </div>
                <div className="pcard-stats">
                  <span>
                    attempts <b>{result ? `${result.counted} ✓ / ${result.ignored} ✗` : "0 / 0"}</b>
                  </span>
                  <span>
                    raw <b>{result ? result.rawPoints : 0}</b>
                  </span>
                  <span>
                    adjusted <b>{result ? result.adjustedScore : 0}</b>
                  </span>
                </div>
                {result?.notes.map((n, k) => (
                  <div className="pcard-note" key={k}>
                    {n}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {squadScore && (
          <div className="pw-banner">
            <span>
              <span className="big">{squadScore.squadTotal}</span>{" "}
              <span className="lbl">squad total</span>
            </span>
            <span className={`p4-badge ${squadScore.participation.met ? "ok" : "bad"}`}>
              {squadScore.participation.met
                ? "✓ participation met"
                : `waiting on: ${squadScore.participation.missing
                    .map((id) => players[Number(id.slice(1)) - 1]?.name ?? id)
                    .join(", ")}`}
            </span>
            <button type="button" className="btn btn-ghost auto" onClick={resetAttempts}>
              Reset round
            </button>
          </div>
        )}
      </div>

      {/* ---------------------------- §5.7 XP board ----------------------- */}
      <div className="pw-card">
        <div className="pw-cardhead">
          <span className="pw-step">3</span>
          <h2>Session XP board</h2>
        </div>
        <p className="pw-cardsub">
          Result 30% · execution 25% · improvement 20% · team 15% · creativity 5%
          · sportsmanship 5% — the challenge winner isn&apos;t automatically the
          XP winner.
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

        <div style={{ marginTop: 14 }}>
          {xpBoard.map((p) => {
            const top = (
              Object.entries(p.breakdown) as Array<[string, number]>
            ).sort((a, b) => b[1] - a[1])[0];
            return (
              <div className="xp-row" key={p.playerId}>
                <span className={medalClass(p.rank)}>{p.rank}</span>
                <span className="xp-name">{p.name}</span>
                <div className="meter">
                  <span style={{ width: `${p.xp}%` }} />
                </div>
                <span className="xp-val">{p.xp.toFixed(1)}</span>
                <span className="xp-top">
                  top: {top ? `${top[0]} +${top[1].toFixed(1)}` : "—"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
