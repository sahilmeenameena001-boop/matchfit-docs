"use server";

/** Server actions — every mutation the UI performs. Pure logic lives in the
 *  engines; this file only persists and revalidates. */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "./db";
import { conceptCreateData, ruleCreateData, scoringCreateData, xpCreateData } from "./persist";
import type {
  DrillConstraints,
  DrillRule,
  GeneratedDrillConcept,
  ScoringRule,
  XPEvent,
} from "@/playlab/types";

const revalidateAll = () => {
  revalidatePath("/", "layout");
};

/** Persist a generated concept as an aiDraft drill (optionally into a session),
 *  then open it in the Rule Studio. */
export async function saveConceptAction(
  concept: GeneratedDrillConcept,
  sessionId?: string
) {
  const drill = await db.drill.create({ data: conceptCreateData(concept, "aiDraft") });
  if (sessionId) {
    const count = await db.sessionDrill.count({ where: { sessionId } });
    await db.sessionDrill.create({
      data: {
        sessionId,
        drillId: drill.id,
        sortOrder: count,
        durationMin: concept.constraints.durationMin,
      },
    });
  }
  revalidateAll();
  redirect(`/playlab/drills/${drill.id}/edit${sessionId ? `?sessionId=${sessionId}` : ""}`);
}

/** Replace a drill's rules/scoring/XP and core fields from the Rule Studio. */
export async function saveDrillAction(input: {
  drillId: string;
  name: string;
  status?: string;
  constraints: DrillConstraints;
  rules: DrillRule[];
  scoringRules: ScoringRule[];
  xpRules: XPEvent[];
}) {
  const { drillId } = input;
  await db.$transaction([
    db.drillRule.deleteMany({ where: { drillId } }),
    db.scoringRule.deleteMany({ where: { drillId } }),
    db.xPRule.deleteMany({ where: { drillId } }),
    db.drill.update({
      where: { id: drillId },
      data: {
        name: input.name,
        ...(input.status ? { status: input.status } : {}),
        constraintsJson: JSON.stringify(input.constraints),
        rules: { create: input.rules.map((r, i) => ruleCreateData(r, i)) },
        scoringRules: { create: input.scoringRules.map(scoringCreateData) },
        xpRules: { create: input.xpRules.map(xpCreateData) },
      },
    }),
  ]);
  revalidateAll();
  return { ok: true };
}

export async function addDrillToSessionAction(sessionId: string, drillId: string) {
  const existing = await db.sessionDrill.findFirst({ where: { sessionId, drillId } });
  if (!existing) {
    const drill = await db.drill.findUniqueOrThrow({ where: { id: drillId } });
    const constraints = JSON.parse(drill.constraintsJson || "{}") as { durationMin?: number };
    const count = await db.sessionDrill.count({ where: { sessionId } });
    await db.sessionDrill.create({
      data: {
        sessionId,
        drillId,
        sortOrder: count,
        durationMin: constraints.durationMin ?? 15,
      },
    });
  }
  revalidateAll();
}

export async function removeSessionDrillAction(sessionDrillId: string) {
  await db.drillEvent.deleteMany({ where: { run: { sessionDrillId } } });
  await db.playerDrillResult.deleteMany({ where: { run: { sessionDrillId } } });
  await db.teamDrillResult.deleteMany({ where: { run: { sessionDrillId } } });
  await db.drillReview.deleteMany({ where: { run: { sessionDrillId } } });
  await db.drillRun.deleteMany({ where: { sessionDrillId } });
  await db.sessionDrill.delete({ where: { id: sessionDrillId } });
  revalidateAll();
}

export async function reorderSessionDrillsAction(orderedIds: string[]) {
  await db.$transaction(
    orderedIds.map((id, i) =>
      db.sessionDrill.update({ where: { id }, data: { sortOrder: i } })
    )
  );
  revalidateAll();
}

