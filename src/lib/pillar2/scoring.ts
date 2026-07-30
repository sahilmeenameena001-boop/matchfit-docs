/**
 * Pillar 2 — scoring engine.
 *   §5.5 Adaptive scoring   — difficulty multipliers + handicap guide
 *   §5.6 Anti-gaming rules  — correct-only, diminishing low-risk points,
 *                             capped bonuses, coach override, participation
 *   §5.2 Squad accumulation — team totals with visible individual contributions
 *   §5.7 Pillar 2 XP        — weighted blend, so the challenge winner and the
 *                             top XP scorer can be different players
 */
import type {
  Attempt,
  DifficultyTier,
  PlayerAttemptScore,
  PlayerXP,
  SquadChallengeScore,
  SquadPlayerResult,
  XPComponents,
} from "./types";

/* ------------------------ §5.5 adaptive scoring --------------------------- */

export const DIFFICULTY_MULTIPLIER: Record<DifficultyTier, number> = {
  foundation: 0.8,
  standard: 1.0,
  competitive: 1.15,
  advanced: 1.3,
};

/** Handicap ideas per tier (§5.5) — surfaced to coaches, not enforced. */
export const HANDICAP_GUIDE: Record<"stronger" | "developing", string[]> = {
  stronger: [
    "Smaller target",
    "Greater distance",
    "Weak-foot restriction",
    "Fewer touches",
    "Shorter completion time",
  ],
  developing: ["Larger target", "More time", "Shorter distance", "Additional attempt"],
};

/** Adjusted Score = Raw Score × Difficulty Multiplier (§5.5). */
export const adjustScore = (raw: number, tier: DifficultyTier): number =>
  round2(raw * DIFFICULTY_MULTIPLIER[tier]);

/* -------------------------- §5.6 anti-gaming ------------------------------ */

export type AntiGamingOptions = {
  /** Low-risk attempts at full value before diminishing kicks in (default 3). */
  diminishingAfter?: number;
  /** Value factor per extra low-risk attempt beyond the threshold (default 0.7). */
  diminishingFactor?: number;
  /** Cap for any attempt's bonus multiplier (default 1.5). */
  bonusCap?: number;
};

const DEFAULTS: Required<AntiGamingOptions> = {
  diminishingAfter: 3,
  diminishingFactor: 0.7,
  bonusCap: 1.5,
};

const round2 = (v: number) => Math.round(v * 100) / 100;

/**
 * Score one player's attempts with the §5.6 rules applied:
 *   – incorrect attempts earn nothing ("attempts only count when performed correctly"),
 *   – repeated low-risk actions decay geometrically past the threshold,
 *   – bonus multipliers are clamped to the cap,
 *   – a coach override replaces the computed points for that attempt.
 */
export function scorePlayerAttempts(
  attempts: Attempt[],
  options: AntiGamingOptions = {}
): PlayerAttemptScore {
  const opts = { ...DEFAULTS, ...options };
  if (opts.diminishingAfter < 0) throw new Error("diminishingAfter must be ≥ 0.");
  if (opts.diminishingFactor < 0 || opts.diminishingFactor > 1)
    throw new Error("diminishingFactor must be between 0 and 1.");
  if (opts.bonusCap < 1) throw new Error("bonusCap must be at least 1.");

  let counted = 0;
  let ignored = 0;
  let lowRiskCounted = 0;
  let rawPoints = 0;
  let diminishedAny = false;
  let cappedAny = false;
  let overrides = 0;

  for (const attempt of attempts) {
    if (!attempt.correct && attempt.coachOverride === undefined) {
      ignored += 1;
      continue;
    }
    counted += 1;

    if (attempt.coachOverride !== undefined) {
      // Coach verification overrides obviously incorrect entries (§5.6).
      rawPoints += Math.max(0, attempt.coachOverride);
      overrides += 1;
      continue;
    }

    let value = Math.max(0, attempt.points ?? 1);
    if (attempt.risk === "low") {
      lowRiskCounted += 1;
      const beyond = lowRiskCounted - opts.diminishingAfter;
      if (beyond > 0) {
        value *= Math.pow(opts.diminishingFactor, beyond);
        diminishedAny = true;
      }
    }
    if (attempt.bonusMultiplier !== undefined) {
      const capped = Math.min(Math.max(1, attempt.bonusMultiplier), opts.bonusCap);
      if (capped < attempt.bonusMultiplier) cappedAny = true;
      value *= capped;
    }
    rawPoints += value;
  }

  const notes: string[] = [];
  if (ignored > 0) notes.push(`${ignored} incorrect attempt(s) earned no points.`);
  if (diminishedAny)
    notes.push(
      `Low-risk attempts beyond ${opts.diminishingAfter} earned diminishing points.`
    );
  if (cappedAny) notes.push(`Bonus multipliers were capped at ×${opts.bonusCap}.`);
  if (overrides > 0) notes.push(`${overrides} attempt(s) used a coach-verified score.`);

  return { counted, ignored, rawPoints: round2(rawPoints), notes };
}

