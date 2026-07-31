/** Drill generation engine (spec §9–10).
 *
 * Deterministic template composition:
 *   primary objective + competition format + engagement mechanics
 *   + equipment constraint + session gap + scoring structure = concept.
 *
 * Seeded by a hash of the inputs → same inputs always produce the same three
 * concepts (demo-reproducible). `DrillConceptProvider` is the seam where a
 * real AI model can be plugged in later without touching the UI.
 */
import { hashString, mulberry32, pick, pickN } from "./rng";
import { calculateFlow } from "./player-flow";
import { analyseSession, dimensionLabel } from "./session-analysis";
import type {
  CompetitionFormat,
  DrillConstraints,
  DrillRule,
  DrillView,
  EngagementMechanic,
  ExperienceTag,
  FootballObjective,
  GeneratedDrillConcept,
  ScoringRule,
  SessionContext,
  SessionDimension,
  XPEvent,
} from "@/types";

export interface DrillGenerationInput {
  sessionContext: SessionContext;
  selectedDrills: DrillView[];
  primaryObjective: FootballObjective;
  secondaryObjectives: FootballObjective[];
  reason: string;
  desiredExperience: ExperienceTag[];
  competitionFormat: CompetitionFormat;
  engagementMechanics: EngagementMechanic[];
  constraints: DrillConstraints;
}

/** Future AI seam: swap `localDrillProvider` for a model-backed provider. */
export interface DrillConceptProvider {
  generate(input: DrillGenerationInput): Promise<GeneratedDrillConcept[]>;
}

export const localDrillProvider: DrillConceptProvider = {
  async generate(input) {
    return generateDrillConcepts(input);
  },
};

/* ------------------------------ templates -------------------------------- */

const NAME_CORES: Record<FootballObjective, string[]> = {
  passing: ["Gate", "Corridor", "Tempo", "Link-Up", "Switchboard"],
  finishing: ["Strike", "Snapshot", "Colour Call", "Rebound", "Six-Goal"],
  dribbling: ["Slalom", "Escape", "Maze", "Takedown", "Gauntlet"],
  defending: ["Lockdown", "Interceptor", "Wall", "Shadow", "Jackpot"],
  firstTouch: ["First-Touch", "Cushion", "Trap", "Velvet", "Control"],
  scanning: ["Radar", "Look-Up", "Periscope", "Signal", "Head-Check"],
  decisionMaking: ["Split-Call", "Crossroads", "Option", "Trigger", "Verdict"],
};

const FORMAT_SUFFIX: Partial<Record<CompetitionFormat, string>> = {
  knockout: "Knockout",
  survival: "Survival",
  relay: "Relay",
  "king of the court": "Crown",
  "sudden death": "Showdown",
  "target score": "Race",
  "personal best": "Record Run",
  "progressive levels": "Ladder",
};

const GENERIC_SUFFIX = ["Challenge", "Clash", "Arena", "League", "Duel"];
const EXPERIMENTAL_PREFIX = ["Mystery", "Chaos", "Shadow", "Twin", "Flux"];

const OBJECTIVE_EVENTS: Record<
  FootballObjective,
  { eventType: string; label: string; points: number }
> = {
  passing: { eventType: "completedPass", label: "Completed pattern pass", points: 1 },
  finishing: { eventType: "goal", label: "Goal", points: 1 },
  dribbling: { eventType: "custom", label: "Beaten defender", points: 1 },
  defending: { eventType: "interception", label: "Interception", points: 1 },
  firstTouch: { eventType: "custom", label: "Clean first touch into space", points: 1 },
  scanning: { eventType: "custom", label: "Scan-then-play completion", points: 1 },
  decisionMaking: { eventType: "custom", label: "Correct option taken", points: 1 },
};

const OBJECTIVE_DIMENSION: Record<FootballObjective, SessionDimension> = {
  passing: "passing",
  finishing: "finishing",
  dribbling: "dribbling",
  defending: "defending",
  firstTouch: "firstTouch",
  scanning: "scanning",
  decisionMaking: "decisionMaking",
};

/* ----------------------------- rule factory ------------------------------ */

let ruleSeq = 0;
const rid = (slug: string) => `r-${slug}-${++ruleSeq}`;

