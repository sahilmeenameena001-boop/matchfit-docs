/** XP engine — long-term progression rewards, computed separately from drill
 *  score, plus anti-inflation guardrails (spec §14–17). */
import type { ScoringRule, SimEvent, ValidationIssue, XPEvent } from "@/types";

export interface XPLine {
  label: string;
  xp: number;
  category: string;
}

export interface XPResult {
  lines: XPLine[];
  total: number;
}

/**
 * Compute XP for a feed of events. `participation` is granted once when any
 * event exists and a participation rule is enabled. Caps (dailyCap) limit how
 * often a repeatable rule can fire inside this computation.
 */
export function computeXP(events: SimEvent[], xpRules: XPEvent[]): XPResult {
  const lines: XPLine[] = [];
  const fired: Record<string, number> = {};

  const participation = xpRules.find(
    (r) => r.enabled && r.category === "participation"
  );
  if (participation && events.length > 0) {
    lines.push({
      label: participation.label,
      xp: participation.xp,
      category: participation.category,
    });
  }

  for (const ev of events) {
    for (const rule of xpRules) {
      if (!rule.enabled || rule.category === "participation") continue;
      if (rule.sourceEventType !== ev.eventType) continue;
      fired[rule.id] = (fired[rule.id] ?? 0) + 1;
      if (rule.dailyCap !== undefined && fired[rule.id] > rule.dailyCap) continue;
      lines.push({ label: rule.label, xp: rule.xp, category: rule.category });
    }
  }

  return { lines, total: lines.reduce((s, l) => s + l.xp, 0) };
}

/** Anti-inflation guardrails over the configured XP rules (spec §17). */
export function xpGuardrails(
  xpRules: XPEvent[],
  scoringRules: ScoringRule[],
  sessionXpTarget: { min: number; max: number }
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const enabled = xpRules.filter((r) => r.enabled);

  for (const rule of enabled) {
    if (rule.category === "participation") continue;
    // Farmable: repeatable source with no cap.
    const repeatableSource = scoringRules.some(
      (s) => s.enabled && s.eventType === rule.sourceEventType && s.maxOccurrences === undefined
    );
    if (repeatableSource && rule.dailyCap === undefined) {
      issues.push({
        level: "warning",
        message: `"${rule.label}" can be farmed — its source event repeats without a cap. Add a per-drill cap.`,
        ruleIds: [rule.id],
      });
    }
    // Disproportionate single action.
    if (rule.xp > sessionXpTarget.max * 0.4) {
      issues.push({
        level: "warning",
        message: `"${rule.label}" awards ${rule.xp} XP — more than 40% of the session ceiling (${sessionXpTarget.max}). Reduce it.`,
        ruleIds: [rule.id],
      });
    }
  }

  const participationXp = enabled
    .filter((r) => r.category === "participation")
    .reduce((s, r) => s + r.xp, 0);
  const performanceXp = enabled
    .filter((r) => r.category === "performance" || r.category === "personalBest")
    .reduce((s, r) => s + r.xp, 0);
  if (participationXp > 0 && performanceXp > 0 && participationXp > performanceXp * 2) {
    issues.push({
      level: "warning",
      message: `Participation XP (${participationXp}) dwarfs performance XP (${performanceXp}) — showing up would beat playing well.`,
    });
  }

  // Duplicated reward: team + individual XP from the same source event.
  const bySource = new Map<string, XPEvent[]>();
  for (const r of enabled) {
    bySource.set(r.sourceEventType, [...(bySource.get(r.sourceEventType) ?? []), r]);
  }
  for (const [source, rules] of bySource) {
    const cats = new Set(rules.map((r) => r.category));
    if (rules.length > 1 && cats.has("teamwork") && (cats.has("performance") || cats.has("personalBest"))) {
      issues.push({
        level: "info",
        message: `"${source}" feeds both individual and team XP — check the double reward is intended.`,
        ruleIds: rules.map((r) => r.id),
      });
    }
  }

  // Worst-case drill XP vs session target.
  const worstCase = enabled.reduce(
    (s, r) => s + r.xp * (r.category === "participation" ? 1 : r.dailyCap ?? 3),
    0
  );
  if (worstCase > sessionXpTarget.max) {
    issues.push({
      level: "warning",
      message: `One drill can pay out ~${worstCase} XP — above the whole-session target of ${sessionXpTarget.min}–${sessionXpTarget.max} XP per player.`,
    });
  }

  return issues;
}
