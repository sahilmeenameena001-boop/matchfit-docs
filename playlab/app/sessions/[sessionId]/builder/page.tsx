import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { toDrillView, toSessionContext } from "@/lib/serialize";
import { calculateFlow } from "@/lib/player-flow";
import { SessionTimeline } from "@/components/sessions/SessionTimeline";

export default async function BuilderPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const session = await db.session.findUnique({
    where: { id: sessionId },
    include: {
      players: true,
      drills: {
        orderBy: { sortOrder: "asc" },
        include: {
          drill: { include: { rules: true, scoringRules: true, xpRules: true } },
          runs: { include: { review: true }, orderBy: { startedAt: "desc" } },
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

  return (
    <div className="mx-auto max-w-6xl">
      <div className="label">Session builder</div>
      <h1 className="mt-1 font-cond text-3xl font-bold uppercase tracking-wide text-cream">
        {context.title}
      </h1>
      <p className="mt-1 text-[12px] text-moss">
        Drag to reorder · edit durations · watch the intensity sequence.
      </p>
      <SessionTimeline items={items} context={context} />
    </div>
  );
}