function baseRules(
  input: DrillGenerationInput,
  concept: "reliable" | "matchfit" | "experimental"
): DrillRule[] {
  const rules: DrillRule[] = [];
  const teamFormat = /team|relay|king|territory/.test(input.competitionFormat);

  rules.push({
    id: rid("start"),
    category: "start",
    title: "Coach-trigger start",
    description:
      concept === "experimental"
        ? "Rounds start on a random coach call — colour, number or name."
        : "Each round starts on the coach's whistle from the marked zones.",
    enabled: true,
    parameters: { randomisedStart: concept === "experimental" },
  });

  const limitedTouches: DrillRule = {
    id: rid("touch"),
    category: "action",
    title: "Limited touches",
    description: "Players may use a maximum number of touches per action.",
    enabled: concept !== "reliable",
    parameters: { maxTouches: concept === "experimental" ? 2 : 3 },
  };
  const unlimitedTouches: DrillRule = {
    id: rid("touch-free"),
    category: "action",
    title: "Unlimited touches",
    description: "No touch restriction — free play.",
    enabled: concept === "reliable",
    parameters: { unlimitedTouches: true },
    conflictsWith: [limitedTouches.id],
  };
  limitedTouches.conflictsWith = [unlimitedTouches.id];
  rules.push(limitedTouches, unlimitedTouches);

  const weakFoot: DrillRule = {
    id: rid("weakfoot"),
    category: "action",
    title: "Weak-foot attempts",
    description: "Attempts with the weak foot are flagged and rewarded.",
    enabled: concept === "matchfit",
    parameters: { required: false },
  };
  rules.push(weakFoot);

  rules.push({
    id: rid("success"),
    category: "success",
    title: teamFormat ? "First team to target score" : "Highest score when time ends",
    description: teamFormat
      ? "A round ends when a team reaches the target score."
      : "The round ends on the countdown; highest score wins.",
    enabled: true,
    parameters: { endsRound: true, targetScore: teamFormat ? 5 : 0 },
  });

  if (input.engagementMechanics.includes("streak bonus") || concept === "matchfit") {
    rules.push({
      id: rid("streak"),
      category: "bonus",
      title: "Streak bonus",
      description: "Three successful actions in a row earn bonus points.",
      enabled: true,
      parameters: { streakLength: 3, bonusPoints: 2 },
    });
    rules.push({
      id: rid("wf-streak"),
      category: "bonus",
      title: "Weak-foot streak bonus",
      description: "A streak completed entirely on the weak foot doubles the streak bonus.",
      enabled: false,
      parameters: { multiplier: 2 },
      dependencies: [weakFoot.id],
    });
  }

  rules.push({
    id: rid("penalty"),
    category: "penalty",
    title: "Ball out of area",
    description: "Losing the ball out of the marked area concedes possession and 1 point.",
    enabled: true,
    parameters: { penaltyPoints: 1 },
  });

  rules.push({
    id: rid("prog"),
    category: "progression",
    title: concept === "reliable" ? "Reduce time per round" : "Add active defender",
    description:
      concept === "reliable"
        ? "Shorten each round as players succeed."
        : "Introduce a live defender once success rate passes 60%.",
    enabled: false,
    parameters: concept === "reliable" ? { secondsCut: 10 } : { defenders: 1 },
  });

  rules.push({
    id: rid("tiebreak"),
    category: "tiebreak",
    title: "Sudden-death tie-break",
    description: "Level scores go to a single sudden-death attempt.",
    enabled:
      input.engagementMechanics.includes("sudden death") || concept !== "reliable",
    parameters: { suddenDeath: true },
  });

  return rules;
}

function mechanicRules(mechanics: EngagementMechanic[]): DrillRule[] {
  const out: DrillRule[] = [];
  for (const m of mechanics) {
    switch (m) {
      case "limited attempts":
        out.push({
          id: rid("attempts"),
          category: "action",
          title: "Limited attempts",
          description: "Each player has a fixed number of attempts per round.",
          enabled: true,
          parameters: { attempts: 3 },
        });
        break;
      case "random target":
        out.push({
          id: rid("random-target"),
          category: "start",
          title: "Random target call",
          description: "The scoring target is announced only as the round starts.",
          enabled: true,
          parameters: { targets: 3 },
        });
        break;
      case "comeback rule":
        out.push({
          id: rid("comeback"),
          category: "bonus",
          title: "Comeback multiplier",
          description: "The trailing side scores double until level.",
          enabled: true,
          parameters: { multiplier: 2 },
        });
        break;
      case "elimination":
        out.push({
          id: rid("elim"),
          category: "success",
          title: "Elimination",
          description: "Lowest scorer each round is eliminated.",
          enabled: true,
          parameters: { endsRound: false, eliminatedPerRound: 1 },
        });
        break;
      case "territory capture":
        out.push({
          id: rid("territory"),
          category: "success",
          title: "Territory capture",
          description: "Held zones score each 30 seconds.",
          enabled: true,
          parameters: { zones: 3, tickSeconds: 30 },
        });
        break;
      case "mystery event":
        out.push({
          id: rid("mystery"),
          category: "start",
          title: "Mystery event",
          description: "A hidden rule card flips mid-round and changes scoring.",
          enabled: true,
          parameters: { flipAtSec: 60 },
        });
        break;
      default:
        break;
    }
  }
  return out;
}