/* --------------------- §5.2 squad challenge scoring ----------------------- */

export type SquadChallengeInput = {
  players: Array<{
    playerId: string;
    name?: string;
    /** §5.5 difficulty tier this player competed at (default "standard"). */
    difficulty?: DifficultyTier;
    attempts: Attempt[];
  }>;
  /** Minimum counted attempts each player needs (§5.6, default 1). */
  minParticipation?: number;
  /** Squad-total factor when participation is not met (default 0.9). */
  participationPenalty?: number;
  antiGaming?: AntiGamingOptions;
};

export function scoreSquadChallenge(input: SquadChallengeInput): SquadChallengeScore {
  if (input.players.length === 0) throw new Error("Squad needs at least one player.");
  const seen = new Set<string>();
  for (const p of input.players) {
    if (seen.has(p.playerId)) throw new Error(`Duplicate playerId "${p.playerId}".`);
    seen.add(p.playerId);
  }
  const required = input.minParticipation ?? 1;
  const penaltyFactor = input.participationPenalty ?? 0.9;
  if (required < 0) throw new Error("minParticipation must be ≥ 0.");
  if (penaltyFactor < 0 || penaltyFactor > 1)
    throw new Error("participationPenalty must be between 0 and 1.");

  const players: SquadPlayerResult[] = input.players.map((p) => {
    const difficulty = p.difficulty ?? "standard";
    const multiplier = DIFFICULTY_MULTIPLIER[difficulty];
    if (multiplier === undefined) throw new Error(`Unknown difficulty "${difficulty}".`);
    const scored = scorePlayerAttempts(p.attempts, input.antiGaming);
    return {
      playerId: p.playerId,
      name: p.name?.trim() || p.playerId,
      difficulty,
      multiplier,
      counted: scored.counted,
      ignored: scored.ignored,
      rawPoints: scored.rawPoints,
      adjustedScore: adjustScore(scored.rawPoints, difficulty),
      metParticipation: scored.counted >= required,
      notes: scored.notes,
    };
  });

  const missing = players.filter((p) => !p.metParticipation).map((p) => p.playerId);
  const met = missing.length === 0;
  const rawTotal = players.reduce((sum, p) => sum + p.adjustedScore, 0);
  const penaltyApplied = !met && penaltyFactor < 1;
  const squadTotal = round2(penaltyApplied ? rawTotal * penaltyFactor : rawTotal);

  const notes: string[] = [];
  if (!met)
    notes.push(
      `Minimum participation (${required} counted attempt(s) per player) not met by: ` +
        `${missing.join(", ")}${penaltyApplied ? ` — squad total ×${penaltyFactor}.` : "."}`
    );

  return {
    players,
    squadTotal,
    participation: { required, met, missing, penaltyFactor, penaltyApplied },
    notes,
  };
}

/* ------------------------------ §5.7 XP ----------------------------------- */

/** Component weights — challenge result 30%, execution 25%, improvement 20%,
 *  team contribution 15%, creativity 5%, sportsmanship 5%. */
export const XP_WEIGHTS: XPComponents = {
  challengeResult: 0.3,
  technicalExecution: 0.25,
  improvement: 0.2,
  teamContribution: 0.15,
  creativity: 0.05,
  sportsmanship: 0.05,
};

const XP_KEYS = Object.keys(XP_WEIGHTS) as Array<keyof XPComponents>;

const clamp100 = (v: number) => Math.min(100, Math.max(0, v));

/** Weighted 0–100 XP from 0–100 component scores (§5.7). */
export function computePlayerXP(components: XPComponents): PlayerXP {
  const breakdown = {} as XPComponents;
  let xp = 0;
  for (const key of XP_KEYS) {
    const contribution = XP_WEIGHTS[key] * clamp100(components[key]);
    breakdown[key] = round2(contribution);
    xp += contribution;
  }
  return { xp: round2(xp), breakdown };
}

/**
 * Rank players by XP, descending. The challenge winner earns recognition, but
 * the top XP scorer may be someone who improved or contributed most (§5.7).
 */
export function rankByXP<T extends { components: XPComponents }>(
  players: T[]
): Array<T & PlayerXP & { rank: number }> {
  return players
    .map((p) => ({ ...p, ...computePlayerXP(p.components) }))
    .sort((a, b) => b.xp - a.xp)
    .map((p, i) => ({ ...p, rank: i + 1 }));
}
