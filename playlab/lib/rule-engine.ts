/** Rule engine — detects conflicts, dependencies and impossible combinations
 *  across a drill's rules, scoring and constraints (spec §13). */
import { calculateFlow } from "./player-flow";
import type {
  DrillConstraints,
  DrillRule,
  ScoringRule,
  ValidationIssue,
  XPEvent,
} from "@/types";

export function validateDrill(input: {
  rules: DrillRule[];
  scoringRules: ScoringRule[];
  xpRules: XPEvent[];
  constraints: DrillConstraints;
}): ValidationIssue[] {
  const { rules, scoringRules, constraints } = input;
  const issues: ValidationIssue[] = [];
  const enabled = rules.filter((r) => r.enabled);
  const byId = new Map(rules.map((r) => [r.id, r]));
  const titleOf = (id: string) => byId.get(id)?.title ?? id;

  // 1. Declared conflicts, both enabled → blocking.
  const reported = new Set<string>();
  for (const rule of enabled) {
    for (const other of rule.conflictsWith ?? []) {
      const conflictKey = [rule.id, other].sort().join("|");
      if (reported.has(conflictKey)) continue;
      const otherRule = byId.get(other);
      if (otherRule?.enabled) {
        reported.add(conflictKey);
        issues.push({
          level: "blocking",
          message: `"${rule.title}" cannot be active with "${otherRule.title}".`,
          ruleIds: [rule.id, other],
        });
      }
    }
  }

  // 2. Dependencies: enabled rule needs its dependency enabled.
  for (const rule of enabled) {
    for (const dep of rule.dependencies ?? []) {
      const depRule = byId.get(dep);
      if (!depRule || !depRule.enabled) {
        issues.push({
          level: "warning",
          message: `"${rule.title}" requires "${titleOf(dep)}" to be enabled.`,
          ruleIds: [rule.id, dep],
        });
      }
    }
  }

  // 3. Parameter contradiction: unlimited touches vs a touch limit.
  const touchLimits = enabled.filter((r) => typeof r.parameters.maxTouches === "number");
  const unlimited = enabled.filter((r) => r.parameters.unlimitedTouches === true);
  if (touchLimits.length > 0 && unlimited.length > 0) {
    issues.push({
      level: "blocking",
      message: `"Unlimited touches" cannot be active with a maximum-touch rule.`,
      ruleIds: [...touchLimits, ...unlimited].map((r) => r.id),
    });
  }

  // 4. Multiple game-ending rules fighting each other.
  const enders = enabled.filter(
    (r) => r.category === "success" && r.parameters.endsRound === true
  );
  const tiebreakSudden = enabled.filter(
    (r) => r.category === "tiebreak" && r.parameters.suddenDeath === true
  );
  if (enders.length > 1) {
    issues.push({
      level: "warning",
      message: `${enders.length} rules can end the round — players won't know which one applies first.`,
      ruleIds: enders.map((r) => r.id),
    });
  }
  if (tiebreakSudden.length > 1) {
    issues.push({
      level: "warning",
      message: "Two sudden-death tie-breaks are active — keep one.",
      ruleIds: tiebreakSudden.map((r) => r.id),
    });
  }

  // 5. No measurable success event.
  const activeScoring = scoringRules.filter((r) => r.enabled);
  if (activeScoring.length === 0) {
    issues.push({
      level: "blocking",
      message: "No enabled scoring rule — the drill has no measurable event.",
    });
  }

  // 6. Live-scoring overload.
  if (activeScoring.length > 6) {
    issues.push({
      level: "warning",
      message: `The drill has ${activeScoring.length} scoring events. Live scoring may be too difficult — aim for 6 or fewer.`,
    });
  }

  // 7. Flow: queues and round length.
  const flow = calculateFlow(constraints);
  if (flow.flowStatus === "poor") {
    issues.push({
      level: "warning",
      message: `Only ${Math.min(
        constraints.players,
        constraints.activePlayersPerRound * Math.max(1, constraints.stations)
      )} of ${constraints.players} players are active at once — estimated waiting time is too high (~${flow.waitingSec}s).`,
    });
  } else if (flow.flowStatus === "moderate") {
    issues.push({
      level: "info",
      message: `Participation is moderate (${Math.round(
        flow.participationRatio * 100
      )}%). Consider a second station to raise repetitions.`,
    });
  }
  if (constraints.roundSec > 300) {
    issues.push({
      level: "warning",
      message: `Rounds run ${Math.round(constraints.roundSec / 60)} minutes — long rounds slow rotations and reduce attempts.`,
    });
  }

  // 8. Duplicated mechanics inside the rule set (same title twice, enabled).
  const titles = new Map<string, DrillRule[]>();
  for (const rule of enabled) {
    const key = rule.title.toLowerCase();
    titles.set(key, [...(titles.get(key) ?? []), rule]);
  }
  for (const [, dupes] of titles) {
    if (dupes.length > 1) {
      issues.push({
        level: "info",
        message: `"${dupes[0].title}" appears ${dupes.length} times — remove the duplicate.`,
        ruleIds: dupes.map((r) => r.id),
      });
    }
  }

  const order = { blocking: 0, warning: 1, info: 2 } as const;
  return issues.sort((a, b) => order[a.level] - order[b.level]);
}
