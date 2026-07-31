import { describe, expect, it } from "vitest";
import { scoreEvents } from "../scoring-engine";
import { computeXP, xpGuardrails } from "../xp-engine";
import { validateDrill } from "../rule-engine";
import { calculateFlow } from "../player-flow";
import { analyseSession } from "../session-analysis";
import { generateDrillConcepts } from "../drill-generator";
import { DEFAULT_CONSTRAINTS } from "../serialize";
import type { DrillRule, DrillView, ScoringRule, SessionContext, XPEvent } from "@/playlab/types";

const constraints = { ...DEFAULT_CONSTRAINTS };

const context: SessionContext = {
  id: "s",
  title: "Test",
  date: "2026-07-30",
  venue: "KNC",
  durationMin: 120,
  players: 18,
  coaches: 2,
  pitch: "Half",
  playerLevel: "Mixed",
  primaryObjective: "passing",
  secondaryObjective: "finishing",
  targetIntensity: "Medium-high",
  equipment: ["18 footballs", "cones", "bibs", "six mini-goals"],
  xpTargetMin: 50,
  xpTargetMax: 120,
};

const scoringRules: ScoringRule[] = [
  { id: "s1", eventType: "goal", label: "Goal", points: 1, appliesTo: "player", enabled: true },
  { id: "s2", eventType: "targetHit", label: "Correct target", points: 1, appliesTo: "player", enabled: true },
  { id: "s3", eventType: "custom", label: "Weak-foot bonus", points: 1, appliesTo: "player", enabled: true },
  { id: "s4", eventType: "streak", label: "Three-goal streak", points: 2, appliesTo: "player", maxOccurrences: 3, enabled: true },
  { id: "s5", eventType: "roundWin", label: "Round win", points: 3, appliesTo: "team", enabled: true },
];

const xpRules: XPEvent[] = [
  { id: "x1", sourceEventType: "participation", label: "Participation", xp: 10, category: "participation", enabled: true },
  { id: "x2", sourceEventType: "custom", label: "Weak-foot achievement", xp: 15, category: "performance", dailyCap: 1, enabled: true },
  { id: "x3", sourceEventType: "streak", label: "Streak performance", xp: 10, category: "performance", dailyCap: 1, enabled: true },
  { id: "x4", sourceEventType: "roundWin", label: "Team win", xp: 10, category: "teamwork", dailyCap: 2, enabled: true },
];

describe("scoring engine (§35 example)", () => {
  it("computes Akash's round: goal + target + weak-foot + streak + round win = 8", () => {
    const result = scoreEvents(
      [
        { eventType: "goal" },
        { eventType: "targetHit" },
        { eventType: "custom" },
        { eventType: "streak" },
        { eventType: "roundWin" },
      ],
      scoringRules
    );
    expect(result.total).toBe(8);
    expect(result.lines).toHaveLength(5);
  });

  it("respects maxOccurrences caps", () => {
    const events = Array.from({ length: 5 }, () => ({ eventType: "streak" }));
    const result = scoreEvents(events, scoringRules);
    expect(result.total).toBe(6); // 3 × 2, two over cap
  });

  it("ignores disabled rules", () => {
    const rules = scoringRules.map((r) => ({ ...r, enabled: false }));
    expect(scoreEvents([{ eventType: "goal" }], rules).total).toBe(0);
  });
});

describe("xp engine (§35 example)", () => {
  it("computes 45 XP for the sample round", () => {
    const result = computeXP(
      [
        { eventType: "custom" },
        { eventType: "streak" },
        { eventType: "roundWin" },
      ],
      xpRules
    );
    expect(result.total).toBe(45); // 10 + 15 + 10 + 10
  });

  it("repeatable XP events obey the per-drill cap", () => {
    const result = computeXP(
      Array.from({ length: 4 }, () => ({ eventType: "custom" })),
      xpRules
    );
    // participation 10 + weak-foot 15 once (cap 1)
    expect(result.total).toBe(25);
  });

  it("flags farmable XP with no cap", () => {
    const uncapped: XPEvent[] = [
      { id: "u1", sourceEventType: "goal", label: "Goal XP", xp: 5, category: "performance", enabled: true },
    ];
    const issues = xpGuardrails(uncapped, scoringRules.map((r) => ({ ...r, maxOccurrences: undefined })), { min: 50, max: 120 });
    expect(issues.some((i) => i.message.includes("farmed"))).toBe(true);
  });
});

