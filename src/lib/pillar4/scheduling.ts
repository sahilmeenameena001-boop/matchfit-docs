/**
 * Pillar 4 · §7.2 — The Match Scheduling Problem.
 *
 * Schedule a round-robin for T squads over R rounds on K pitches.
 *
 * Hard constraints (held by construction, never violated):
 *   – at most K matches per round (pitch capacity),
 *   – every squad plays at most one match per round.
 *
 * Soft costs (minimised, weights from the spec):
 *   – W_rest      playing more than 2 consecutive rounds without rest,
 *   – W_wait      resting more than 1 consecutive round,
 *   – W_repeat    meeting the same opponent again,
 *   – W_mismatch  Elo-style rating gap between opponents (blowout risk).
 *
 * Two solvers, per the spec:
 *   "template"  — deterministic greedy fill of round-robin pairings, most
 *                 competitive fixtures first (the MVP rotation matrix).
 *   "annealed"  — the template polished by simulated annealing with a seeded
 *                 PRNG: swap two squads inside a random round, keep the swap
 *                 if cost drops (or with probability e^(−Δ/T) while hot).
 */
import type {
  CostBreakdown,
  MatchSchedule,
  ScheduleRound,
  ScheduleWeights,
  ScheduledMatch,
  SquadRef,
  SquadScheduleSummary,
} from "./types";

export const DEFAULT_WEIGHTS: ScheduleWeights = {
  rest: 10,
  wait: 6,
  repeat: 8,
  mismatch: 4,
};

export type ScheduleOptions = {
  /** Squads with composite ratings; ids default to s1, s2, … */
  squads: Array<{ id?: string; name: string; rating?: number }>;
  /** Match rounds to schedule (default 6: each of 6 squads plays 4, rests 2). */
  rounds?: number;
  /** K — simultaneous pitches (default 2). */
  pitches?: number;
  /** "annealed" (default) polishes the greedy template with SA. */
  method?: "template" | "annealed";
  /** Annealing iterations (default 2000 — well under 10 ms). */
  iterations?: number;
  /** PRNG seed for reproducible schedules (default 42). */
  seed?: number;
  weights?: Partial<ScheduleWeights>;
};

/** Deterministic PRNG (mulberry32) so annealed schedules are reproducible. */
const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const round2 = (v: number) => Math.round(v * 100) / 100;

/**
 * Internal layout: one permutation of squad indices per round.
 * Positions [0, 2M) pair off onto pitches — (0,1) → pitch 1, (2,3) → pitch 2 —
 * and positions [2M, n) rest. Swapping any two positions inside a round is the
 * annealing move; it can never break either hard constraint.
 */
type Slots = number[][];

const pairKey = (n: number, a: number, b: number) =>
  a < b ? a * n + b : b * n + a;

function evaluate(
  slots: Slots,
  n: number,
  matchesPerRound: number,
  ratings: number[],
  ratingSpread: number,
  w: ScheduleWeights
): CostBreakdown {
  const meetings = new Map<number, number>();
  let repeatViolations = 0;
  let mismatchLoad = 0;

  for (const perm of slots) {
    for (let m = 0; m < matchesPerRound; m++) {
      const a = perm[2 * m];
      const b = perm[2 * m + 1];
      const key = pairKey(n, a, b);
      const count = (meetings.get(key) ?? 0) + 1;
      meetings.set(key, count);
      if (count > 1) repeatViolations += 1;
      mismatchLoad +=
        ratingSpread > 0 ? Math.abs(ratings[a] - ratings[b]) / ratingSpread : 0;
    }
  }

  let restViolations = 0; // rounds played beyond 2 in a row
  let waitViolations = 0; // rounds rested beyond 1 in a row
  for (let t = 0; t < n; t++) {
    let playStreak = 0;
    let restStreak = 0;
    for (const perm of slots) {
      const playing = perm.indexOf(t) < 2 * matchesPerRound;
      if (playing) {
        playStreak += 1;
        restStreak = 0;
        if (playStreak > 2) restViolations += 1;
      } else {
        restStreak += 1;
        playStreak = 0;
        if (restStreak > 1) waitViolations += 1;
      }
    }
  }

  const rest = restViolations * w.rest;
  const wait = waitViolations * w.wait;
  const repeat = repeatViolations * w.repeat;
  const mismatch = mismatchLoad * w.mismatch;
  return {
    rest: round2(rest),
    wait: round2(wait),
    repeat: round2(repeat),
    mismatch: round2(mismatch),
    total: round2(rest + wait + repeat + mismatch),
  };
}

