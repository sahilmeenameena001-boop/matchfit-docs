/** Seed drill library — 14 drills across the five pillars (spec §24–25).
 *  The three session drills + Colour Call Finish carry full rule/scoring/XP
 *  sets; the rest carry meaningful defaults. */
import type {
  DrillConstraints,
  DrillRule,
  ScoringRule,
  SessionDimension,
  XPEvent,
} from "@/types";

export interface SeedDrill {
  id: string;
  name: string;
  pillar: string;
  status: string;
  summary: string;
  novelty: number;
  intensity: "Low" | "Medium" | "High";
  complexity: "Simple" | "Moderate" | "Complex";
  space: "Small" | "Medium" | "Large";
  conceptType?: "reliable" | "matchfit" | "experimental";
  equipment: string[];
  mechanics: string[];
  objectives: Partial<Record<SessionDimension, number>>;
  constraints: Partial<DrillConstraints>;
  setup: string[];
  progression: string[];
  regression: string[];
  safety: string[];
  contentMoment: string;
  rules: DrillRule[];
  scoring: ScoringRule[];
  xp: XPEvent[];
}

export const P = {
  gamified: "Gamified Football Drills",
  footy: "Footy Training",
  oneVone: "One-v-One Duels",
  cluster: "Small Cluster Football",
  physio: "Physiotherapy, Core & Corrective Movement",
};

const std = (
  id: string,
  primary: { eventType: string; label: string; points?: number },
  opts: { team?: boolean; pb?: boolean } = {}
): { scoring: ScoringRule[]; xp: XPEvent[] } => ({
  scoring: [
    {
      id: `${id}-s1`,
      eventType: primary.eventType,
      label: primary.label,
      points: primary.points ?? 1,
      appliesTo: "player",
      enabled: true,
    },
    {
      id: `${id}-s2`,
      eventType: "targetHit",
      label: "Bonus target",
      points: 2,
      appliesTo: "player",
      enabled: true,
    },
    {
      id: `${id}-s3`,
      eventType: "roundWin",
      label: opts.team ? "Team round win" : "Round win",
      points: 3,
      appliesTo: opts.team ? "team" : "player",
      enabled: true,
    },
  ],
  xp: [
    {
      id: `${id}-x1`,
      sourceEventType: "participation",
      label: "Participation",
      xp: 10,
      category: "participation",
      enabled: true,
    },
    {
      id: `${id}-x2`,
      sourceEventType: primary.eventType,
      label: `Skill objective — ${primary.label.toLowerCase()}`,
      xp: 5,
      category: "performance",
      dailyCap: 3,
      enabled: true,
    },
    ...(opts.pb
      ? [
          {
            id: `${id}-x3`,
            sourceEventType: "targetHit",
            label: "Personal best",
            xp: 20,
            category: "personalBest" as const,
            dailyCap: 1,
            enabled: true,
          },
        ]
      : []),
    ...(opts.team
      ? [
          {
            id: `${id}-x4`,
            sourceEventType: "roundWin",
            label: "Team win",
            xp: 10,
            category: "teamwork" as const,
            dailyCap: 2,
            enabled: true,
          },
        ]
      : []),
  ],
});

const rule = (
  id: string,
  category: DrillRule["category"],
  title: string,
  description: string,
  parameters: DrillRule["parameters"] = {},
  extra: Partial<DrillRule> = {}
): DrillRule => ({
  id,
  category,
  title,
  description,
  enabled: true,
  parameters,
  ...extra,
});

/* ------------------------- full example: §34 ------------------------------ */

