/** MatchFIT PlayLab — shared domain types (framework-free, used by all engines). */

export type SessionDimension =
  | "passing"
  | "finishing"
  | "dribbling"
  | "defending"
  | "firstTouch"
  | "scanning"
  | "decisionMaking"
  | "physicalIntensity"
  | "individualCompetition"
  | "teamCompetition"
  | "oppositionPressure"
  | "contentPotential"
  | "playerRepetitions";

export const ALL_DIMENSIONS: SessionDimension[] = [
  "passing",
  "finishing",
  "dribbling",
  "defending",
  "firstTouch",
  "scanning",
  "decisionMaking",
  "physicalIntensity",
  "individualCompetition",
  "teamCompetition",
  "oppositionPressure",
  "contentPotential",
  "playerRepetitions",
];

export type FootballObjective =
  | "passing"
  | "finishing"
  | "dribbling"
  | "defending"
  | "firstTouch"
  | "scanning"
  | "decisionMaking";

export type ExperienceTag =
  | "fast"
  | "tactical"
  | "chaotic"
  | "skill-based"
  | "pressure-based"
  | "funny"
  | "high-stakes"
  | "collaborative"
  | "individual"
  | "unpredictable"
  | "cinematic"
  | "beginner-friendly";

export type CompetitionFormat =
  | "player vs player"
  | "team vs team"
  | "player vs clock"
  | "team vs clock"
  | "relay"
  | "knockout"
  | "king of the court"
  | "survival"
  | "target score"
  | "personal best"
  | "sudden death"
  | "progressive levels";

export type EngagementMechanic =
  | "visible score"
  | "countdown"
  | "limited attempts"
  | "streak bonus"
  | "score multiplier"
  | "random target"
  | "bonus target"
  | "power-up"
  | "penalty"
  | "risk versus reward"
  | "comeback rule"
  | "mystery event"
  | "territory capture"
  | "elimination"
  | "sudden death"
  | "progressive difficulty";

export type Intensity = "Low" | "Medium" | "High";
export type Complexity = "Simple" | "Moderate" | "Complex";
export type SpaceSize = "Small" | "Medium" | "Large";

export type DrillStatus =
  | "library"
  | "aiDraft"
  | "coachApproved"
  | "scheduledForTest"
  | "tested"
  | "needsModification"
  | "verified"
  | "archived";

export type RuleCategory =
  | "start"
  | "action"
  | "success"
  | "bonus"
  | "penalty"
  | "progression"
  | "tiebreak";

export interface DrillRule {
  id: string;
  category: RuleCategory;
  title: string;
  description: string;
  enabled: boolean;
  parameters: Record<string, string | number | boolean>;
  dependencies?: string[];
  conflictsWith?: string[];
  sortOrder?: number;
}

export type ScoringEventType =
  | "goal"
  | "targetHit"
  | "completedPass"
  | "interception"
  | "defensiveStop"
  | "assist"
  | "roundWin"
  | "streak"
  | "timeBonus"
  | "custom";

export interface ScoringRule {
  id: string;
  eventType: ScoringEventType | string;
  label: string;
  points: number;
  appliesTo: "player" | "team";
  maxOccurrences?: number;
  enabled: boolean;
}

export type XPCategory =
  | "participation"
  | "performance"
  | "improvement"
  | "teamwork"
  | "fairPlay"
  | "personalBest";

export interface XPEvent {
  id: string;
  sourceEventType: string;
  label: string;
  xp: number;
  category: XPCategory;
  dailyCap?: number;
  enabled: boolean;
}

export interface DrillConstraints {
  players: number;
  teams: number;
  activePlayersPerRound: number;
  durationMin: number;
  roundSec: number;
  transitionSec: number;
  stations: number;
  pitchSize: SpaceSize;
  setupMin: number;
  coachCount: number;
  intensity: Intensity;
  contactLevel: "none" | "light" | "full";
  playerLevel: string;
}

export interface DrillMetrics {
  roundsPossible: number;
  attemptsPerPlayer: number;
  activeTimeMin: number;
  waitingSec: number;
  queueSize: number;
  participationRatio: number;
  flowStatus: "healthy" | "moderate" | "poor";
}

export interface DrillView {
  id: string;
  name: string;
  pillar: string;
  status: DrillStatus;
  summary: string;
  novelty: number;
  intensity: Intensity;
  complexity: Complexity;
  space: SpaceSize;
  conceptType?: "reliable" | "matchfit" | "experimental" | null;
  selectionScore: number;
  equipment: string[];
  mechanics: string[];
  objectives: Partial<Record<SessionDimension, number>>;
  constraints: DrillConstraints;
  setupInstructions: string[];
  progression: string[];
  regression: string[];
  safetyNotes: string[];
  contentMoment: string;
  fitExplanation: string;
  rules: DrillRule[];
  scoringRules: ScoringRule[];
  xpRules: XPEvent[];
}

export interface SessionContext {
  id: string;
  title: string;
  date: string;
  venue: string;
  durationMin: number;
  players: number;
  coaches: number;
  pitch: string;
  playerLevel: string;
  primaryObjective: FootballObjective;
  secondaryObjective: string;
  targetIntensity: string;
  equipment: string[];
  xpTargetMin: number;
  xpTargetMax: number;
}

export interface RotationPlan {
  groups: string;
  activePerRound: number;
  restPattern: string;
}

export interface GeneratedDrillConcept {
  name: string;
  conceptType: "reliable" | "matchfit" | "experimental";
  summary: string;
  footballObjectives: FootballObjective[];
  setupInstructions: string[];
  rules: DrillRule[];
  scoringRules: ScoringRule[];
  rotationPlan: RotationPlan;
  progression: string[];
  regression: string[];
  safetyNotes: string[];
  contentMoment: string;
  xpEvents: XPEvent[];
  estimatedMetrics: DrillMetrics;
  sessionFitExplanation: string;
  selectionScore: number;
  mechanics: EngagementMechanic[];
  novelty: number;
  intensity: Intensity;
  complexity: Complexity;
  space: SpaceSize;
  equipment: string[];
  objectives: Partial<Record<SessionDimension, number>>;
  constraints: DrillConstraints;
}

export type IssueLevel = "info" | "warning" | "blocking";

export interface ValidationIssue {
  level: IssueLevel;
  message: string;
  ruleIds?: string[];
}

export interface SimEvent {
  eventType: string;
  label?: string;
  playerId?: string;
  teamId?: string;
}