/**
 * Greedy template (spec's MVP "rotation matrix"): fill each round by picking
 * the pairing with lexicographically least
 *   (times already met, games played, played-last-round count, rating gap)
 * so fresh, rested, evenly-loaded, competitive fixtures come first.
 */
function buildTemplate(
  n: number,
  rounds: number,
  matchesPerRound: number,
  ratings: number[]
): Slots {
  const met: number[] = new Array(n * n).fill(0);
  const games: number[] = new Array(n).fill(0);
  let playedLast: boolean[] = new Array(n).fill(false);
  const slots: Slots = [];

  for (let r = 0; r < rounds; r++) {
    const used = new Set<number>();
    const pairs: Array<[number, number]> = [];
    for (let m = 0; m < matchesPerRound; m++) {
      let best: [number, number] | null = null;
      let bestKey: [number, number, number, number] | null = null;
      for (let a = 0; a < n; a++) {
        if (used.has(a)) continue;
        for (let b = a + 1; b < n; b++) {
          if (used.has(b)) continue;
          const key: [number, number, number, number] = [
            met[pairKey(n, a, b)],
            games[a] + games[b],
            (playedLast[a] ? 1 : 0) + (playedLast[b] ? 1 : 0),
            Math.abs(ratings[a] - ratings[b]),
          ];
          if (
            !bestKey ||
            key[0] < bestKey[0] ||
            (key[0] === bestKey[0] &&
              (key[1] < bestKey[1] ||
                (key[1] === bestKey[1] &&
                  (key[2] < bestKey[2] ||
                    (key[2] === bestKey[2] && key[3] < bestKey[3])))))
          ) {
            bestKey = key;
            best = [a, b];
          }
        }
      }
      if (!best) break;
      used.add(best[0]);
      used.add(best[1]);
      pairs.push(best);
    }
    for (const [a, b] of pairs) {
      met[pairKey(n, a, b)] += 1;
      games[a] += 1;
      games[b] += 1;
    }
    const resting: number[] = [];
    for (let t = 0; t < n; t++) if (!used.has(t)) resting.push(t);
    slots.push([...pairs.flat(), ...resting]);
    playedLast = Array.from({ length: n }, (_, t) => used.has(t));
  }
  return slots;
}

function anneal(
  start: Slots,
  n: number,
  matchesPerRound: number,
  ratings: number[],
  ratingSpread: number,
  w: ScheduleWeights,
  iterations: number,
  seed: number
): Slots {
  const rand = mulberry32(seed);
  const current = start.map((p) => [...p]);
  let currentCost = evaluate(current, n, matchesPerRound, ratings, ratingSpread, w).total;
  let best = current.map((p) => [...p]);
  let bestCost = currentCost;

  // Start hot enough to escape the template's local optimum, cool geometrically.
  const t0 = Math.max(w.rest, w.wait, w.repeat, w.mismatch, 1);
  const cooling = Math.pow(0.001 / t0, 1 / Math.max(iterations, 1));

  let temperature = t0;
  for (let i = 0; i < iterations; i++) {
    const r = Math.floor(rand() * current.length);
    const perm = current[r];
    const i1 = Math.floor(rand() * perm.length);
    let i2 = Math.floor(rand() * perm.length);
    if (i2 === i1) i2 = (i2 + 1) % perm.length;
    [perm[i1], perm[i2]] = [perm[i2], perm[i1]];

    const cost = evaluate(current, n, matchesPerRound, ratings, ratingSpread, w).total;
    const delta = cost - currentCost;
    if (delta <= 0 || rand() < Math.exp(-delta / Math.max(temperature, 1e-9))) {
      currentCost = cost;
      if (cost < bestCost) {
        bestCost = cost;
        best = current.map((p) => [...p]);
      }
    } else {
      [perm[i1], perm[i2]] = [perm[i2], perm[i1]]; // undo the swap
    }
    temperature *= cooling;
  }
  return best;
}

