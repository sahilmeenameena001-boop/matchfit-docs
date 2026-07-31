/** Shared mapping from a GeneratedDrillConcept (or edited drill state) to
 *  Prisma create/update payloads. Used by the seed script and server actions. */
import type { GeneratedDrillConcept, DrillRule, ScoringRule, XPEvent } from "@/playlab/types";

let uniqueSeq = 0;
const freshId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${(++uniqueSeq).toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;

/** Generated concepts carry template-local rule ids (r-start-1…): remap them
 *  to globally unique ids — preserving dependency/conflict references — so the
 *  same concept can be persisted any number of times without PK collisions. */
function remapRules(rules: DrillRule[]): DrillRule[] {
  const map = new Map(rules.map((r) => [r.id, freshId("r")]));
  return rules.map((r) => ({
    ...r,
    id: map.get(r.id)!,
    dependencies: (r.dependencies ?? []).map((d) => map.get(d) ?? d),
    conflictsWith: (r.conflictsWith ?? []).map((c) => map.get(c) ?? c),
  }));
}

export function conceptCreateData(c: GeneratedDrillConcept, status = "aiDraft") {
  return {
    name: c.name,
    pillar: "Gamified Football Drills",
    status,
    summary: c.summary,
    novelty: c.novelty,
    intensity: c.intensity,
    complexity: c.complexity,
    space: c.space,
    conceptType: c.conceptType,
    selectionScore: c.selectionScore,
    equipmentJson: JSON.stringify(c.equipment),
    mechanicsJson: JSON.stringify(c.mechanics),
    objectivesJson: JSON.stringify(c.objectives),
    constraintsJson: JSON.stringify(c.constraints),
    setupJson: JSON.stringify(c.setupInstructions),
    progressionJson: JSON.stringify(c.progression),
    regressionJson: JSON.stringify(c.regression),
    safetyJson: JSON.stringify(c.safetyNotes),
    contentMoment: c.contentMoment,
    fitExplanation: c.sessionFitExplanation,
    rules: {
      create: remapRules(c.rules).map((r, i) => ruleCreateData(r, i)),
    },
    scoringRules: {
      create: c.scoringRules.map((s) => scoringCreateData({ ...s, id: freshId("s") })),
    },
    xpRules: {
      create: c.xpEvents.map((x) => xpCreateData({ ...x, id: freshId("x") })),
    },
  };
}

export function ruleCreateData(r: DrillRule, sortOrder: number) {
  return {
    id: r.id,
    category: r.category,
    title: r.title,
    description: r.description,
    enabled: r.enabled,
    sortOrder: r.sortOrder ?? sortOrder,
    paramsJson: JSON.stringify(r.parameters),
    depsJson: JSON.stringify(r.dependencies ?? []),
    conflictsJson: JSON.stringify(r.conflictsWith ?? []),
  };
}

export function scoringCreateData(s: ScoringRule) {
  return {
    id: s.id,
    eventType: s.eventType,
    label: s.label,
    points: s.points,
    appliesTo: s.appliesTo,
    maxOccurrences: s.maxOccurrences ?? null,
    enabled: s.enabled,
  };
}

export function xpCreateData(x: XPEvent) {
  return {
    id: x.id,
    sourceEventType: x.sourceEventType,
    label: x.label,
    xp: x.xp,
    category: x.category,
    dailyCap: x.dailyCap ?? null,
    enabled: x.enabled,
  };
}
