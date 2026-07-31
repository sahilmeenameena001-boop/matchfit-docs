import { notFound } from "next/navigation";
import { db } from "@/playlab/lib/db";
import { toDrillView, toSessionContext } from "@/playlab/lib/serialize";
import { analyseSession } from "@/playlab/lib/session-analysis";
import { calculateFlow } from "@/playlab/lib/player-flow";
import { SessionView, type SessionViewData } from "@/playlab/components/sessions/SessionView";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const session = await db.session.findUnique({
    where: { id: sessionId },
    include: {
      players: { include: { player: { include: { team: true } } } },
      drills: {
        orderBy: { sortOrder: "asc" },
        include: {
          drill: { include: { rules: true, scoringRules: true, xpRules: true } },
          runs: {
            include: { players: true, teams: true, review: true },
            orderBy: { startedAt: "desc" },
          },
        },
      },
    },
  });
  if (!session) notFound();

  const context = toSessionContext(session);
  const items = session.drills.map((sd) => {
    const view = toDrillView(sd.drill);
    return {
      sessionDrillId: sd.id,
      durationMin: sd.durationMin,
      status: sd.status,
      drill: view,
      flow: calculateFlow({ ...view.constraints, durationMin: sd.durationMin }),
      lastRunId: sd.runs[0]?.id ?? null,
      reviewed: Boolean(sd.runs[0]?.review),
    };
  });
  const balance = analyseSession(items.map((i) => i.drill), context);

  const teams = await db.team.findMany({ include: { players: true } });
  const runIds = session.drills.flatMap((sd) => sd.runs.map((r) => r.id));
  const teamScores = await db.teamDrillResult.groupBy({
    by: ["teamId"],
    where: { runId: { in: runIds } },
    _sum: { drillScore: true },
  });
  const playerSessionXp = await db.playerDrillResult.groupBy({
    by: ["playerId"],
    where: { runId: { in: runIds } },
    _sum: { xp: true, drillScore: true },
  });
  const players = await db.player.findMany({ include: { team: true }, orderBy: { xpTotal: "desc" } });

  const data: SessionViewData = {
    context,
    coachNotes: session.coachNotes,
    status: session.status,
    items,
    balance,
    teams: teams.map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      players: t.players.map((p) => p.name),
      sessionScore: teamScores.find((s) => s.teamId === t.id)?._sum.drillScore ?? 0,
    })),
    xpBoard: players.map((p) => ({
      id: p.id,
      name: p.name,
      team: p.team?.name ?? "—",
      teamColor: p.team?.color ?? "#888",
      xpTotal: p.xpTotal,
      sessionXp: playerSessionXp.find((s) => s.playerId === p.id)?._sum.xp ?? 0,
      sessionScore: playerSessionXp.find((s) => s.playerId === p.id)?._sum.drillScore ?? 0,
    })),
  };

  return <SessionView data={data} />;
}
