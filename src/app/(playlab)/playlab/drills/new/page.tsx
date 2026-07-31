import { db } from "@/playlab/lib/db";
import { toDrillView, toSessionContext } from "@/playlab/lib/serialize";
import { DrillWizard } from "@/playlab/components/drills/DrillWizard";

export default async function NewDrillPage({
  searchParams,
}: {
  searchParams: Promise<{ sessionId?: string }>;
}) {
  const { sessionId } = await searchParams;
  const session = await db.session.findFirst({
    where: sessionId ? { id: sessionId } : undefined,
    include: {
      players: true,
      drills: {
        orderBy: { sortOrder: "asc" },
        include: { drill: { include: { rules: true, scoringRules: true, xpRules: true } } },
      },
    },
  });
  if (!session) return <div className="text-moss">Seed the database first: npm run setup</div>;

  return (
    <div>
      <div className="mx-auto mb-6 max-w-6xl">
        <div className="label">Create new MatchFIT drill</div>
        <h1 className="mt-1 font-cond text-3xl font-bold uppercase tracking-wide text-cream">
          AI Drill Studio
        </h1>
        <p className="mt-1 text-[12px] text-moss">
          Local deterministic generator — same inputs, same three concepts. Session: {session.title}
        </p>
      </div>
      <DrillWizard
        context={toSessionContext(session)}
        selectedDrills={session.drills.map((sd) => toDrillView(sd.drill))}
        sessionId={session.id}
      />
    </div>
  );
}