export function scheduleMatches(options: ScheduleOptions): MatchSchedule {
  const squads: SquadRef[] = options.squads.map((s, i) => ({
    id: s.id?.trim() || `s${i + 1}`,
    name: s.name.trim() || `Squad ${String.fromCharCode(65 + i)}`,
    rating: Number.isFinite(s.rating) ? (s.rating as number) : 1000,
  }));
  const n = squads.length;
  if (n < 2) throw new Error("Need at least 2 squads to schedule matches.");
  const ids = new Set<string>();
  for (const s of squads) {
    if (ids.has(s.id)) throw new Error(`Duplicate squad id "${s.id}".`);
    ids.add(s.id);
  }

  const rounds = options.rounds ?? 6;
  const pitches = options.pitches ?? 2;
  if (!Number.isInteger(rounds) || rounds < 1)
    throw new Error("rounds must be a positive whole number.");
  if (!Number.isInteger(pitches) || pitches < 1)
    throw new Error("pitches must be a positive whole number.");

  const method = options.method ?? "annealed";
  const iterations = Math.max(0, options.iterations ?? 2000);
  const seed = options.seed ?? 42;
  const weights: ScheduleWeights = { ...DEFAULT_WEIGHTS, ...options.weights };

  // Fill every pitch we can each round; squads left over rest.
  const matchesPerRound = Math.min(pitches, Math.floor(n / 2));
  const ratings = squads.map((s) => s.rating);
  const ratingSpread = Math.max(...ratings) - Math.min(...ratings);

  let slots = buildTemplate(n, rounds, matchesPerRound, ratings);
  const templateCost = evaluate(
    slots, n, matchesPerRound, ratings, ratingSpread, weights
  ).total;

  if (method === "annealed" && iterations > 0) {
    slots = anneal(
      slots, n, matchesPerRound, ratings, ratingSpread, weights, iterations, seed
    );
  }
  const cost = evaluate(slots, n, matchesPerRound, ratings, ratingSpread, weights);

  const roundsOut: ScheduleRound[] = slots.map((perm, r) => {
    const matches: ScheduledMatch[] = [];
    for (let m = 0; m < matchesPerRound; m++) {
      const a = perm[2 * m];
      const b = perm[2 * m + 1];
      matches.push({
        pitch: m + 1,
        squadA: squads[a].id,
        squadB: squads[b].id,
        ratingGap: Math.abs(ratings[a] - ratings[b]),
      });
    }
    return {
      round: r + 1,
      matches,
      resting: perm.slice(2 * matchesPerRound).map((t) => squads[t].id),
    };
  });

  const summaries: SquadScheduleSummary[] = squads.map((s) => {
    let games = 0;
    const opponents: string[] = [];
    for (const round of roundsOut) {
      for (const match of round.matches) {
        if (match.squadA === s.id) {
          games += 1;
          opponents.push(match.squadB);
        } else if (match.squadB === s.id) {
          games += 1;
          opponents.push(match.squadA);
        }
      }
    }
    return { ...s, games, rests: rounds - games, opponents };
  });

  return {
    method,
    rounds: roundsOut,
    squads: summaries,
    cost,
    templateCost,
    iterations: method === "annealed" ? iterations : 0,
    seed,
  };
}
