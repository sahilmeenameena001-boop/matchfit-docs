/**
 * Pillar 2 · §5.3 — Challenge Selection Algorithm.
 *
 *   Challenge Score = Programme Relevance + Player Need + Novelty
 *                     + Equipment Fit − Fatigue Risk
 *
 * Each term is normalised to 0–1 and weighted, so the mix is tunable:
 *   – Relevance:      overlap between the challenge's skill focus and the
 *                     session's programme focus (primary skill counts full,
 *                     secondary skills half).
 *   – Player Need:    severity of the squad's weakness in the challenge's
 *                     skills (e.g. poor first-touch outcomes last session
 *                     boost first-touch games — the spec's example).
 *   – Novelty:        intrinsic freshness × exposure freshness. A game played
 *                     twice recently has ~zero exposure freshness — the
 *                     spec's repeat penalty.
 *   – Equipment Fit:  fraction of required equipment available.
 *   – Fatigue Risk:   intensity load, growing as high-intensity picks stack
 *                     up in the same session, so the running order alternates
 *                     hard and light games naturally.
 *
 * Selection is greedy and deterministic: score all eligible challenges, take
 * the best, update session fatigue/variety state, repeat.
 */
import { checkEngagement } from "./engagement";
import { CHALLENGE_CATALOG } from "./catalog";
import type {
  Challenge,
  ChallengeScoreBreakdown,
  ChallengeSelection,
  ExcludedChallenge,
  Intensity,
  SelectedChallenge,
  SelectionWeights,
  SkillFocus,
  Space,
} from "./types";

export const DEFAULT_SELECTION_WEIGHTS: SelectionWeights = {
  relevance: 3,
  need: 2.5,
  novelty: 2,
  equipmentFit: 1,
  fatigueRisk: 2,
};

/** How much intensity each tier adds to the session load. */
const INTENSITY_LOAD: Record<Intensity, number> = { low: 0.2, medium: 0.5, high: 0.9 };

const SPACE_RANK: Record<Space, number> = { small: 1, medium: 2, large: 3 };

/** Exposure freshness window: played 1 session ago → 1.0 load, fading to 0 after 4. */
const RECENCY_WINDOW = 4;