function scoringFor(
  input: DrillGenerationInput,
  concept: "reliable" | "matchfit" | "experimental",
  mechanics: EngagementMechanic[]
): ScoringRule[] {
  const base = OBJECTIVE_EVENTS[input.primaryObjective];
  const teamFormat = /team|relay|king|territory/.test(input.competitionFormat);
  const rules: ScoringRule[] = [
    {
      id: rid("s-base"),
      eventType: base.eventType,
      label: base.label,
      points: base.points,
      appliesTo: "player",
      enabled: true,
    },
  ];
  if (mechanics.includes("bonus target") || concept !== "reliable") {
    rules.push({
      id: rid("s-target"),
      eventType: "targetHit",
      label: "Bonus target hit",
      points: 2,
      appliesTo: "player",
      enabled: true,
    });
  }
  if (input.secondaryObjectives.includes("defending") || concept === "experimental") {
    rules.push({
      id: rid("s-int"),
      eventType: "interception",
      label: "Defender interception",
      points: 1,
      appliesTo: "player",
      enabled: true,
    });
  }
  if (mechanics.includes("streak bonus") || concept === "matchfit") {
    rules.push({
      id: rid("s-streak"),
      eventType: "streak",
      label: "Three-action streak",
      points: 2,
      appliesTo: "player",
      maxOccurrences: 3,
      enabled: true,
    });
  }
  rules.push({
    id: rid("s-round"),
    eventType: "roundWin",
    label: teamFormat ? "Team round win" : "Round win",
    points: 3,
    appliesTo: teamFormat ? "team" : "player",
    enabled: true,
  });
  return rules;
}

function xpFor(
  input: DrillGenerationInput,
  concept: "reliable" | "matchfit" | "experimental"
): XPEvent[] {
  const teamFormat = /team|relay|king|territory/.test(input.competitionFormat);
  const base = OBJECTIVE_EVENTS[input.primaryObjective];
  const xp: XPEvent[] = [
    {
      id: rid("xp-part"),
      sourceEventType: "participation",
      label: "Participation",
      xp: 10,
      category: "participation",
      enabled: true,
    },
    {
      id: rid("xp-skill"),
      sourceEventType: base.eventType,
      label: `Skill objective — ${base.label.toLowerCase()}`,
      xp: 5,
      category: "performance",
      dailyCap: 3,
      enabled: true,
    },
    {
      id: rid("xp-pb"),
      sourceEventType: "targetHit",
      label: "Personal best",
      xp: 20,
      category: "personalBest",
      dailyCap: 1,
      enabled: concept !== "reliable",
    },
  ];
  if (teamFormat) {
    xp.push({
      id: rid("xp-team"),
      sourceEventType: "roundWin",
      label: "Team round win",
      xp: 10,
      category: "teamwork",
      dailyCap: 2,
      enabled: true,
    });
  }
  xp.push({
    id: rid("xp-fair"),
    sourceEventType: "fairPlay",
    label: "Fair play",
    xp: 5,
    category: "fairPlay",
    dailyCap: 1,
    enabled: true,
  });
  return xp;
}

/* ------------------------------ generator -------------------------------- */

export function generateDrillConcepts(
  input: DrillGenerationInput
): GeneratedDrillConcept[] {
  const seed = hashString(
    [
      input.primaryObjective,
      input.competitionFormat,
      ...input.engagementMechanics,
      ...input.desiredExperience,
      input.constraints.players,
      input.constraints.durationMin,
      input.reason,
    ].join("|")
  );
  const rand = mulberry32(seed);
  const balance = analyseSession(input.selectedDrills, input.sessionContext);
  const gaps = balance.missing;

  const types: Array<"reliable" | "matchfit" | "experimental"> = [
    "reliable",
    "matchfit",
    "experimental",
  ];
  return types.map((conceptType) =>
    buildConcept(input, conceptType, rand, gaps)
  );
}

