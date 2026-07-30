/**
 * Pillar 2 · §5.4 — Engagement model.
 * Each drill should use at least three engagement mechanics; the mechanics
 * create emotional peaks without making every activity physically exhausting.
 */
import type { EngagementMechanic } from "./types";

export const ENGAGEMENT_MECHANICS: EngagementMechanic[] = [
  "countdown",
  "limited_lives",
  "visible_score",
  "team_vs_team",
  "personal_best",
  "risk_reward",
  "bonus_target",
  "comeback_multiplier",
  "final_round_bonus",
  "sudden_death",
];

export const MIN_MECHANICS = 3;

export type EngagementCheck = {
  ok: boolean;
  count: number;
  /** How many more mechanics the drill needs to meet the §5.4 minimum. */
  missing: number;
};

export function checkEngagement(mechanics: EngagementMechanic[]): EngagementCheck {
  const count = new Set(mechanics).size;
  return { ok: count >= MIN_MECHANICS, count, missing: Math.max(0, MIN_MECHANICS - count) };
}
