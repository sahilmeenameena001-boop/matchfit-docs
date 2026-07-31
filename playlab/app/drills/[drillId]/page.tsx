import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { db } from "@/lib/db";
import { toDrillView } from "@/lib/serialize";
import { calculateFlow } from "@/lib/player-flow";
import { DrillTag, EngagementMechanicPill, FlowBadge, StatusPill } from "@/components/ui";

export default async function DrillDetailPage({
  params,
}: {
  params: Promise<{ drillId: string }>;
}) {
  const { drillId } = await params;
  const row = await db.drill.findUnique({
    where: { id: drillId },
    include: { rules: { orderBy: { sortOrder: "asc" } }, scoringRules: true, xpRules: true },
  });
  if (!row) notFound();
  const d = toDrillView(row);
  const flow = calculateFlow(d.constraints);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="label">{d.pillar}</div>
          <h1 className="mt-1 font-cond text-3xl font-bold uppercase tracking-wide text-cream">
            {d.name}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-moss">{d.summary}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill status={d.status} />
          <Link href={`/drills/${d.id}/edit`} className="btn-primary !px-3 !py-1.5 !text-[12px]">
            <Pencil size={13} /> Open rule studio
          </Link>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        <DrillTag>{d.intensity} intensity</DrillTag>
        <DrillTag>{d.complexity}</DrillTag>
        <DrillTag>{d.space} space</DrillTag>
        <DrillTag>novelty {d.novelty.toFixed(2)}</DrillTag>
        <DrillTag>{d.equipment.join(" · ")}</DrillTag>
        <FlowBadge status={flow.flowStatus} />
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {d.mechanics.map((m) => (
          <EngagementMechanicPill key={m} name={m} />
        ))}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="glass p-5">
          <div className="label mb-2">Setup</div>
          <ol className="list-decimal space-y-1.5 pl-4 text-[13px] text-cream/85">
            {d.setupInstructions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
          {d.contentMoment && (
            <p className="mt-3 border-t border-line pt-3 text-[12px] text-blue">
              🎬 {d.contentMoment}
            </p>
          )}
        </div>
        <div className="glass p-5">
          <div className="label mb-2">Rules ({d.rules.filter((r) => r.enabled).length} active)</div>
          <ul className="space-y-1.5 text-[13px]">
            {d.rules.map((r) => (
              <li key={r.id} className={r.enabled ? "text-cream/85" : "text-dim line-through"}>
                <span className="label-sm mr-2">{r.category}</span>
                {r.title}
              </li>
            ))}
          </ul>
        </div>
        <div className="glass p-5">
          <div className="label mb-2">Drill score</div>
          <ul className="space-y-1.5 text-[13px]">
            {d.scoringRules.map((s) => (
              <li key={s.id} className={`flex justify-between ${s.enabled ? "text-cream/85" : "text-dim line-through"}`}>
                <span>{s.label} <span className="label-sm">({s.appliesTo})</span></span>
                <span className="font-cond font-bold text-blue">+{s.points}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="glass p-5">
          <div className="label mb-2">MatchFIT XP</div>
          <ul className="space-y-1.5 text-[13px]">
            {d.xpRules.map((x) => (
              <li key={x.id} className={`flex justify-between ${x.enabled ? "text-cream/85" : "text-dim line-through"}`}>
                <span>{x.label} <span className="label-sm">({x.category})</span></span>
                <span className="font-cond font-bold text-ok">+{x.xp} XP</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="glass p-5">
          <div className="label mb-2">Progression</div>
          <ul className="list-disc space-y-1 pl-4 text-[13px] text-cream/85">
            {d.progression.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
        <div className="glass p-5">
          <div className="label mb-2">Regression</div>
          <ul className="list-disc space-y-1 pl-4 text-[13px] text-cream/85">
            {d.regression.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
