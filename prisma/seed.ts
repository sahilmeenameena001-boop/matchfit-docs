/** Seed: 18 players in 3 teams, 14 library drills, the primary demo session,
 *  2 AI drafts (built by the real generator), one historical tested run with a
 *  review, and leaderboard XP. Idempotent: wipes and reseeds. */
import { PrismaClient } from "@prisma/client";
import { SEED_DRILLS } from "../src/playlab/lib/seed-templates";
import { generateDrillConcepts } from "../src/playlab/lib/drill-generator";
import { conceptCreateData, ruleCreateData, scoringCreateData, xpCreateData } from "../src/playlab/lib/persist";
import { toDrillView, toSessionContext } from "../src/playlab/lib/serialize";

const db = new PrismaClient();

const PLAYERS: Array<[string, string]> = [
  ["Akash Verma", "Winger"],
  ["Rohan Iyer", "Striker"],
  ["Kabir Shah", "Midfielder"],
  ["Aditya Rao", "Defender"],
  ["Vivaan Joshi", "Midfielder"],
  ["Ishaan Patel", "Goalkeeper"],
  ["Arjun Nair", "Striker"],
  ["Dev Sharma", "Defender"],
  ["Reyansh Gupta", "Winger"],
  ["Krish Malhotra", "Midfielder"],
  ["Aarav Mehta", "Defender"],
  ["Yuvraj Singh", "Striker"],
  ["Samar Khan", "Midfielder"],
  ["Nikhil Menon", "Defender"],
  ["Advait Kulkarni", "Winger"],
  ["Om Prakash", "Goalkeeper"],
  ["Harsh Vardhan", "Midfielder"],
  ["Zaid Ansari", "Striker"],
];