const colourCall: SeedDrill = {
  id: "d-colour-call",
  name: "Colour Call Finish",
  pillar: P.gamified,
  status: "library",
  summary:
    "Coach calls a colour; first player in each lane receives, turns and finishes into the matching mini-goal.",
  novelty: 0.7,
  intensity: "Medium",
  complexity: "Moderate",
  space: "Medium",
  equipment: ["balls", "cones", "6 mini-goals", "bibs"],
  mechanics: ["random target", "visible score", "streak bonus", "sudden death"],
  objectives: {
    finishing: 5,
    firstTouch: 4,
    scanning: 4,
    decisionMaking: 3,
    individualCompetition: 4,
    teamCompetition: 3,
    physicalIntensity: 3,
    contentPotential: 4,
    playerRepetitions: 3,
    oppositionPressure: 1,
  },
  constraints: {
    players: 18,
    teams: 3,
    activePlayersPerRound: 3,
    durationMin: 12,
    roundSec: 40,
    transitionSec: 15,
    stations: 3,
    pitchSize: "Medium",
    setupMin: 4,
    coachCount: 1,
    intensity: "Medium",
    contactLevel: "light",
  },
  setup: [
    "Three finishing lanes, each facing two colour-coded mini-goals.",
    "Feeder at the top of each lane with a ball supply.",
    "First player in each lane starts on the centre cone.",
    "Coach stands where all three lanes can hear the colour call.",
  ],
  progression: [
    "Add an active defender behind each receiver",
    "Switch to one-touch finishes",
    "Call two colours — second call cancels the first",
  ],
  regression: ["Fixed target instead of a call", "Allow unlimited touches", "Shorten the lane"],
  safety: ["Lanes stay parallel — no crossing runs between lanes."],
  contentMoment: "Sudden-death colour call with all 18 watching one lane.",
  rules: [
    rule("ccf-r1", "start", "Colour-call start", "Round starts when the coach calls a colour; receivers break from the cone.", { randomisedStart: true }),
    rule("ccf-r2", "action", "Two-touch finish", "Receive and finish in a maximum of two touches.", { maxTouches: 2 }, { conflictsWith: ["ccf-r3"] }),
    rule("ccf-r3", "action", "Unlimited touches", "No touch restriction — free finish.", { unlimitedTouches: true }, { enabled: false, conflictsWith: ["ccf-r2"] }),
    rule("ccf-r4", "action", "Weak-foot attempts", "Attempts on the weak foot are flagged for bonus scoring.", { required: false }, { enabled: false }),
    rule("ccf-r5", "action", "Active defender", "A recovering defender presses the receiver from behind.", { defenders: 1 }, { enabled: false }),
    rule("ccf-r6", "success", "Correct-colour goal", "Only the called colour counts as a full score; wrong target scores zero.", { endsRound: false }),
    rule("ccf-r7", "bonus", "First-time finish bonus", "A first-time finish earns +1.", { bonusPoints: 1 }),
    rule("ccf-r8", "bonus", "Weak-foot streak bonus", "Three weak-foot goals in a row doubles the streak bonus.", { multiplier: 2 }, { enabled: false, dependencies: ["ccf-r4"] }),
    rule("ccf-r9", "penalty", "Wrong target", "Finishing into the wrong colour concedes 1 point.", { penaltyPoints: 1 }),
    rule("ccf-r10", "progression", "Narrow the goals", "Halve the target width once success passes 60%.", { widthFactor: 0.5 }, { enabled: false }),
    rule("ccf-r11", "tiebreak", "Sudden death", "Tied lanes go to a single sudden-death call.", { suddenDeath: true }),
  ],
  scoring: [
    { id: "ccf-s1", eventType: "goal", label: "Goal", points: 1, appliesTo: "player", enabled: true },
    { id: "ccf-s2", eventType: "targetHit", label: "Correct colour target", points: 1, appliesTo: "player", enabled: true },
    { id: "ccf-s3", eventType: "custom", label: "Weak-foot finish", points: 1, appliesTo: "player", enabled: true },
    { id: "ccf-s4", eventType: "streak", label: "Three-goal streak", points: 2, appliesTo: "player", maxOccurrences: 3, enabled: true },
    { id: "ccf-s5", eventType: "interception", label: "Defender interception", points: 1, appliesTo: "player", enabled: true },
    { id: "ccf-s6", eventType: "roundWin", label: "Round win", points: 3, appliesTo: "team", enabled: true },
  ],
  xp: [
    { id: "ccf-x1", sourceEventType: "participation", label: "Participation", xp: 10, category: "participation", enabled: true },
    { id: "ccf-x2", sourceEventType: "custom", label: "First successful weak-foot goal", xp: 15, category: "performance", dailyCap: 1, enabled: true },
    { id: "ccf-x3", sourceEventType: "targetHit", label: "Personal best", xp: 20, category: "personalBest", dailyCap: 1, enabled: true },
    { id: "ccf-x4", sourceEventType: "roundWin", label: "Team win", xp: 10, category: "teamwork", dailyCap: 2, enabled: true },
    { id: "ccf-x5", sourceEventType: "streak", label: "Streak performance", xp: 10, category: "performance", dailyCap: 1, enabled: true },
    { id: "ccf-x6", sourceEventType: "fairPlay", label: "Fair play", xp: 5, category: "fairPlay", dailyCap: 1, enabled: true },
  ],
};