function buildConcept(
  input: DrillGenerationInput,
  conceptType: "reliable" | "matchfit" | "experimental",
  rand: () => number,
  gaps: SessionDimension[]
): GeneratedDrillConcept {
  const core = pick(rand, NAME_CORES[input.primaryObjective]);
  const suffix =
    FORMAT_SUFFIX[input.competitionFormat] ?? pick(rand, GENERIC_SUFFIX);
  const name =
    conceptType === "experimental"
      ? `${pick(rand, EXPERIMENTAL_PREFIX)} ${core} ${suffix}`
      : conceptType === "matchfit"
        ? `${core} ${suffix}`
        : `${core} ${suffix} (Core)`;

  // Mechanics: reliable trims to 2, matchfit uses picks + spectacle, experimental adds a wildcard.
  const chosen = [...input.engagementMechanics];
  let mechanics: EngagementMechanic[];
  if (conceptType === "reliable") {
    mechanics = chosen.slice(0, 2);
    if (!mechanics.includes("visible score")) mechanics.unshift("visible score");
  } else if (conceptType === "matchfit") {
    mechanics = [...new Set<EngagementMechanic>([...chosen, "visible score", "bonus target"])].slice(0, 5);
  } else {
    const wild = pickN(
      rand,
      (["mystery event", "territory capture", "elimination", "comeback rule"] as EngagementMechanic[]).filter(
        (m) => !chosen.includes(m)
      ),
      1
    );
    mechanics = [...new Set<EngagementMechanic>([...chosen, ...wild])].slice(0, 6);
  }

  // Constraints per concept: reliable maximises flow.
  const constraints: DrillConstraints = { ...input.constraints };
  if (conceptType === "reliable") {
    constraints.stations = Math.max(constraints.stations, 2);
    constraints.activePlayersPerRound = Math.max(constraints.activePlayersPerRound, 4);
    constraints.roundSec = Math.min(constraints.roundSec, 90);
  }
  if (conceptType === "experimental") {
    constraints.roundSec = Math.max(60, constraints.roundSec);
  }

  ruleSeq = 0; // stable ids per concept
  const rules = [...baseRules(input, conceptType), ...mechanicRules(mechanics)];
  const scoringRules = scoringFor(input, conceptType, mechanics);
  const xpEvents = xpFor(input, conceptType);
  const metrics = calculateFlow(constraints);

  const objectives: Partial<Record<SessionDimension, number>> = {
    [OBJECTIVE_DIMENSION[input.primaryObjective]]: conceptType === "reliable" ? 4 : 5,
    physicalIntensity:
      constraints.intensity === "High" ? 4 : constraints.intensity === "Medium" ? 3 : 1,
    contentPotential: conceptType === "matchfit" ? 5 : conceptType === "experimental" ? 4 : 2,
    playerRepetitions: metrics.flowStatus === "healthy" ? 4 : metrics.flowStatus === "moderate" ? 3 : 1,
  };
  for (const o of input.secondaryObjectives) {
    objectives[OBJECTIVE_DIMENSION[o]] = Math.max(objectives[OBJECTIVE_DIMENSION[o]] ?? 0, 3);
  }
  const teamFormat = /team|relay|king|territory/.test(input.competitionFormat);
  objectives.teamCompetition = teamFormat ? 4 : 1;
  objectives.individualCompetition = teamFormat ? 2 : 4;
  if (input.secondaryObjectives.includes("defending") || conceptType === "experimental") {
    objectives.oppositionPressure = 3;
  }

  // Gap coverage → selection score + fit explanation.
  const covered = gaps.filter((g) => (objectives[g] ?? 0) >= 3);
  const novelty =
    conceptType === "reliable"
      ? 0.35 + rand() * 0.2
      : conceptType === "matchfit"
        ? 0.6 + rand() * 0.25
        : 0.85 + rand() * 0.13;
  const flowBonus =
    metrics.flowStatus === "healthy" ? 8 : metrics.flowStatus === "moderate" ? 3 : -8;
  const selectionScore = Math.round(
    (55 + Math.min(24, covered.length * 6) + novelty * 10 + flowBonus) * 10
  ) / 10;

  const fitBits: string[] = [];
  if (covered.length > 0) {
    fitBits.push(
      `fills the session's ${covered.slice(0, 3).map(dimensionLabel).join(", ")} gap${covered.length > 1 ? "s" : ""}`
    );
  }
  fitBits.push(
    metrics.flowStatus === "healthy"
      ? `keeps ${Math.round(metrics.participationRatio * 100)}% of players active`
      : `runs at ${Math.round(metrics.participationRatio * 100)}% participation — plan rotations`
  );
  if (conceptType === "matchfit") fitBits.push("built for a filmable finale moment");
  if (conceptType === "experimental") fitBits.push("untested format — schedule a trial");

  const equipment = input.sessionContext.equipment.filter((e) =>
    /ball|cone|bib|goal|ring|board/i.test(e)
  );

  return {
    name,
    conceptType,
    summary: buildSummary(input, conceptType, mechanics),
    footballObjectives: [input.primaryObjective, ...input.secondaryObjectives],
    setupInstructions: buildSetup(input, constraints, mechanics),
    rules,
    scoringRules,
    rotationPlan: {
      groups: `${constraints.teams} groups of ${Math.ceil(constraints.players / Math.max(1, constraints.teams))}`,
      activePerRound: constraints.activePlayersPerRound * Math.max(1, constraints.stations),
      restPattern:
        metrics.flowStatus === "healthy"
          ? "next group loads during transition — continuous flow"
          : "rotate on the whistle; resting players retrieve balls",
    },
    progression:
      conceptType === "reliable"
        ? ["Cut round time by 10s", "Narrow the target zones", "Add a passive defender"]
        : ["Add a second live defender", "Reduce touches to one", "Raise the target score"],
    regression: ["Widen targets", "Add a touch", "Slow the trigger calls"],
    safetyNotes:
      constraints.contactLevel === "full"
        ? ["Full contact — enforce studs-down challenges and matched pairings."]
        : ["Light/no contact — penalise shirt pulls and blind-side charges."],
    contentMoment:
      conceptType === "matchfit"
        ? "Final round doubles points with the whole group watching one lane — film it."
        : conceptType === "experimental"
          ? "The mystery rule flip mid-round is the clip — capture reactions."
          : "Fastest clean round of the day goes on the leaderboard wall.",
    xpEvents,
    estimatedMetrics: metrics,
    sessionFitExplanation: capitalise(fitBits.join("; ") + "."),
    selectionScore,
    mechanics,
    novelty: Math.round(novelty * 100) / 100,
    intensity: constraints.intensity,
    complexity:
      rules.filter((r) => r.enabled).length > 7
        ? "Complex"
        : rules.filter((r) => r.enabled).length > 4
          ? "Moderate"
          : "Simple",
    space: constraints.pitchSize,
    equipment: equipment.length > 0 ? equipment : ["balls", "cones"],
    objectives,
    constraints,
  };
}

