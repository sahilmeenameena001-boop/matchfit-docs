/** Scoring engine — turns recorded events into drill points using the active
 *  scoring rules. Drill score decides who wins THIS game (spec §14–16). */
import type { ScoringRule, SimEvent } from "@/types";

export interface ScoreLine {
  label: string;
  points: number;
  eventType: string;
}

export interface ScoreResult {
  lines: ScoreLine[];
  total: number;
  /** Events that matched no enabled scoring rule. */
  unscored: string[];
}

/** Score a list of events (one player/team or a mixed feed) against rules. */
export function scoreEvents(events: SimEvent[], rules: ScoringRule[]): ScoreResult {
  const lines: ScoreLine[] = [];
  const unscored: string[] = [];
  const seen: Record<string, number> = {};

  for (const ev of events) {
    const rule = rules.find((r) => r.enabled && r.eventType === ev.eventType);
    if (!rule) {
      unscored.push(ev.eventType);
      continue;
    }
    seen[rule.id] = (seen[rule.id] ?? 0) + 1;
    if (rule.maxOccurrences !== undefined && seen[rule.id] > rule.maxOccurrences) {
      unscored.push(`${ev.eventType} (over cap)`);
      continue;
    }
    lines.push({ label: rule.label, points: rule.points, eventType: rule.eventType });
  }

  return {
    lines,
    total: lines.reduce((s, l) => s + l.points, 0),
    unscored,
  };
}

/** Points for one event under the current rules (0 when unmatched/disabled). */
export function pointsFor(eventType: string, rules: ScoringRule[]): number {
  const rule = rules.find((r) => r.enabled && r.eventType === eventType);
  return rule ? rule.points : 0;
}