export async function setSessionDrillDurationAction(id: string, durationMin: number) {
  await db.sessionDrill.update({
    where: { id },
    data: { durationMin: Math.max(2, Math.min(60, Math.round(durationMin))) },
  });
  revalidateAll();
}

export async function duplicateSessionDrillAction(id: string) {
  const sd = await db.sessionDrill.findUniqueOrThrow({ where: { id } });
  const count = await db.sessionDrill.count({ where: { sessionId: sd.sessionId } });
  await db.sessionDrill.create({
    data: {
      sessionId: sd.sessionId,
      drillId: sd.drillId,
      sortOrder: count,
      durationMin: sd.durationMin,
    },
  });
  revalidateAll();
}

/** Remix: clone a drill as a new AI draft and open it in the Rule Studio. */
export async function remixDrillAction(drillId: string, sessionId?: string) {
  const d = await db.drill.findUniqueOrThrow({
    where: { id: drillId },
    include: { rules: true, scoringRules: true, xpRules: true },
  });
  const copy = await db.drill.create({
    data: {
      name: `${d.name} (Remix)`,
      pillar: d.pillar,
      status: "aiDraft",
      summary: d.summary,
      novelty: Math.min(0.98, d.novelty + 0.1),
      intensity: d.intensity,
      complexity: d.complexity,
      space: d.space,
      conceptType: "experimental",
      selectionScore: d.selectionScore,
      sourceDrillId: d.id,
      equipmentJson: d.equipmentJson,
      mechanicsJson: d.mechanicsJson,
      objectivesJson: d.objectivesJson,
      constraintsJson: d.constraintsJson,
      setupJson: d.setupJson,
      progressionJson: d.progressionJson,
      regressionJson: d.regressionJson,
      safetyJson: d.safetyJson,
      contentMoment: d.contentMoment,
      fitExplanation: d.fitExplanation,
      rules: {
        create: d.rules.map((r, i) => ({
          category: r.category,
          title: r.title,
          description: r.description,
          enabled: r.enabled,
          sortOrder: i,
          paramsJson: r.paramsJson,
          depsJson: "[]",
          conflictsJson: "[]",
        })),
      },
      scoringRules: {
        create: d.scoringRules.map((s) => ({
          eventType: s.eventType,
          label: s.label,
          points: s.points,
          appliesTo: s.appliesTo,
          maxOccurrences: s.maxOccurrences,
          enabled: s.enabled,
        })),
      },
      xpRules: {
        create: d.xpRules.map((x) => ({
          sourceEventType: x.sourceEventType,
          label: x.label,
          xp: x.xp,
          category: x.category,
          dailyCap: x.dailyCap,
          enabled: x.enabled,
        })),
      },
    },
  });
  revalidateAll();
  redirect(`/playlab/drills/${copy.id}/edit${sessionId ? `?sessionId=${sessionId}` : ""}`);
}

export interface LiveEventInput {
  eventType: string;
  label: string;
  points: number;
  xp: number;
  round: number;
  playerId?: string;
  teamId?: string;
}