/* --------------------------- library drills ------------------------------- */

const mk = (
  d: Omit<SeedDrill, "rules" | "scoring" | "xp" | "setup" | "progression" | "regression" | "safety" | "contentMoment"> & {
    primary: { eventType: string; label: string; points?: number };
    team?: boolean;
    pb?: boolean;
    setup?: string[];
    contentMoment?: string;
    rules?: DrillRule[];
  }
): SeedDrill => {
  const { primary, team, pb, rules, ...rest } = d;
  const s = std(d.id, primary, { team, pb });
  return {
    ...rest,
    setup: d.setup ?? [
      "Mark the playing area to the listed space size.",
      "Split players per the constraints and stage the equipment.",
      "Brief the two or three scoring events before starting.",
    ],
    progression: ["Reduce time", "Reduce touches", "Add a defender"],
    regression: ["More time", "Bigger targets", "No defender"],
    safety: ["Match pairings by size and speed; keep spare balls out of lanes."],
    contentMoment: d.contentMoment ?? "Final round doubles points — film the decider.",
    rules:
      rules ??
      [
        rule(`${d.id}-r1`, "start", "Whistle start", "Rounds begin on the coach's whistle.", {}),
        rule(`${d.id}-r2`, "success", "Highest score wins", "Highest score when the countdown ends wins the round.", { endsRound: true }),
        rule(`${d.id}-r3`, "tiebreak", "Sudden death", "Ties go to one sudden-death attempt.", { suddenDeath: true }, { enabled: false }),
      ],
    scoring: s.scoring,
    xp: s.xp,
  };
};

