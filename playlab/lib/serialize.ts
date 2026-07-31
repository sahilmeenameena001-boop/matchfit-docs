/** Map Prisma rows (JSON-in-String columns) to typed domain views. */
import type {
  DrillConstraints,
  DrillRule,
  DrillView,
  ScoringRule,
  SessionContext,
  XPEvent,
} from "@/types";

const parse = <T>(json: string, fallback: T): T => {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
};

export const DEFAULT_CONSTRAINTS: DrillConstraints = {
  players: 18,
  teams: 3,
  activePlayersPerRound: 3,
  durationMin: 15,
  roundSec: 90,
  transitionSec: 20,
  stations: 1,
  pitchSize: "Medium",
  setupMin: 3,
  coachCount: 1,
  intensity: "Medium",
  contactLevel: "light",
  playerLevel: "Mixed intermediate",
};

type DrillRow = {
  id: string;
  name: string;
  pillar: string;
  status: string;
  summary: string;
  novelty: number;
  intensity: string;
  complexity: string;
  space: string;
  conceptType: string | null;
  selectionScore: number;
  equipmentJson: string;
  mechanicsJson: string;
  objectivesJson: string;
  constraintsJson: string;
  setupJson: string;
  progressionJson: string;
  regressionJson: string;
  safetyJson: string;
  contentMoment: string;
  fitExplanation: string;
  rules?: RuleRow[];
  scoringRules?: ScoringRow[];
  xpRules?: XPRow[];
};

type RuleRow = {
  id: string;
  category: string;
  title: string;
  description: string;
  enabled: boolean;
  sortOrder: number;
  paramsJson: string;
  depsJson: string;
  conflictsJson: string;
};

type ScoringRow = {
  id: string;
  eventType: string;
  label: string;
  points: number;
  appliesTo: string;
  maxOccurrences: number | null;
  enabled: boolean;
};

type XPRow = {
  id: string;
  sourceEventType: string;
  label: string;
  xp: number;
  category: string;
  dailyCap: number | null;
  enabled: boolean;
};

export function toRule(row: RuleRow): DrillRule {
  return {
    id: row.id,
    category: row.category as DrillRule["category"],
    title: row.title,
    description: row.description,
    enabled: row.enabled,
    sortOrder: row.sortOrder,
    parameters: parse(row.paramsJson, {}),
    dependencies: parse(row.depsJson, [] as string[]),
    conflictsWith: parse(row.conflictsJson, [] as string[]),
  };
}

export function toScoring(row: ScoringRow): ScoringRule {
  return {
    id: row.id,
    eventType: row.eventType,
    label: row.label,
    points: row.points,
    appliesTo: row.appliesTo as "player" | "team",
    maxOccurrences: row.maxOccurrences ?? undefined,
    enabled: row.enabled,
  };
}

export function toXP(row: XPRow): XPEvent {
  return {
    id: row.id,
    sourceEventType: row.sourceEventType,
    label: row.label,
    xp: row.xp,
    category: row.category as XPEvent["category"],
    dailyCap: row.dailyCap ?? undefined,
    enabled: row.enabled,
  };
}

export function toDrillView(row: DrillRow): DrillView {
  return {
    id: row.id,
    name: row.name,
    pillar: row.pillar,
    status: row.status as DrillView["status"],
    summary: row.summary,
    novelty: row.novelty,
    intensity: row.intensity as DrillView["intensity"],
    complexity: row.complexity as DrillView["complexity"],
    space: row.space as DrillView["space"],
    conceptType: (row.conceptType ?? null) as DrillView["conceptType"],
    selectionScore: row.selectionScore,
    equipment: parse(row.equipmentJson, []),
    mechanics: parse(row.mechanicsJson, []),
    objectives: parse(row.objectivesJson, {}),
    constraints: { ...DEFAULT_CONSTRAINTS, ...parse(row.constraintsJson, {}) },
    setupInstructions: parse(row.setupJson, []),
    progression: parse(row.progressionJson, []),
    regression: parse(row.regressionJson, []),
    safetyNotes: parse(row.safetyJson, []),
    contentMoment: row.contentMoment,
    fitExplanation: row.fitExplanation,
    rules: (row.rules ?? [])
      .map(toRule)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    scoringRules: (row.scoringRules ?? []).map(toScoring),
    xpRules: (row.xpRules ?? []).map(toXP),
  };
}

type SessionRow = {
  id: string;
  title: string;
  date: string;
  venue: string;
  durationMin: number;
  pitch: string;
  playerLevel: string;
  primaryObjective: string;
  secondaryObjective: string;
  targetIntensity: string;
  equipmentJson: string;
  xpTargetMin: number;
  xpTargetMax: number;
  players?: unknown[];
};

export function toSessionContext(row: SessionRow, coachCount = 2): SessionContext {
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    venue: row.venue,
    durationMin: row.durationMin,
    players: row.players?.length ?? 18,
    coaches: coachCount,
    pitch: row.pitch,
    playerLevel: row.playerLevel,
    primaryObjective: row.primaryObjective as SessionContext["primaryObjective"],
    secondaryObjective: row.secondaryObjective,
    targetIntensity: row.targetIntensity,
    equipment: parse(row.equipmentJson, []),
    xpTargetMin: row.xpTargetMin,
    xpTargetMax: row.xpTargetMax,
  };
}