/** Persist a completed live run: events, per-player/team results, XP totals. */
export async function completeRunAction(input: {
  sessionDrillId: string;
  rounds: number;
  events: LiveEventInput[];
  playerOfDrillId?: string;
}) {
  const run = await db.drillRun.create({
    data: {
      sessionDrillId: input.sessionDrillId,
      endedAt: new Date(),
      rounds: input.rounds,
      playerOfDrillId: input.playerOfDrillId ?? null,
    },
  });
  for (const e of input.events) {
    await db.drillEvent.create({
      data: {
        runId: run.id,
        eventType: e.eventType,
        label: e.label,
        points: e.points,
        xp: e.xp,
        round: e.round,
        playerId: e.playerId ?? null,
        teamId: e.teamId ?? null,
      },
    });
  }

  const byPlayer = new Map<string, { score: number; xp: number }>();
  const byTeam = new Map<string, number>();
  for (const e of input.events) {
    if (e.playerId) {
      const cur = byPlayer.get(e.playerId) ?? { score: 0, xp: 0 };
      cur.score += e.points;
      cur.xp += e.xp;
      byPlayer.set(e.playerId, cur);
    }
    if (e.teamId) byTeam.set(e.teamId, (byTeam.get(e.teamId) ?? 0) + e.points);
  }
  for (const [playerId, r] of byPlayer) {
    await db.playerDrillResult.create({
      data: { runId: run.id, playerId, drillScore: r.score, xp: r.xp },
    });
    await db.player.update({
      where: { id: playerId },
      data: { xpTotal: { increment: r.xp } },
    });
  }
  for (const [teamId, score] of byTeam) {
    await db.teamDrillResult.create({ data: { runId: run.id, teamId, drillScore: score } });
  }

  const sd = await db.sessionDrill.update({
    where: { id: input.sessionDrillId },
    data: { status: "done" },
  });
  await db.drill.updateMany({
    where: { id: sd.drillId, status: { in: ["aiDraft", "scheduledForTest", "coachApproved", "library"] } },
    data: { status: "tested" },
  });
  revalidateAll();
  return { runId: run.id };
}

/** Post-session review → stored recommendation generated from the scores. */
export async function submitReviewAction(input: {
  runId: string;
  easeOfExplanation: number;
  playerEnjoyment: number;
  objectiveAchieved: number;
  scoringClarity: number;
  operationalEase: number;
  contentQuality: number;
  safety: number;
  actualDurationMin: number;
  attemptsPerPlayer: number;
  queueIssue: boolean;
  notes: string;
  runAgain: boolean;
}) {
  const recommendation = buildReviewRecommendation(input);
  await db.drillReview.create({
    data: { ...input, recommendation },
  });
  const run = await db.drillRun.findUniqueOrThrow({
    where: { id: input.runId },
    include: { sessionDrill: true },
  });
  const avg =
    (input.easeOfExplanation +
      input.playerEnjoyment +
      input.objectiveAchieved +
      input.scoringClarity +
      input.operationalEase +
      input.safety) /
    6;
  await db.drill.update({
    where: { id: run.sessionDrill.drillId },
    data: {
      status: input.runAgain && avg >= 4 && !input.queueIssue ? "verified" : "needsModification",
    },
  });
  revalidateAll();
  return { recommendation };
}

/** Local, score-driven recommendation — assembled, never static (spec §22). */
function buildReviewRecommendation(r: {
  easeOfExplanation: number;
  playerEnjoyment: number;
  scoringClarity: number;
  operationalEase: number;
  attemptsPerPlayer: number;
  queueIssue: boolean;
  runAgain: boolean;
}): string {
  const fixes: string[] = [];
  if (r.queueIssue || r.attemptsPerPlayer < 3)
    fixes.push("add a second station or raise active players to lift attempts");
  if (r.scoringClarity <= 3)
    fixes.push("cut the scoring events down to three to simplify live scoring");
  if (r.easeOfExplanation <= 3)
    fixes.push("trim the rule count and demo one round before playing");
  if (r.operationalEase <= 3) fixes.push("pre-stage equipment to cut transitions");
  if (r.playerEnjoyment <= 3)
    fixes.push("add a bonus target or comeback rule to raise stakes");
  if (fixes.length === 0) {
    return r.runAgain
      ? "Strong run — keep the format unchanged and consider promoting this drill to the verified library."
      : "Scores are healthy; re-run once more before deciding its future.";
  }
  const lead = fixes.slice(0, 3);
  return (
    lead.join("; ").replace(/^./, (c) => c.toUpperCase()) +
    ". This should " +
    (r.attemptsPerPlayer < 3 || r.queueIssue
      ? "increase attempts and "
      : "") +
    "simplify the next run."
  );
}
