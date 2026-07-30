"use client";

/**
 * Pillar 4 — Small-Cluster Matches workspace. QUICK LOCAL MODE.
 * Runs the optimization engine (src/lib/pillar4) right in the browser —
 * no login and no Supabase needed:
 *   §7.1 rotation planner — 4-a-side lineups with a rotating sub and fair minutes
 *   §7.2 match scheduler  — round-robin across squads on limited pitches
 * Spec: docs/Pillar4_Mathematical_Optimization.md
 */
import { useState } from "react";
import {
  planRotation,
  scheduleMatches,
  type MatchSchedule,
  type RotationPlan,
} from "@/lib/pillar4";

type PlayerRow = { name: string; minutes: string; fatigued: boolean };
type SquadRow = { name: string; rating: string };

const DEFAULT_PLAYERS: PlayerRow[] = [1, 2, 3, 4, 5].map((n) => ({
  name: `Player ${n}`,
  minutes: "0",
  fatigued: false,
}));

const DEFAULT_SQUADS: SquadRow[] = [
  { name: "Squad A", rating: "1520" },
  { name: "Squad B", rating: "1480" },
  { name: "Squad C", rating: "1450" },
  { name: "Squad D", rating: "1410" },
  { name: "Squad E", rating: "1370" },
  { name: "Squad F", rating: "1330" },
];

