import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";
import { db } from "@/playlab/lib/db";
import { toDrillView } from "@/playlab/lib/serialize";
import { StatusPill, DrillTag, EngagementMechanicPill } from "@/playlab/components/ui";
import { AddToSessionButton } from "@/playlab/components/drills/AddToSessionButton";

export default async function DrillsPage({
  searchParams,
}: {
  searchParams: Promise<{ pillar?: string; filter?: string; sessionId?: string }>;
}) {
  const { pillar, filter, sessionId } = await searchParams;
  const rows = await db.drill.findMany({
    include: { rules: true, scoringRules: true, xpRules: true },
    orderBy: { name: "asc" },
  });
  let drills = rows.map(toDrillView).filter((d) => d.status !== "archived");
  if (pillar) drills = drills.filter((d) => d.pillar === pillar);
  if (filter === "experimental")
    drills = drills.filter((d) => d.conceptType === "experimental" || d.status === "aiDraft");
  if (filter === "test-queue") drills = drills.filter((d) => d.status === "scheduledForTest");
  if (filter === "verified") drills = drills.filter((d) => d.status === "verified");

  const heading =
    filter === "experimental"
      ? "Experimental drills"
      : filter === "test-queue"
        ? "Test queue"
        : filter === "verified"
          ? "Verified drills"
          : (pillar ?? "Drill library");

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="label">Drill library</div>
          <h1 className="mt-1 font-cond text-3xl font-bold uppercase tracking-wide text-cream">
            {heading}
          </h1>
          <div className="mt-1 text-[12px] text-moss">
            {drills.length} drill{drills.length === 1 ? "" : "s"}
            {sessionId ? " — click add to place one in the session" : ""}
          </div>
        </div>
        <Link href={`/playlab/drills/new${sessionId ? `?sessionId=${sessionId}` : ""}`} className="btn-primary">
          <Sparkles size={15} /> Create new MatchFIT drill
        </Link>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {drills.map((d) => (
          <div key={d.id} className="glass flex flex-col p-5">
            <div className="flex items-start justify-between gap-2">
              <Link href={`/playlab/drills/${d.id}`} className="text-lg font-semibold text-cream hover:text-blue">
                {d.name}
              </Link>
              <StatusPill status={d.status} />
            </div>
            <div className="label-sm mt-0.5">{d.pillar}</div>
            <p className="mt-2 flex-1 text-[13px] leading-relaxed text-moss">{d.summary}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <DrillTag>{d.intensity}</DrillTag>
              <DrillTag>{d.complexity}</DrillTag>
              <DrillTag>{d.space}</DrillTag>
              <DrillTag>novelty {d.novelty.toFixed(2)}</DrillTag>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {d.mechanics.slice(0, 4).map((m) => (
                <EngagementMechanicPill key={m} name={m} />
              ))}
            </div>
            <div className="mt-4 flex gap-2 border-t border-line pt-3">
              <Link href={`/playlab/drills/${d.id}`} className="btn-ghost !px-3 !py-1.5 !text-[12px]">
                Details
              </Link>
              <Link href={`/playlab/drills/${d.id}/edit${sessionId ? `?sessionId=${sessionId}` : ""}`} className="btn-ghost !px-3 !py-1.5 !text-[12px]">
                Rule studio
              </Link>
              {sessionId && (
                <AddToSessionButton sessionId={sessionId} drillId={d.id}>
                  <Plus size={13} /> Add
                </AddToSessionButton>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