async function main() {
  // Wipe in dependency order (idempotent reseed).
  await db.drillReview.deleteMany();
  await db.drillEvent.deleteMany();
  await db.playerDrillResult.deleteMany();
  await db.teamDrillResult.deleteMany();
  await db.drillRun.deleteMany();
  await db.sessionDrill.deleteMany();
  await db.sessionPlayer.deleteMany();
  await db.session.deleteMany();
  await db.drillRule.deleteMany();
  await db.scoringRule.deleteMany();
  await db.xPRule.deleteMany();
  await db.drill.deleteMany();
  await db.player.deleteMany();
  await db.team.deleteMany();
  await db.coach.deleteMany();

  const coach = await db.coach.create({ data: { id: "coach-demo", name: "Coach Arjun Mehta" } });

  const teams = await Promise.all(
    [
      { id: "t-blue", name: "Blue Falcons", color: "#3d8bfd" },
      { id: "t-green", name: "Green Vipers", color: "#58b98b" },
      { id: "t-cream", name: "Cream Wolves", color: "#ece8d9" },
    ].map((t) => db.team.create({ data: t }))
  );

  const players = [];
  for (let i = 0; i < PLAYERS.length; i++) {
    const [name, position] = PLAYERS[i];
    players.push(
      await db.player.create({
        data: {
          id: `p-${i + 1}`,
          name,
          position,
          teamId: teams[i % 3].id,
          // Deterministic historical XP so the leaderboard has shape.
          xpTotal: 60 + ((i * 37) % 180),
        },
      })
    );
  }

  // Library drills.
  for (const d of SEED_DRILLS) {
    await db.drill.create({
      data: {
        id: d.id,
        name: d.name,
        pillar: d.pillar,
        status: d.status,
        summary: d.summary,
        novelty: d.novelty,
        intensity: d.intensity,
        complexity: d.complexity,
        space: d.space,
        conceptType: d.conceptType ?? null,
        selectionScore: 60 + Math.round(d.novelty * 30),
        equipmentJson: JSON.stringify(d.equipment),
        mechanicsJson: JSON.stringify(d.mechanics),
        objectivesJson: JSON.stringify(d.objectives),
        constraintsJson: JSON.stringify(d.constraints),
        setupJson: JSON.stringify(d.setup),
        progressionJson: JSON.stringify(d.progression),
        regressionJson: JSON.stringify(d.regression),
        safetyJson: JSON.stringify(d.safety),
        contentMoment: d.contentMoment,
        fitExplanation: "",
        rules: { create: d.rules.map((r, i) => ruleCreateData(r, i)) },
        scoringRules: { create: d.scoring.map(scoringCreateData) },
        xpRules: { create: d.xp.map(xpCreateData) },
      },
    });
  }

  // Primary demo session (spec §6).
  const session = await db.session.create({
    data: {
      id: "s-main",
      title: "Passing Under Pressure — Block 4",
      date: "2026-07-30",
      venue: "KNC BaseCamp",
      durationMin: 120,
      pitch: "Half 6v6 pitch",
      playerLevel: "Mixed intermediate",
      primaryObjective: "passing",
      secondaryObjective: "Scanning and finishing",
      targetIntensity: "Medium-high",
      coachNotes:
        "Third block of the passing cycle. Group struggled with first touch under press last week — reward brave receiving. Keep water breaks at 25' and 70'; light rain expected, gates may need re-pegging.",
      equipmentJson: JSON.stringify([
        "18 footballs",
        "cones",
        "bibs",
        "six mini-goals",
        "agility rings",
        "two rebound boards",
        "stopwatch",
      ]),
      status: "generated",
      coachId: coach.id,
    },
  });
  for (const p of players) {
    await db.sessionPlayer.create({ data: { sessionId: session.id, playerId: p.id } });
  }

  const selected = [
    { drillId: "d-tictactoe", durationMin: 12 },
    { drillId: "d-passing-gate", durationMin: 15 },
    { drillId: "d-sixgoal", durationMin: 15 },
  ];
  const sessionDrills = [];
  for (let i = 0; i < selected.length; i++) {
    sessionDrills.push(
      await db.sessionDrill.create({
        data: {
          sessionId: session.id,
          drillId: selected[i].drillId,
          sortOrder: i,
          durationMin: selected[i].durationMin,
        },
      })
    );
  }

  // Two AI drafts, produced by the real generator (one experimental).
  const sessionRow = await db.session.findUniqueOrThrow({
    where: { id: session.id },
    include: { players: true },
  });
  const drillRows = await db.drill.findMany({
    where: { id: { in: selected.map((s) => s.drillId) } },
    include: { rules: true, scoringRules: true, xpRules: true },
  });
  const concepts = generateDrillConcepts({
    sessionContext: toSessionContext(sessionRow),
    selectedDrills: drillRows.map(toDrillView),
    primaryObjective: "finishing",
    secondaryObjectives: ["defending"],
    reason: "fill missing session component",
    desiredExperience: ["fast", "high-stakes"],
    competitionFormat: "team vs team",
    engagementMechanics: ["bonus target", "streak bonus", "countdown"],
    constraints: {
      players: 18,
      teams: 3,
      activePlayersPerRound: 3,
      durationMin: 15,
      roundSec: 60,
      transitionSec: 15,
      stations: 3,
      pitchSize: "Medium",
      setupMin: 3,
      coachCount: 2,
      intensity: "High",
      contactLevel: "light",
      playerLevel: "Mixed intermediate",
    },
  });
  await db.drill.create({ data: { id: "d-ai-1", ...conceptCreateData(concepts[0]) } });
  await db.drill.create({ data: { id: "d-ai-2", ...conceptCreateData(concepts[2]) } });

  // Historical tested run on Passing Gate (why it is `verified`), with review.
  const pgSessionDrill = sessionDrills[1];
  const run = await db.drillRun.create({
    data: {
      sessionDrillId: pgSessionDrill.id,
      startedAt: new Date("2026-07-23T17:30:00Z"),
      endedAt: new Date("2026-07-23T17:46:00Z"),
      rounds: 4,
      playerOfDrillId: "p-1",
    },
  });
  const historical: Array<[string, string, number, number]> = [
    ["p-1", "goal", 1, 0], // eventType shorthand below
  ];
  void historical;
  const evts = [
    { playerId: "p-1", teamId: "t-blue", eventType: "completedPass", label: "Gate pass", points: 1, xp: 5, round: 1 },
    { playerId: "p-1", teamId: "t-blue", eventType: "targetHit", label: "Bonus target", points: 2, xp: 20, round: 2 },
    { playerId: "p-2", teamId: "t-green", eventType: "completedPass", label: "Gate pass", points: 1, xp: 5, round: 1 },
    { playerId: "p-3", teamId: "t-cream", eventType: "completedPass", label: "Gate pass", points: 1, xp: 5, round: 3 },
    { teamId: "t-blue", eventType: "roundWin", label: "Round win", points: 3, xp: 10, round: 4 },
  ];
  for (const e of evts) {
    await db.drillEvent.create({ data: { runId: run.id, ...e } });
  }
  await db.playerDrillResult.createMany({
    data: [
      { runId: run.id, playerId: "p-1", drillScore: 6, xp: 35 },
      { runId: run.id, playerId: "p-2", drillScore: 1, xp: 15 },
      { runId: run.id, playerId: "p-3", drillScore: 1, xp: 15 },
    ],
  });
  await db.teamDrillResult.createMany({
    data: [
      { runId: run.id, teamId: "t-blue", drillScore: 9 },
      { runId: run.id, teamId: "t-green", drillScore: 4 },
      { runId: run.id, teamId: "t-cream", drillScore: 3 },
    ],
  });
  await db.drillReview.create({
    data: {
      runId: run.id,
      easeOfExplanation: 5,
      playerEnjoyment: 4,
      objectiveAchieved: 4,
      scoringClarity: 5,
      operationalEase: 4,
      contentQuality: 3,
      safety: 5,
      actualDurationMin: 16,
      attemptsPerPlayer: 6.5,
      queueIssue: false,
      notes: "Bonus gate transformed effort in the last two rounds.",
      runAgain: true,
      recommendation:
        "Keep three stations. Shrink the bonus gate after round two and add a weak-foot round to stretch the stronger passers.",
    },
  });

  console.log("Seed complete:", {
    players: players.length,
    drills: SEED_DRILLS.length + 2,
    session: session.title,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