const num = (v: string, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/** Equity meter geometry: the bar spans 0–1.3× of squad average. */
const METER_MAX = 1.3;
const pct = (v: number) => `${Math.min(100, Math.max(0, (v / METER_MAX) * 100))}%`;

export default function MatchesPage() {
  /* ------------------------- §7.1 rotation state ------------------------- */
  const [players, setPlayers] = useState<PlayerRow[]>(DEFAULT_PLAYERS);
  const [matchMinutes, setMatchMinutes] = useState("15");
  const [intervalMinutes, setIntervalMinutes] = useState("3");
  const [onPitch, setOnPitch] = useState("4");
  const [plan, setPlan] = useState<RotationPlan | null>(null);
  const [rotErr, setRotErr] = useState("");

  const setPlayer = (i: number, patch: Partial<PlayerRow>) =>
    setPlayers((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const generateRotation = () => {
    setRotErr("");
    try {
      setPlan(
        planRotation({
          players: players.map((p) => ({
            name: p.name,
            historicalMinutes: Math.max(0, num(p.minutes, 0)),
            fatigued: p.fatigued,
          })),
          matchMinutes: num(matchMinutes, 15),
          intervalMinutes: num(intervalMinutes, 3),
          onPitch: num(onPitch, 4),
        })
      );
    } catch (e) {
      setPlan(null);
      setRotErr(e instanceof Error ? e.message : "Could not plan the rotation.");
    }
  };

  /* ------------------------- §7.2 schedule state ------------------------- */
  const [squads, setSquads] = useState<SquadRow[]>(DEFAULT_SQUADS);
  const [rounds, setRounds] = useState("6");
  const [pitches, setPitches] = useState("2");
  const [method, setMethod] = useState<"annealed" | "template">("annealed");
  const [schedule, setSchedule] = useState<MatchSchedule | null>(null);
  const [schedErr, setSchedErr] = useState("");

  const setSquad = (i: number, patch: Partial<SquadRow>) =>
    setSquads((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const generateSchedule = () => {
    setSchedErr("");
    try {
      setSchedule(
        scheduleMatches({
          squads: squads.map((s) => ({ name: s.name, rating: num(s.rating, 1000) })),
          rounds: num(rounds, 6),
          pitches: num(pitches, 2),
          method,
        })
      );
    } catch (e) {
      setSchedule(null);
      setSchedErr(e instanceof Error ? e.message : "Could not build the schedule.");
    }
  };

  const squadName = (id: string) =>
    schedule?.squads.find((s) => s.id === id)?.name ?? id;

  return (
    <div className="dash-panel">
      <h1 className="dash-title">Small-Cluster Matches</h1>
      <p className="dash-sub">
        Pillar 4 engine — fair-minutes substitutions inside each squad, and a
        round-robin match schedule across squads. Computed on this device.
      </p>

      {/* ---------------------- §7.1 rotation planner ---------------------- */}
      <form
        className="pw-card"
        onSubmit={(e) => {
          e.preventDefault();
          generateRotation();
        }}
      >
        <div className="pw-cardhead">
          <span className="pw-step">1</span>
          <h2>Squad rotation — fair minutes</h2>
        </div>
        <p className="pw-cardsub">
          Field {onPitch || 4} every interval, rotate the bench, keep everyone
          inside the 0.90–1.10 equity band.
        </p>
        {rotErr && <div className="form-error">{rotErr}</div>}

        <div className="row">
          <div className="field">
            <label htmlFor="mm">Match length (min)</label>
            <input id="mm" type="number" min={1} value={matchMinutes}
              onChange={(e) => setMatchMinutes(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="im">Interval (min)</label>
            <input id="im" type="number" min={1} value={intervalMinutes}
              onChange={(e) => setIntervalMinutes(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="op">On pitch</label>
            <input id="op" type="number" min={1} max={11} value={onPitch}
              onChange={(e) => setOnPitch(e.target.value)} />
          </div>
        </div>

        <label>Squad ({players.length} players — history = minutes already played)</label>
        {players.map((p, i) => (
          <div className="p4-roster-row" key={i}>
            <input
              type="text"
              aria-label={`Player ${i + 1} name`}
              value={p.name}
              onChange={(e) => setPlayer(i, { name: e.target.value })}
            />
            <input
              type="number"
              min={0}
              aria-label={`Player ${i + 1} historical minutes`}
              title="Historical minutes"
              value={p.minutes}
              onChange={(e) => setPlayer(i, { minutes: e.target.value })}
            />
            <label className="check">
              <input
                type="checkbox"
                checked={p.fatigued}
                onChange={(e) => setPlayer(i, { fatigued: e.target.checked })}
              />
              fatigued
            </label>
            <button
              type="button"
              className="chip-btn danger"
              title="Remove player"
              onClick={() => setPlayers((rows) => rows.filter((_, j) => j !== i))}
            >
              ✕
            </button>
          </div>
        ))}

        <div className="actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() =>
              setPlayers((rows) => [
                ...rows,
                { name: `Player ${rows.length + 1}`, minutes: "0", fatigued: false },
              ])
            }
          >
            ＋ Add player
          </button>
          <button className="btn btn-primary" type="submit">
            Plan rotation
          </button>
        </div>

        {plan && (
          <>
            <div className="pw-banner">
              <span className={`p4-badge ${plan.allWithinBand ? "ok" : "bad"}`}>
                {plan.allWithinBand ? "✓ everyone in the band" : "band breached"}
              </span>
              <span>
                <span className="big">{plan.intervals.length}</span>{" "}
                <span className="lbl">intervals</span>
              </span>
              <span>
                <span className="big">{plan.variance.toFixed(3)}</span>{" "}
                <span className="lbl">equity variance (lower = fairer)</span>
              </span>
            </div>

            <div className="p4-scroll">
              <table className="p4-table">
                <thead>
                  <tr>
                    <th className="name-cell">Player</th>
                    {plan.intervals.map((iv) => (
                      <th key={iv.index}>
                        Int {iv.index} · {iv.minutes}&apos;
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {plan.players.map((p) => (
                    <tr key={p.id}>
                      <td className="name-cell">{p.name}</td>
                      {plan.intervals.map((iv) => (
                        <td
                          key={iv.index}
                          className={iv.onPitch.includes(p.id) ? "p4-on" : "p4-bench"}
                        >
                          {iv.onPitch.includes(p.id) ? "⚽ ON" : "SUB"}
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
                    <th className="name-cell">Player</th>
                    <th>History</th>
                    <th>This match</th>
                    <th>Total</th>
                    <th>Equity vs squad avg</th>
                    <th>Band</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.players.map((p) => (
                    <tr key={p.id}>
                      <td className="name-cell">{p.name}</td>
                      <td>{p.historicalMinutes}&apos;</td>
                      <td>{p.sessionMinutes}&apos;</td>
                      <td>
                        <b>{p.totalMinutes}&apos;</b>
                      </td>
                      <td>
                        <div className="equity-wrap">
                          <div className={`meter ${p.withinBand ? "" : "warn"}`}>
                            <span style={{ width: pct(p.equity) }} />
                            <i className="band" style={{ left: pct(plan.equityBand.min) }} />
                            <i className="band" style={{ left: pct(plan.equityBand.max) }} />
                          </div>
                          <b>{p.equity.toFixed(2)}×</b>
                        </div>
                      </td>
                      <td>
                        <span className={`p4-badge ${p.withinBand ? "ok" : "bad"}`}>
                          {p.withinBand ? "in band" : "outside"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {plan.warnings.length > 0 && (
              <ul className="p4-warnings">
                {plan.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            )}
          </>
        )}
      </form>

      {/* ---------------------- §7.2 match scheduler ----------------------- */}
      <form
        className="pw-card"
        onSubmit={(e) => {
          e.preventDefault();
          generateSchedule();
        }}
      >
        <div className="pw-cardhead">
          <span className="pw-step">2</span>
          <h2>Match schedule — round robin</h2>
        </div>
        <p className="pw-cardsub">
          Competitive fixtures on limited pitches: no long waits, no repeat
          match-ups, no blowouts.
        </p>
        {schedErr && <div className="form-error">{schedErr}</div>}

        <label>Squads ({squads.length} — rating = squad strength, e.g. average Elo)</label>
        {squads.map((s, i) => (
          <div className="p4-roster-row" key={i}>
            <input
              type="text"
              aria-label={`Squad ${i + 1} name`}
              value={s.name}
              onChange={(e) => setSquad(i, { name: e.target.value })}
            />
            <input
              type="number"
              min={0}
              aria-label={`Squad ${i + 1} rating`}
              title="Squad rating"
              value={s.rating}
              onChange={(e) => setSquad(i, { rating: e.target.value })}
            />
            <button
              type="button"
              className="chip-btn danger"
              title="Remove squad"
              onClick={() => setSquads((rows) => rows.filter((_, j) => j !== i))}
            >
              ✕
            </button>
          </div>
        ))}

        <div className="row">
          <div className="field">
            <label htmlFor="rounds">Rounds</label>
            <input id="rounds" type="number" min={1} max={30} value={rounds}
              onChange={(e) => setRounds(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="pitches">Pitches</label>
            <input id="pitches" type="number" min={1} max={8} value={pitches}
              onChange={(e) => setPitches(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="method">Solver</label>
            <select id="method" value={method}
              onChange={(e) => setMethod(e.target.value as "annealed" | "template")}>
              <option value="annealed">Annealed (template + SA polish)</option>
              <option value="template">Template only (greedy)</option>
            </select>
          </div>
        </div>

        <div className="actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() =>
              setSquads((rows) => [
                ...rows,
                {
                  name: `Squad ${String.fromCharCode(65 + rows.length)}`,
                  rating: "1400",
                },
              ])
            }
          >
            ＋ Add squad
          </button>
          <button className="btn btn-primary" type="submit">
            Build schedule
          </button>
        </div>

        {schedule && (
          <>
            <div className="pw-banner">
              <span>
                <span className="big">{schedule.cost.total.toFixed(1)}</span>{" "}
                <span className="lbl">
                  schedule cost
                  {schedule.method === "annealed" &&
                    ` (greedy template: ${schedule.templateCost.toFixed(1)})`}
                </span>
              </span>
              <span className="pillar-chip">rest {schedule.cost.rest.toFixed(1)}</span>
              <span className="pillar-chip">wait {schedule.cost.wait.toFixed(1)}</span>
              <span className="pillar-chip">repeats {schedule.cost.repeat.toFixed(1)}</span>
              <span className="pillar-chip">
                mismatch {schedule.cost.mismatch.toFixed(1)}
              </span>
            </div>

            <div>
              {schedule.rounds.map((r) => (
                <div className="fixture-round" key={r.round}>
                  <span className="fixture-rlabel">R{r.round}</span>
                  {r.matches.map((m) => (
                    <span className="fixture" key={m.pitch}>
                      <span className="lbl" style={{ color: "var(--muted)", fontSize: "0.72rem" }}>
                        P{m.pitch}
                      </span>
                      <b>{squadName(m.squadA)}</b>
                      <span className="vs">VS</span>
                      <b>{squadName(m.squadB)}</b>
                      <span className="gap">Δ{m.ratingGap}</span>
                    </span>
                  ))}
                  <span className="fixture-rest">
                    😴 {r.resting.map(squadName).join(", ") || "—"}
                  </span>
                </div>
              ))}
            </div>

            <div className="p4-scroll">
              <table className="p4-table">
                <thead>
                  <tr>
                    <th className="name-cell">Squad</th>
                    <th>Rating</th>
                    <th>Games</th>
                    <th>Rests</th>
                    <th>Opponents</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.squads.map((s) => (
                    <tr key={s.id}>
                      <td className="name-cell">{s.name}</td>
                      <td>{s.rating}</td>
                      <td>{s.games}</td>
                      <td>{s.rests}</td>
                      <td>{s.opponents.map(squadName).join(", ") || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
