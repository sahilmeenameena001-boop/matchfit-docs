/**
 * Pillar 4 · §7.1 — The Substitution & Minutes Equity Problem.
 *
 * Field `onPitch` players from a squad (typically 4 of 5) every interval and
 * rotate the rest through the bench so every player's total minutes land
 * inside the equity band (default 0.90–1.10 of the squad average).
 *
 * Constraints from the spec:
 *   1. Squad size:            Σ_p x_{p,i} = onPitch          ∀ i
 *   2. No consecutive bench:  x_{p,i} + x_{p,i+1} ≥ 1        ∀ p with F_p = 0
 *
 * Objective:  min Σ_p (Total(p) / AvgSquadMinutes − 1)²
 *   where Total(p) = H_p + Σ_i x_{p,i}·T_i
 *
 * Solved with the spec's greedy heuristic — before every interval:
 *   1. compute each player's projected total minutes (history + session),
 *   2. drop players benched last interval from the bench candidates
 *      (unless fatigued — F_p = 1 players may rest consecutively),
 *   3. bench the candidate(s) with the highest totals (highest E(p)).
 */
import type {
  PlayerRotationSummary,
  RotationInterval,
  RotationPlan,
  SquadPlayer,
} from "./types";

export type RotationOptions = {
  /** Squad members; ids default to p1, p2, … when omitted. */
  players: Array<{
    id?: string;
    name: string;
    historicalMinutes?: number;
    fatigued?: boolean;
  }>;
  /** Total match length in minutes (default 15). */
  matchMinutes?: number;
  /** Rotation interval length in minutes (default 3 → 5 intervals). */
  intervalMinutes?: number;
  /** Players fielded per interval (default 4 → 4-a-side). */
  onPitch?: number;
  /** Fair-minutes band around the squad average (default 0.90–1.10). */
  equityBand?: { min: number; max: number };
};

const round = (v: number, dp: number) => {
  const f = 10 ** dp;
  return Math.round(v * f) / f;
};

export function planRotation(options: RotationOptions): RotationPlan {
  const matchMinutes = options.matchMinutes ?? 15;
  const intervalMinutes = options.intervalMinutes ?? 3;
  const onPitch = options.onPitch ?? 4;
  const band = options.equityBand ?? { min: 0.9, max: 1.1 };

  if (!Number.isFinite(matchMinutes) || matchMinutes <= 0)
    throw new Error("matchMinutes must be greater than 0.");
  if (!Number.isFinite(intervalMinutes) || intervalMinutes <= 0)
    throw new Error("intervalMinutes must be greater than 0.");
  if (!Number.isInteger(onPitch) || onPitch < 1)
    throw new Error("onPitch must be a positive whole number.");
  if (!(band.min < band.max))
    throw new Error("equityBand.min must be below equityBand.max.");

  const players: SquadPlayer[] = options.players.map((p, i) => ({
    id: p.id?.trim() || `p${i + 1}`,
    name: p.name.trim() || `Player ${i + 1}`,
    historicalMinutes: Math.max(0, p.historicalMinutes ?? 0),
    fatigued: p.fatigued ?? false,
  }));
  if (players.length < onPitch)
    throw new Error(`Need at least ${onPitch} players to field ${onPitch}-a-side.`);
  const ids = new Set<string>();
  for (const p of players) {
    if (ids.has(p.id)) throw new Error(`Duplicate player id "${p.id}".`);
    ids.add(p.id);
  }

  // I intervals; the last one absorbs any remainder (e.g. 16' / 3' → 5×3' + 1').
  const durations: number[] = [];
  for (let left = matchMinutes; left > 0; left -= intervalMinutes) {
    durations.push(Math.min(intervalMinutes, left));
  }

  const benchSlots = players.length - onPitch;
  const session = new Map(players.map((p) => [p.id, 0]));
  const benchCount = new Map(players.map((p) => [p.id, 0]));
  const order = new Map(players.map((p, i) => [p.id, i]));
  let benchedLast = new Set<string>();
  const warnings: string[] = [];
  const intervals: RotationInterval[] = [];

  // Bench the heaviest-loaded first; break ties toward fewer benches so the
  // rotation cycles cleanly when everyone is level, then by squad order so
  // the plan is deterministic.
  const byLoadDesc = (a: SquadPlayer, b: SquadPlayer) => {
    const ta = a.historicalMinutes + (session.get(a.id) ?? 0);
    const tb = b.historicalMinutes + (session.get(b.id) ?? 0);
    if (tb !== ta) return tb - ta;
    const ca = benchCount.get(a.id) ?? 0;
    const cb = benchCount.get(b.id) ?? 0;
    if (ca !== cb) return ca - cb;
    return (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0);
  };

  durations.forEach((minutes, i) => {
    let benched: SquadPlayer[] = [];
    if (benchSlots > 0) {
      const eligible = players
        .filter((p) => !benchedLast.has(p.id) || p.fatigued)
        .sort(byLoadDesc);
      benched = eligible.slice(0, benchSlots);
      if (benched.length < benchSlots) {
        // More bench slots than eligible candidates (only possible when the
        // bench is bigger than the pitch): relax constraint 2 for the rest.
        const chosen = new Set(benched.map((p) => p.id));
        const overflow = players
          .filter((p) => !chosen.has(p.id))
          .sort(byLoadDesc)
          .slice(0, benchSlots - benched.length);
        benched = benched.concat(overflow);
        warnings.push(
          `Interval ${i + 1}: bench slots exceed eligible players, so the no-consecutive-bench rule was relaxed.`
        );
      }
    }

    const benchedIds = new Set(benched.map((p) => p.id));
    const onIds = players.filter((p) => !benchedIds.has(p.id)).map((p) => p.id);
    for (const id of onIds) session.set(id, (session.get(id) ?? 0) + minutes);
    for (const id of benchedIds) benchCount.set(id, (benchCount.get(id) ?? 0) + 1);
    benchedLast = benchedIds;
    intervals.push({ index: i + 1, minutes, onPitch: onIds, benched: [...benchedIds] });
  });

  const totals = players.map((p) => p.historicalMinutes + (session.get(p.id) ?? 0));
  const avg = totals.reduce((s, t) => s + t, 0) / players.length;
  const summaries: PlayerRotationSummary[] = players.map((p, i) => {
    const equity = avg > 0 ? totals[i] / avg : 1;
    return {
      id: p.id,
      name: p.name,
      historicalMinutes: p.historicalMinutes,
      sessionMinutes: session.get(p.id) ?? 0,
      totalMinutes: totals[i],
      equity: round(equity, 3),
      withinBand: equity >= band.min - 1e-9 && equity <= band.max + 1e-9,
      benches: benchCount.get(p.id) ?? 0,
    };
  });

  for (const s of summaries) {
    if (!s.withinBand) {
      warnings.push(
        `${s.name} ends at ${s.equity.toFixed(2)}× the squad average — outside the ` +
          `${band.min.toFixed(2)}–${band.max.toFixed(2)} equity band (carried-over minutes ` +
          `can need more than one match to even out).`
      );
    }
  }

  return {
    intervals,
    players: summaries,
    equityBand: band,
    allWithinBand: summaries.every((s) => s.withinBand),
    variance: round(summaries.reduce((s, p) => s + (p.equity - 1) ** 2, 0), 4),
    warnings,
  };
}