export type SelectionContext = {
  /** What the programme wants to train today. Empty → relevance is neutral (0.5). */
  sessionFocus?: SkillFocus[];
  /** Squad weaknesses, 0–1 severity per skill (from last session's outcomes). */
  playerNeeds?: Partial<Record<SkillFocus, number>>;
  /** Recent exposure: which challenges ran how many sessions ago (1 = last session). */
  recentChallenges?: Array<{ challengeId: string; sessionsAgo: number }>;
  /** Equipment on hand. Omit → assume everything is available. */
  availableEquipment?: string[];
  /** Largest space available. Omit → no space limit. */
  availableSpace?: Space;
  /** Players per squad (default 5 — §5.2 six squads of five). */
  squadSize?: number;
  /** How many challenges to pick (default 3). */
  count?: number;
  weights?: Partial<SelectionWeights>;
  /** Challenge pool to select from (defaults to the built-in catalog). */
  challenges?: Challenge[];
  /**
   * When true (default), challenges missing required equipment are excluded
   * outright instead of just scoring lower.
   */
  strictEquipment?: boolean;
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const round2 = (v: number) => Math.round(v * 100) / 100;

function relevanceOf(challenge: Challenge, focus: SkillFocus[]): number {
  if (focus.length === 0) return 0.5; // neutral when no programme focus is set
  const [primary, ...secondary] = challenge.skillFocus;
  if (focus.includes(primary)) return 1;
  return secondary.some((s) => focus.includes(s)) ? 0.5 : 0;
}

function needOf(
  challenge: Challenge,
  needs: Partial<Record<SkillFocus, number>>
): number {
  const [primary, ...secondary] = challenge.skillFocus;
  const primaryNeed = clamp01(needs[primary] ?? 0);
  const secondaryNeed = Math.max(0, ...secondary.map((s) => clamp01(needs[s] ?? 0)));
  // Secondary skills still train the deficit, just a little less directly.
  return Math.max(primaryNeed, 0.8 * secondaryNeed);
}

function exposureFreshness(
  challengeId: string,
  recent: Array<{ challengeId: string; sessionsAgo: number }>
): number {
  let load = 0;
  for (const r of recent) {
    if (r.challengeId !== challengeId) continue;
    const ago = Math.max(1, Math.floor(r.sessionsAgo));
    load += Math.max(0, (RECENCY_WINDOW - ago + 1) / RECENCY_WINDOW);
  }
  return clamp01(1 - load);
}

function equipmentFitOf(challenge: Challenge, available?: string[]): {
  fit: number;
  missing: string[];
} {
  if (!available) return { fit: 1, missing: [] };
  const have = new Set(available.map((e) => e.trim().toLowerCase()));
  const missing = challenge.equipment.filter((e) => !have.has(e.toLowerCase()));
  const fit =
    challenge.equipment.length === 0
      ? 1
      : (challenge.equipment.length - missing.length) / challenge.equipment.length;
  return { fit, missing };
}

export function selectChallenges(context: SelectionContext = {}): ChallengeSelection {
  const pool = context.challenges ?? CHALLENGE_CATALOG;
  const focus = context.sessionFocus ?? [];
  const needs = context.playerNeeds ?? {};
  const recent = context.recentChallenges ?? [];
  const squadSize = context.squadSize ?? 5;
  const count = context.count ?? 3;
  const strictEquipment = context.strictEquipment ?? true;
  const weights: SelectionWeights = {
    ...DEFAULT_SELECTION_WEIGHTS,
    ...context.weights,
  };
  if (!Number.isInteger(count) || count < 1)
    throw new Error("count must be a positive whole number.");
  if (!Number.isInteger(squadSize) || squadSize < 1)
    throw new Error("squadSize must be a positive whole number.");

  // Hard eligibility: players, space, (optionally) equipment.
  const excluded: ExcludedChallenge[] = [];
  const eligible: Challenge[] = [];
  for (const c of pool) {
    const reasons: string[] = [];
    if (c.minPlayers > squadSize)
      reasons.push(`needs at least ${c.minPlayers} players (squad has ${squadSize})`);
    if (
      context.availableSpace &&
      SPACE_RANK[c.space] > SPACE_RANK[context.availableSpace]
    )
      reasons.push(`needs ${c.space} space (only ${context.availableSpace} available)`);
    const { missing } = equipmentFitOf(c, context.availableEquipment);
    if (strictEquipment && missing.length > 0)
      reasons.push(`missing equipment: ${missing.join(", ")}`);
    if (reasons.length > 0) excluded.push({ challengeId: c.id, name: c.name, reasons });
    else eligible.push(c);
  }

  // Greedy, sequence-aware pick.
  const selected: SelectedChallenge[] = [];
  const remaining = [...eligible];
  let sessionLoad = 0;
  const coveredPrimary = new Set<SkillFocus>();

  const scoreOf = (c: Challenge): ChallengeScoreBreakdown => {
    let rel = relevanceOf(c, focus);
    // Session variety: a primary skill already covered this session scores
    // lower so one focus doesn't monopolise the running order.
    if (coveredPrimary.has(c.skillFocus[0])) rel *= 0.6;
    const need = needOf(c, needs);
    const novelty = c.novelty * exposureFreshness(c.id, recent);
    const { fit } = equipmentFitOf(c, context.availableEquipment);
    const fatigue = INTENSITY_LOAD[c.intensity] * (1 + sessionLoad);
    const relevance = round2(weights.relevance * rel);
    const needScore = round2(weights.need * need);
    const noveltyScore = round2(weights.novelty * novelty);
    const fitScore = round2(weights.equipmentFit * fit);
    const fatigueScore = round2(weights.fatigueRisk * fatigue);
    return {
      relevance,
      need: needScore,
      novelty: noveltyScore,
      equipmentFit: fitScore,
      fatigueRisk: fatigueScore,
      total: round2(relevance + needScore + noveltyScore + fitScore - fatigueScore),
    };
  };

  while (selected.length < count && remaining.length > 0) {
    let bestIndex = 0;
    let bestScore = scoreOf(remaining[0]);
    for (let i = 1; i < remaining.length; i++) {
      const s = scoreOf(remaining[i]);
      if (s.total > bestScore.total) {
        bestScore = s;
        bestIndex = i;
      }
    }
    const [challenge] = remaining.splice(bestIndex, 1);
    const warnings: string[] = [];
    const engagement = checkEngagement(challenge.mechanics);
    if (!engagement.ok)
      warnings.push(
        `Only ${engagement.count} engagement mechanic(s) — §5.4 asks for at least 3.`
      );
    selected.push({
      challenge,
      order: selected.length + 1,
      score: bestScore,
      warnings,
    });
    sessionLoad += INTENSITY_LOAD[challenge.intensity];
    coveredPrimary.add(challenge.skillFocus[0]);
  }

  return { selected, excluded, considered: eligible.length };
}
