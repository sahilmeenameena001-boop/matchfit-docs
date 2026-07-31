import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { toDrillView } from "@/lib/serialize";
import { LiveScoringPanel } from "@/components/live/LiveScoringPanel";

export default async function LivePage({
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
        include: { drill: { include: { rules: true, scoringRules: true, xpRules: true } } },
      },
    },
  });
  if (!session) notFound();

  return (
    <LiveScoringPanel
      sessionId={session.id}
      sessionTitle={session.title}
      drills={session.drills.map((sd) => ({
        sessionDrillId: sd.id,
        durationMin: sd.durationMin,
        status: sd.status,
        drill: toDrillView(sd.drill),
      }))}
      players={session.players.map((sp) => ({
        id: sp.player.id,
        name: sp.player.name,
        teamId: sp.player.teamId,
      }))}
      teams={await db.team
        .findMany()
        .then((ts) => ts.map((t) => ({ id: t.id, name: t.name, color: t.color })))}
    />
  );
}
