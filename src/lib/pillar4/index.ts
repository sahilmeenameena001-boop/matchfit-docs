/**
 * Pillar 4 — Small-Cluster Matches engine.
 * Pure, dependency-free TypeScript: usable from server routes and client pages.
 */
export * from "./types";
export { planRotation } from "./rotation";
export type { RotationOptions } from "./rotation";
export { scheduleMatches, DEFAULT_WEIGHTS } from "./scheduling";
export type { ScheduleOptions } from "./scheduling";