export const SEED_DRILLS: SeedDrill[] = [
  mk({
    id: "d-tictactoe",
    name: "Football Tic-Tac-Toe",
    pillar: P.gamified,
    status: "library",
    summary: "Relay race to claim grid squares with bibs — three in a row wins the board.",
    novelty: 0.9,
    intensity: "Low",
    complexity: "Moderate",
    space: "Small",
    equipment: ["cones", "bibs", "balls"],
    mechanics: ["team vs team", "visible score", "sudden death", "bonus target"],
    objectives: {
      decisionMaking: 4, scanning: 3, teamCompetition: 5, individualCompetition: 1,
      physicalIntensity: 2, contentPotential: 4, playerRepetitions: 3, passing: 1,
    },
    constraints: {
      players: 18, teams: 3, activePlayersPerRound: 6, durationMin: 12, roundSec: 75,
      transitionSec: 20, stations: 3, pitchSize: "Small", setupMin: 3, coachCount: 1,
      intensity: "Low", contactLevel: "none",
    },
    primary: { eventType: "custom", label: "Square claimed" },
    team: true,
    contentMoment: "Blocked board goes to sudden death with both teams sprinting.",
  }),
  mk({
    id: "d-passing-gate",
    name: "Passing Gate Challenge",
    pillar: P.gamified,
    status: "verified",
    summary: "Hit passes through shrinking cone gates against the countdown; the bonus gate pays double.",
    novelty: 0.4,
    intensity: "Medium",
    complexity: "Simple",
    space: "Medium",
    equipment: ["cones", "balls"],
    mechanics: ["countdown", "visible score", "personal best", "bonus target"],
    objectives: {
      passing: 5, firstTouch: 3, scanning: 2, individualCompetition: 3,
      teamCompetition: 2, physicalIntensity: 3, contentPotential: 2, playerRepetitions: 5,
    },
    constraints: {
      players: 18, teams: 3, activePlayersPerRound: 6, durationMin: 15, roundSec: 60,
      transitionSec: 15, stations: 3, pitchSize: "Medium", setupMin: 3, coachCount: 1,
      intensity: "Medium", contactLevel: "none",
    },
    primary: { eventType: "completedPass", label: "Gate pass" },
    pb: true,
  }),
  mk({
    id: "d-sixgoal",
    name: "Six-Goal Finish",
    pillar: P.gamified,
    status: "library",
    summary: "Limited attempts at six mini-goals; a random goal lights up as the multiplier target.",
    novelty: 0.8,
    intensity: "Medium",
    complexity: "Moderate",
    space: "Medium",
    equipment: ["balls", "6 mini-goals", "cones"],
    mechanics: ["limited attempts", "random target", "score multiplier", "personal best"],
    objectives: {
      finishing: 5, decisionMaking: 3, scanning: 3, individualCompetition: 4,
      teamCompetition: 2, physicalIntensity: 3, contentPotential: 4, playerRepetitions: 3,
    },
    constraints: {
      players: 18, teams: 3, activePlayersPerRound: 3, durationMin: 15, roundSec: 45,
      transitionSec: 15, stations: 3, pitchSize: "Medium", setupMin: 4, coachCount: 1,
      intensity: "Medium", contactLevel: "none",
    },
    primary: { eventType: "goal", label: "Goal" },
    pb: true,
    contentMoment: "Multiplier goal call on the last attempt — all or nothing.",
  }),
  colourCall,
  mk({
    id: "d-gate-control",
    name: "Gate Control",
    pillar: P.footy,
    status: "library",
    summary: "Receive through a gate, control across a second gate — technique under light time pressure.",
    novelty: 0.3,
    intensity: "Low",
    complexity: "Simple",
    space: "Small",
    equipment: ["cones", "balls"],
    mechanics: ["visible score", "personal best"],
    objectives: {
      firstTouch: 5, passing: 3, playerRepetitions: 5, physicalIntensity: 2,
      individualCompetition: 2, contentPotential: 1,
    },
    constraints: {
      players: 18, teams: 3, activePlayersPerRound: 9, durationMin: 10, roundSec: 60,
      transitionSec: 10, stations: 9, pitchSize: "Small", setupMin: 2, coachCount: 1,
      intensity: "Low", contactLevel: "none",
    },
    primary: { eventType: "custom", label: "Clean double-gate control" },
  }),
  mk({
    id: "d-three-pass",
    name: "Three-Pass Unlock",
    pillar: P.footy,
    status: "library",
    summary: "Teams must chain three one-touch passes to 'unlock' the finish zone.",
    novelty: 0.5,
    intensity: "Medium",
    complexity: "Moderate",
    space: "Medium",
    equipment: ["cones", "balls", "bibs"],
    mechanics: ["team vs team", "visible score", "countdown"],
    objectives: {
      passing: 5, decisionMaking: 4, scanning: 3, teamCompetition: 4,
      physicalIntensity: 3, oppositionPressure: 2, playerRepetitions: 3,
    },
    constraints: {
      players: 18, teams: 3, activePlayersPerRound: 6, durationMin: 14, roundSec: 90,
      transitionSec: 20, stations: 1, pitchSize: "Medium", setupMin: 3, coachCount: 1,
      intensity: "Medium", contactLevel: "light",
    },
    primary: { eventType: "completedPass", label: "Unlock chain" },
    team: true,
  }),
  mk({
    id: "d-1v1-survival",
    name: "One-v-One Survival",
    pillar: P.oneVone,
    status: "library",
    summary: "Winner stays on: attack the gate, defend the recovery — lose twice and you're out.",
    novelty: 0.55,
    intensity: "High",
    complexity: "Simple",
    space: "Small",
    equipment: ["cones", "balls", "bibs"],
    mechanics: ["elimination", "visible score", "sudden death"],
    objectives: {
      dribbling: 5, defending: 4, oppositionPressure: 5, individualCompetition: 5,
      physicalIntensity: 5, contentPotential: 3, playerRepetitions: 2,
    },
    constraints: {
      players: 18, teams: 3, activePlayersPerRound: 2, durationMin: 12, roundSec: 30,
      transitionSec: 10, stations: 3, pitchSize: "Small", setupMin: 2, coachCount: 1,
      intensity: "High", contactLevel: "full",
    },
    primary: { eventType: "custom", label: "Duel win" },
  }),
  mk({
    id: "d-weakfoot-ko",
    name: "Weak-Foot Knockout",
    pillar: P.oneVone,
    status: "scheduledForTest",
    summary: "Knockout finishing ladder where only weak-foot goals count.",
    novelty: 0.65,
    intensity: "Medium",
    complexity: "Simple",
    space: "Small",
    equipment: ["balls", "2 mini-goals", "cones"],
    mechanics: ["elimination", "limited attempts", "sudden death"],
    objectives: {
      finishing: 4, individualCompetition: 5, physicalIntensity: 3,
      contentPotential: 3, playerRepetitions: 3, firstTouch: 2,
    },
    constraints: {
      players: 18, teams: 3, activePlayersPerRound: 4, durationMin: 10, roundSec: 40,
      transitionSec: 10, stations: 2, pitchSize: "Small", setupMin: 2, coachCount: 1,
      intensity: "Medium", contactLevel: "none",
    },
    primary: { eventType: "goal", label: "Weak-foot goal", points: 2 },
  }),
  mk({
    id: "d-target-territory",
    name: "Target Territory",
    pillar: P.cluster,
    status: "library",
    summary: "4v4 possession where held zones tick points every 30 seconds.",
    novelty: 0.7,
    intensity: "High",
    complexity: "Complex",
    space: "Large",
    equipment: ["bibs", "cones", "balls"],
    mechanics: ["territory capture", "team vs team", "comeback rule", "visible score"],
    objectives: {
      passing: 4, defending: 3, scanning: 4, teamCompetition: 5, oppositionPressure: 4,
      physicalIntensity: 4, decisionMaking: 4, contentPotential: 3, playerRepetitions: 3,
    },
    constraints: {
      players: 16, teams: 2, activePlayersPerRound: 8, durationMin: 16, roundSec: 240,
      transitionSec: 30, stations: 1, pitchSize: "Large", setupMin: 4, coachCount: 2,
      intensity: "High", contactLevel: "light",
    },
    primary: { eventType: "custom", label: "Zone tick" },
    team: true,
  }),
  mk({
    id: "d-defenders-jackpot",
    name: "Defender's Jackpot",
    pillar: P.cluster,
    status: "library",
    summary: "3v3 with a jackpot: every interception banks points that double if the defending trio scores.",
    novelty: 0.75,
    intensity: "High",
    complexity: "Moderate",
    space: "Medium",
    equipment: ["bibs", "cones", "balls", "2 mini-goals"],
    mechanics: ["risk versus reward", "score multiplier", "team vs team"],
    objectives: {
      defending: 5, oppositionPressure: 5, decisionMaking: 3, teamCompetition: 4,
      physicalIntensity: 4, contentPotential: 3, playerRepetitions: 3, finishing: 2,
    },
    constraints: {
      players: 18, teams: 3, activePlayersPerRound: 6, durationMin: 14, roundSec: 120,
      transitionSec: 20, stations: 1, pitchSize: "Medium", setupMin: 3, coachCount: 1,
      intensity: "High", contactLevel: "light",
    },
    primary: { eventType: "interception", label: "Interception" },
    team: true,
  }),
  mk({
    id: "d-firsttouch-escape",
    name: "First-Touch Escape",
    pillar: P.gamified,
    status: "library",
    summary: "Trapped in the square with a presser — one touch to escape through any open gate.",
    novelty: 0.6,
    intensity: "Medium",
    complexity: "Simple",
    space: "Small",
    equipment: ["cones", "balls", "bibs"],
    mechanics: ["countdown", "limited attempts", "visible score"],
    objectives: {
      firstTouch: 5, scanning: 4, oppositionPressure: 3, individualCompetition: 3,
      physicalIntensity: 3, playerRepetitions: 4, dribbling: 2,
    },
    constraints: {
      players: 18, teams: 3, activePlayersPerRound: 6, durationMin: 12, roundSec: 45,
      transitionSec: 15, stations: 3, pitchSize: "Small", setupMin: 3, coachCount: 1,
      intensity: "Medium", contactLevel: "light",
    },
    primary: { eventType: "custom", label: "Escape" },
  }),
  mk({
    id: "d-suddendeath-rebound",
    name: "Sudden-Death Rebound",
    pillar: P.gamified,
    status: "library",
    summary: "Strike the rebound board and finish the return first-time — miss and you're on the wall.",
    novelty: 0.8,
    intensity: "Medium",
    complexity: "Moderate",
    space: "Small",
    equipment: ["rebound boards", "balls", "2 mini-goals"],
    mechanics: ["sudden death", "streak bonus", "personal best"],
    objectives: {
      finishing: 4, firstTouch: 4, individualCompetition: 4, physicalIntensity: 3,
      contentPotential: 4, playerRepetitions: 3,
    },
    constraints: {
      players: 18, teams: 3, activePlayersPerRound: 2, durationMin: 10, roundSec: 30,
      transitionSec: 10, stations: 2, pitchSize: "Small", setupMin: 3, coachCount: 1,
      intensity: "Medium", contactLevel: "none",
    },
    primary: { eventType: "goal", label: "First-time rebound goal", points: 2 },
    pb: true,
  }),
  mk({
    id: "d-core-reset",
    name: "Core Reset Circuit",
    pillar: P.physio,
    status: "library",
    summary: "Between-block circuit: dead bugs, side planks and controlled landings with partner scoring.",
    novelty: 0.3,
    intensity: "Low",
    complexity: "Simple",
    space: "Small",
    equipment: ["agility rings", "cones"],
    mechanics: ["personal best", "visible score"],
    objectives: {
      physicalIntensity: 2, playerRepetitions: 4, individualCompetition: 1, contentPotential: 1,
    },
    constraints: {
      players: 18, teams: 3, activePlayersPerRound: 18, durationMin: 8, roundSec: 45,
      transitionSec: 15, stations: 6, pitchSize: "Small", setupMin: 2, coachCount: 1,
      intensity: "Low", contactLevel: "none",
    },
    primary: { eventType: "custom", label: "Clean rep block" },
  }),
  mk({
    id: "d-mobility-gate",
    name: "Mobility Gate Flow",
    pillar: P.physio,
    status: "library",
    summary: "Hip and ankle mobility flow through agility rings, scored on control not speed.",
    novelty: 0.35,
    intensity: "Low",
    complexity: "Simple",
    space: "Small",
    equipment: ["agility rings", "cones"],
    mechanics: ["personal best"],
    objectives: {
      physicalIntensity: 1, playerRepetitions: 4, contentPotential: 1,
    },
    constraints: {
      players: 18, teams: 3, activePlayersPerRound: 18, durationMin: 8, roundSec: 60,
      transitionSec: 10, stations: 6, pitchSize: "Small", setupMin: 2, coachCount: 1,
      intensity: "Low", contactLevel: "none",
    },
    primary: { eventType: "custom", label: "Controlled flow" },
  }),
];
