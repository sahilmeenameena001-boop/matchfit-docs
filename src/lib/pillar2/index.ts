/**
 * Pillar 2 — Gamified Football Drills engine.
 * Pure, dependency-free TypeScript: usable from server routes and client pages.
 */
export * from "./types";
export { CHALLENGE_CATALOG, findChallenge } from "./catalog";
export { ENGAGEMENT_MECHANICS, MIN_MECHANICS, checkEngagement } from "./engagement";
export type { EngagementCheck } from "./engagement";
export { DEFAULT_SELECTION_WEIGHTS, selectChallenges } from "./selection";
export type { SelectionContext } from "./selection";
export {
  DIFFICULTY_MULTIPLIER,
  HANDICAP_GUIDE,
  XP_WEIGHTS,
  adjustScore,
  computePlayerXP,
  rankByXP,
  scorePlayerAttempts,
  scoreSquadChallenge,
} from "./scoring";
export type { AntiGamingOptions, SquadChallengeInput } from "./scoring";