function buildSummary(
  input: DrillGenerationInput,
  conceptType: "reliable" | "matchfit" | "experimental",
  mechanics: EngagementMechanic[]
): string {
  const obj = input.primaryObjective.replace(/([A-Z])/g, " $1").toLowerCase();
  const mech = mechanics.slice(0, 2).join(" and ");
  if (conceptType === "reliable")
    return `High-repetition ${obj} game in a ${input.competitionFormat} format — simple setup, ${mech} keep it competitive.`;
  if (conceptType === "matchfit")
    return `Full-spectacle ${obj} battle: ${input.competitionFormat} with ${mech} building to a doubled final round.`;
  return `Experimental ${obj} format where ${mech} rewrite the game mid-round — high novelty, needs a live test.`;
}

function buildSetup(
  input: DrillGenerationInput,
  c: DrillConstraints,
  mechanics: EngagementMechanic[]
): string[] {
  const steps = [
    `Mark a ${c.pitchSize.toLowerCase()} area with cones; split ${c.players} players into ${c.teams} teams.`,
    `Set ${Math.max(1, c.stations)} station${c.stations > 1 ? "s" : ""} with ${c.activePlayersPerRound} active player${c.activePlayersPerRound > 1 ? "s" : ""} each.`,
    `Stage balls at each station for instant restarts (${input.sessionContext.equipment[0] ?? "18 footballs"} available).`,
  ];
  if (mechanics.includes("random target") || mechanics.includes("bonus target"))
    steps.push("Colour-code the targets; keep one bonus target visibly marked.");
  if (mechanics.includes("territory capture"))
    steps.push("Divide the area into three capture zones with bibs as markers.");
  steps.push(`Brief the scoring in under ${c.setupMin} minute${c.setupMin > 1 ? "s" : ""} using the live-scoring screen.`);
  return steps;
}

const capitalise = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
