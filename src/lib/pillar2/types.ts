/**
 * Pillar 2 — Gamified Football Drills: shared engine types.
 *
 * Models the logic spec (docs/Pillar2_Gamified_Drills.md):
 *   §5.3 challenge tagging + selection algorithm
 *   §5.4 engagement mechanics
 *   §5.5 adaptive scoring (difficulty multipliers)
 *   §5.6 anti-gaming rules
 *   §5.7 weighted Pillar 2 XP
 */

/* ----------------------------- §5.3 tagging ------------------------------- */

export type SkillFocus =
  | "passing"
  | "first_touch"
  | "dribbling"
  | "finishing"
  | "defending"
  | "possession"
  | "reactions"
  | "awareness";

export type Intensity = "low" | "medium" | "high";
export type Complexity = "simple" | "moderate" | "complex";
export type Space = "small" | "medium" | "large";
export type ContactLevel = "none" | "light" | "full";

/** §5.4 engagement mechanics — every drill should use at least three. */
export type EngagementMechanic =
  | "countdown"
  | "limited_lives"
  | "visible_score"
  | "team_vs_team"
  | "personal_best"
  | "risk_reward"
  | "bonus_target"
  | "comeback_multiplier"
  | "final_round_bonus"
  | "sudden_death";

/** A challenge in the Pillar 2 library, tagged per §5.3. */
export type Challenge = {
  id: string;
  name: string;
  description: string;
  /** Skill focus — primary skill first, secondary skills after. */
  skillFocus: SkillFocus[];
  intensity: Intensity;
  complexity: Complexity;
  /** Space required. */
  space: Space;
  /** Equipment required (lower-case nouns: "cones", "balls", "bibs", "goals"). */
  equipment: string[];
  /** Minimum players needed to run the game. */
  minPlayers: number;
  contactLevel: ContactLevel;
  /** Intrinsic novelty 0–1: how unusual/fresh the game format feels. */
  novelty: number;
  /** §5.4 — must contain at least three mechanics. */
  mechanics: EngagementMechanic[];
};

/* --------------------------- §5.3 selection ------------------------------- */

/** Term weights in: Relevance + Player Need + Novelty + Equipment Fit − Fatigue Risk. */
export type SelectionWeights = {
  relevance: number;
  need: number;
  novelty: number;
  equipmentFit: number;
  fatigueRisk: number;
};

export type ChallengeScoreBreakdown = {
  relevance: number;
  need: number;
  novelty: number;
  equipmentFit: number;
  fatigueRisk: number;
  total: number;
};

export type SelectedChallenge = {
  challenge: Challenge;
  /** 1-based position in the session running order. */
  order: number;
  score: ChallengeScoreBreakdown;
  warnings: string[];
};

export type ExcludedChallenge = {
  challengeId: string;
  name: string;
  reasons: string[];
};

export type ChallengeSelection = {
  selected: SelectedChallenge[];
  excluded: ExcludedChallenge[];
  /** How many eligible challenges competed for selection. */
  considered: number;
};

/* ------------------------ §5.5 adaptive scoring --------------------------- */

export type DifficultyTier = "foundation" | "standard" | "competitive" | "advanced";

/* -------------------------- §5.6 attempts --------------------------------- */

/** One attempt by one player inside a challenge. */
export type Attempt = {
  /** Only correctly performed attempts earn points (§5.6). */
  correct: boolean;
  /** Raw points the attempt is worth before rules apply (default 1). */
  points?: number;
  /** Low-risk actions earn diminishing points when repeated (§5.6). */
  risk?: "low" | "standard" | "high";
  /** Bonus multiplier for special targets — capped by the engine (§5.6). */
  bonusMultiplier?: number;
  /** Coach-verified correction: overrides the computed points for this attempt (§5.6). */
  coachOverride?: number;
};

export type PlayerAttemptScore = {
  /** Attempts that counted (correct). */
  counted: number;
  /** Attempts ignored as incorrect. */
  ignored: number;
  /** Raw points after anti-gaming rules, before the difficulty multiplier. */
  rawPoints: number;
  notes: string[];
};

/* ---------------------- §5.2 + §5.5/5.6 squad scoring --------------------- */

export type SquadPlayerResult = {
  playerId: string;
  name: string;
  difficulty: DifficultyTier;
  multiplier: number;
  counted: number;
  ignored: number;
  rawPoints: number;
  /** Adjusted Score = Raw × Difficulty Multiplier (§5.5). */
  adjustedScore: number;
  metParticipation: boolean;
  notes: string[];
};

export type SquadChallengeScore = {
  /** Individual contributions stay visible (§5.2). */
  players: SquadPlayerResult[];
  /** Team score accumulated from adjusted player scores (§5.2). */
  squadTotal: number;
  participation: {
    /** Minimum counted attempts required per player. */
    required: number;
    met: boolean;
    missing: string[]; // player ids below the requirement
    /** Factor applied to the squad total when participation failed (§5.6). */
    penaltyFactor: number;
    penaltyApplied: boolean;
  };
  notes: string[];
};

/* ------------------------------ §5.7 XP ----------------------------------- */

/** Component scores, each 0–100. */
export type XPComponents = {
  challengeResult: number;
  technicalExecution: number;
  improvement: number;
  teamContribution: number;
  creativity: number;
  sportsmanship: number;
};

export type PlayerXP = {
  /** Weighted 0–100 XP score. */
  xp: number;
  /** Contribution of each component (weight × score). */
  breakdown: XPComponents;
};