describe("rule engine (§13)", () => {
  const touchRules: DrillRule[] = [
    { id: "r1", category: "action", title: "Limited touches", description: "", enabled: true, parameters: { maxTouches: 2 }, conflictsWith: ["r2"] },
    { id: "r2", category: "action", title: "Unlimited touches", description: "", enabled: true, parameters: { unlimitedTouches: true }, conflictsWith: ["r1"] },
  ];

  it("two-touch and unlimited-touch rules cannot both be active", () => {
    const issues = validateDrill({ rules: touchRules, scoringRules, xpRules, constraints });
    expect(issues.some((i) => i.level === "blocking" && /cannot be active/.test(i.message))).toBe(true);
  });

  it("weak-foot streak bonus requires weak-foot attempts to be enabled", () => {
    const rules: DrillRule[] = [
      { id: "wf", category: "action", title: "Weak-foot attempts", description: "", enabled: false, parameters: {} },
      { id: "wfs", category: "bonus", title: "Weak-foot streak bonus", description: "", enabled: true, parameters: {}, dependencies: ["wf"] },
    ];
    const issues = validateDrill({ rules, scoringRules, xpRules, constraints });
    expect(issues.some((i) => i.level === "warning" && /requires/.test(i.message))).toBe(true);
  });

  it("18 players with only two active generates a queue warning", () => {
    const issues = validateDrill({
      rules: [],
      scoringRules,
      xpRules,
      constraints: { ...constraints, players: 18, activePlayersPerRound: 2, stations: 1 },
    });
    expect(issues.some((i) => /waiting time/.test(i.message))).toBe(true);
  });

  it("blocks a drill with no measurable scoring event", () => {
    const issues = validateDrill({
      rules: [],
      scoringRules: scoringRules.map((r) => ({ ...r, enabled: false })),
      xpRules,
      constraints,
    });
    expect(issues.some((i) => i.level === "blocking" && /no measurable/i.test(i.message))).toBe(true);
  });

  it("warns when more than six scoring events are enabled", () => {
    const many: ScoringRule[] = Array.from({ length: 7 }, (_, i) => ({
      id: `m${i}`, eventType: "custom", label: `E${i}`, points: 1, appliesTo: "player", enabled: true,
    }));
    const issues = validateDrill({ rules: [], scoringRules: many, xpRules, constraints });
    expect(issues.some((i) => /Live scoring may be too difficult/.test(i.message))).toBe(true);
  });
});

describe("player flow (§18)", () => {
  it("computes the documented formula", () => {
    const flow = calculateFlow({
      ...constraints,
      players: 18,
      activePlayersPerRound: 3,
      stations: 3,
      durationMin: 15,
      roundSec: 60,
      transitionSec: 15,
    });
    // roundCycle 75 → 12 rounds → 12×9 = 108 slots → 6 attempts/player
    expect(flow.roundsPossible).toBe(12);
    expect(flow.attemptsPerPlayer).toBe(6);
    expect(flow.flowStatus).toBe("moderate"); // 50% participation
  });

  it("flags poor flow for 2 active of 18", () => {
    const flow = calculateFlow({ ...constraints, players: 18, activePlayersPerRound: 2, stations: 1 });
    expect(flow.flowStatus).toBe("poor");
  });
});

const drillView = (over: Partial<DrillView>): DrillView => ({
  id: "d",
  name: "D",
  pillar: "Gamified Football Drills",
  status: "library",
  summary: "",
  novelty: 0.5,
  intensity: "Medium",
  complexity: "Simple",
  space: "Medium",
  conceptType: null,
  selectionScore: 60,
  equipment: [],
  mechanics: [],
  objectives: {},
  constraints,
  setupInstructions: [],
  progression: [],
  regression: [],
  safetyNotes: [],
  contentMoment: "",
  fitExplanation: "",
  rules: [],
  scoringRules: [],
  xpRules: [],
  ...over,
});

describe("session analysis (§8)", () => {
  it("adding a finishing drill improves the finishing balance", () => {
    const passingOnly = [drillView({ objectives: { passing: 5, teamCompetition: 4 } })];
    const before = analyseSession(passingOnly, context);
    expect(before.missing).toContain("finishing");

    const withFinishing = [
      ...passingOnly,
      drillView({ id: "f", objectives: { finishing: 5, individualCompetition: 4 } }),
    ];
    const after = analyseSession(withFinishing, context);
    const score = (b: typeof after) => b.readings.find((r) => r.dimension === "finishing")!.total;
    expect(score(after)).toBeGreaterThan(score(before));
  });

  it("recommendation is generated from the gaps, not static", () => {
    const a = analyseSession([drillView({ objectives: { passing: 5 } })], context);
    const b = analyseSession([drillView({ objectives: { defending: 5, oppositionPressure: 4 } })], context);
    expect(a.recommendation).not.toBe(b.recommendation);
  });
});

describe("drill generator (§10)", () => {
  const input = {
    sessionContext: context,
    selectedDrills: [drillView({ objectives: { passing: 5, teamCompetition: 5 } })],
    primaryObjective: "finishing" as const,
    secondaryObjectives: ["defending" as const],
    reason: "fill missing session component",
    desiredExperience: ["fast" as const],
    competitionFormat: "team vs team" as const,
    engagementMechanics: ["bonus target" as const, "streak bonus" as const],
    constraints,
  };

  it("returns three distinct, structured concepts", () => {
    const out = generateDrillConcepts(input);
    expect(out).toHaveLength(3);
    expect(out.map((c) => c.conceptType)).toEqual(["reliable", "matchfit", "experimental"]);
    for (const c of out) {
      expect(c.name.length).toBeGreaterThan(3);
      expect(c.rules.length).toBeGreaterThan(3);
      expect(c.scoringRules.some((s) => s.enabled)).toBe(true);
      expect(c.xpEvents.some((x) => x.enabled)).toBe(true);
      expect(c.estimatedMetrics.roundsPossible).toBeGreaterThan(0);
      expect(c.selectionScore).toBeGreaterThan(0);
    }
    expect(new Set(out.map((c) => c.name)).size).toBe(3);
  });

  it("is deterministic for identical inputs", () => {
    const a = generateDrillConcepts(input);
    const b = generateDrillConcepts(input);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("targets session gaps in the fit explanation", () => {
    const out = generateDrillConcepts(input);
    expect(out.some((c) => /gap/.test(c.sessionFitExplanation))).toBe(true);
  });
});
