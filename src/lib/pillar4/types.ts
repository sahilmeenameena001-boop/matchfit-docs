/**
 * Pillar 4 — Small-Cluster Matches: shared engine types.
 *
 * Models the two combinatorial problems from the Five-Pillar logic spec
 * (docs/Pillar4_Mathematical_Optimization.md):
 *   §7.1 Substitution & minutes equity inside one squad
 *   §7.2 Round-robin match scheduling across squads
 */

/* ----------------------- §7.1 Rotation / equity --------------------------- */

/** A squad member entering the rotation. */
export type SquadPlayer = {
  id: string;
  name: string;
  /** H_p — minutes carried over from previous sessions. */
  historicalMinutes: number;
  /** F_p — fatigued/injured players MAY be benched in consecutive intervals. */
  fatigued: boolean;
};

export type RotationInterval = {
  /** 1-based interval number. */
  index: number;
  /** T_i — duration of this interval in minutes. */
  minutes: number;
  /** Ids of players on the pitch (x_{p,i} = 1). */
  onPitch: string[];
  /** Ids of players benched this interval (x_{p,i} = 0). */
  benched: string[];
};

export type PlayerRotationSummary = {
  id: string;
  name: string;
  historicalMinutes: number;
  /** Minutes earned in this match. */
  sessionMinutes: number;
  /** Total(p) = H_p + session minutes. */
  totalMinutes: number;
  /** E(p) = Total(p) / average squad total. */
  equity: number;
  /** True when E(p) sits inside the equity band (default 0.90–1.10). */
  withinBand: boolean;
  /** How many intervals this player spent on the bench. */
  benches: number;
};

export type RotationPlan = {
  intervals: RotationInterval[];
  players: PlayerRotationSummary[];
  equityBand: { min: number; max: number };
  allWithinBand: boolean;
  /** Objective value: Σ (E(p) − 1)² over the squad — lower is fairer. */
  variance: number;
  /** Human-readable notes: band breaches, relaxed constraints, etc. */
  warnings: string[];
};

/* ----------------------- §7.2 Match scheduling ---------------------------- */

/** A squad entering the round-robin, with a composite (Elo-style) rating. */
export type SquadRef = {
  id: string;
  name: string;
  rating: number;
};

export type ScheduledMatch = {
  /** 1-based pitch number. */
  pitch: number;
  squadA: string;
  squadB: string;
  /** |rating A − rating B| — the mismatch this fixture carries. */
  ratingGap: number;
};

export type ScheduleRound = {
  /** 1-based round number. */
  round: number;
  matches: ScheduledMatch[];
  /** Squads sitting out this round. */
  resting: string[];
};

/** Soft-constraint weights from the spec's cost function. */
export type ScheduleWeights = {
  /** W_rest — playing more than 2 consecutive rounds. */
  rest: number;
  /** W_wait — resting more than 1 consecutive round. */
  wait: number;
  /** W_repeat — meeting the same opponent again. */
  repeat: number;
  /** W_mismatch — rating gap between opponents. */
  mismatch: number;
};

export type CostBreakdown = {
  rest: number;
  wait: number;
  repeat: number;
  mismatch: number;
  total: number;
};

export type SquadScheduleSummary = {
  id: string;
  name: string;
  rating: number;
  games: number;
  rests: number;
  /** Opponent squad ids in round order. */
  opponents: string[];
};

export type MatchSchedule = {
  method: "template" | "annealed";
  rounds: ScheduleRound[];
  squads: SquadScheduleSummary[];
  cost: CostBreakdown;
  /** Cost of the greedy template start (equals cost.total when method = template). */
  templateCost: number;
  /** Annealing iterations actually run (0 for template). */
  iterations: number;
  /** PRNG seed used, so schedules are reproducible. */
  seed: number;
};
