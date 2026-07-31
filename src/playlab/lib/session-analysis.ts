/** Session analysis engine — what do the selected drills collectively overuse
 *  or omit? Generates the balance panel and a dynamic recommendation (spec §8). */
import { calculateFlow } from "./player-flow";
import type { DrillView, SessionContext, SessionDimension } from "@/playlab/types";
import { ALL_DIMENSIONS } from "@/playlab/types";

export interface DimensionReading {
  dimension: SessionDimension;
  total: number;
  level: "missing" | "adequate" | "over";
}

export interface SessionBalance {
  readings: DimensionReading[];
  missing: SessionDimension[];
  adequate: SessionDimension[];
  over: SessionDimension[];
  intensityMix: Record<"Low" | "Medium" | "High", number>;
  intensityConcern: string | null;
  duplicatedMechanics: string[];
  queueRisks: { drill: string; waitingSec: number }[];
  competitionBalance: {
    individual: number;
    team: number;
    verdict: "balanced" | "team-heavy" | "individual-heavy";
  };
  recommendation: string;
}

const LABELS: Record<SessionDimension, string> = {
  passing: "passing",
  finishing: "finishing",
  dribbling: "dribbling",
  defending: "defending",
  firstTouch: "first touch",
  scanning: "scanning",
  decisionMaking: "decision making",
  physicalIntensity: "physical intensity",
  individualCompetition: "individual competition",
  teamCompetition: "team competition",
  oppositionPressure: "opposition pressure",
  contentPotential: "content potential",
  playerRepetitions: "player repetitions",
};

export const dimensionLabel = (d: SessionDimension) => LABELS[d];

export function analyseSession(
  drills: DrillView[],
  context: SessionContext
): SessionBalance {
  const n = Math.max(1, drills.length);
  // Thresholds scale with drill count: a dimension is "adequate" when it
  // averages ~1.3+ per drill and "over" beyond ~3 per drill.
  const missingBelow = 1.3 * n;
  const overAbove = 3 * n;

  const readings: DimensionReading[] = ALL_DIMENSIONS.map((dimension) => {
    const total = drills.reduce((s, d) => s + (d.objectives[dimension] ?? 0), 0);
    const level =
      total < missingBelow ? "missing" : total > overAbove ? "over" : "adequate";
    return { dimension, total, level };
  });

  const missing = readings.filter((r) => r.level === "missing").map((r) => r.dimension);
  const adequate = readings.filter((r) => r.level === "adequate").map((r) => r.dimension);
  const over = readings.filter((r) => r.level === "over").map((r) => r.dimension);

  const intensityMix = { Low: 0, Medium: 0, High: 0 };
  for (const d of drills) intensityMix[d.intensity] += 1;
  let intensityConcern: string | null = null;
  if (drills.length >= 2 && intensityMix.High === drills.length) {
    intensityConcern = "Every drill is high intensity — players will fade before the final block.";
  } else if (drills.length >= 2 && intensityMix.Low === drills.length) {
    intensityConcern = `Every drill is low intensity, but the session targets ${context.targetIntensity}.`;
  }

  const mechanicCount = new Map<string, number>();
  for (const d of drills)
    for (const m of d.mechanics)
      mechanicCount.set(m, (mechanicCount.get(m) ?? 0) + 1);
  const duplicatedMechanics = [...mechanicCount.entries()]
    .filter(([, c]) => c >= 2)
    .map(([m]) => m);

  const queueRisks = drills
    .map((d) => ({ drill: d.name, flow: calculateFlow(d.constraints) }))
    .filter((x) => x.flow.flowStatus === "poor")
    .map((x) => ({ drill: x.drill, waitingSec: x.flow.waitingSec }));

  const individual = drills.reduce(
    (s, d) => s + (d.objectives.individualCompetition ?? 0),
    0
  );
  const team = drills.reduce((s, d) => s + (d.objectives.teamCompetition ?? 0), 0);
  const verdict =
    team > individual * 2
      ? "team-heavy"
      : individual > team * 2
        ? "individual-heavy"
        : "balanced";

  return {
    readings,
    missing,
    adequate,
    over,
    intensityMix,
    intensityConcern,
    duplicatedMechanics,
    queueRisks,
    competitionBalance: { individual, team, verdict },
    recommendation: buildRecommendation({
      missing,
      over,
      verdict,
      duplicatedMechanics,
      queueRisks,
      context,
    }),
  };
}

/** Assemble a coach-readable recommendation from the computed gaps — never a
 *  static string. */
function buildRecommendation(input: {
  missing: SessionDimension[];
  over: SessionDimension[];
  verdict: "balanced" | "team-heavy" | "individual-heavy";
  duplicatedMechanics: string[];
  queueRisks: { drill: string; waitingSec: number }[];
  context: SessionContext;
}): string {
  const { missing, over, verdict, duplicatedMechanics, queueRisks } = input;
  const parts: string[] = [];

  if (over.length > 0) {
    parts.push(
      `This session is strong on ${over
        .slice(0, 2)
        .map(dimensionLabel)
        .join(" and ")}`
    );
  }
  const coreGaps = missing.filter((m) =>
    ["defending", "finishing", "oppositionPressure", "individualCompetition", "scanning", "dribbling", "firstTouch"].includes(m)
  );
  if (coreGaps.length > 0) {
    const gapText = coreGaps.slice(0, 3).map(dimensionLabel).join(", ");
    parts.push(
      parts.length > 0 ? `but limited on ${gapText}` : `Coverage is limited on ${gapText}`
    );
    const suggestion: string[] = [];
    if (coreGaps.includes("finishing")) suggestion.push("a finishing drill");
    else if (coreGaps.includes("defending") || coreGaps.includes("oppositionPressure"))
      suggestion.push("a drill with active defenders");
    else suggestion.push(`a ${dimensionLabel(coreGaps[0])} game`);
    if (coreGaps.includes("individualCompetition") || verdict === "team-heavy")
      suggestion.push("a personal leaderboard");
    parts.push(`— consider adding ${suggestion.join(" with ")}`);
  } else if (verdict !== "balanced") {
    parts.push(
      verdict === "team-heavy"
        ? "— add an individual-scoring game to balance the team competition"
        : "— add a team format to balance the individual competition"
    );
  }
  if (queueRisks.length > 0) {
    parts.push(
      `. ${queueRisks[0].drill} risks ~${queueRisks[0].waitingSec}s queues — add a station or raise active players`
    );
  }
  if (duplicatedMechanics.length > 0) {
    parts.push(
      `. "${duplicatedMechanics[0]}" repeats across drills — vary the mechanics to keep novelty high`
    );
  }
  if (parts.length === 0) {
    return "The selected drills cover the session objectives well — no structural gaps detected.";
  }
  return parts.join(" ").replace(/\s+\./g, ".") + ".";
}
