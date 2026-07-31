"use client";

import Link from "next/link";
import { Pencil, Shuffle, Trash2 } from "lucide-react";
import { DrillTag, EngagementMechanicPill, FlowBadge, StatusPill } from "@/components/ui";
import { remixDrillAction, removeSessionDrillAction } from "@/lib/actions";
import type { SessionItem } from "./SessionView";

/** Selected-drill card on the session overview (spec §7). */
export function DrillCard({
  item,
  index,
  sessionId,
}: {
  item: SessionItem;
  index: number;
  sessionId: string;
}) {
  const d = item.drill;
  return (
    <div className="glass p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-4">
          <div className="num-blue text-2xl font-bold">{String(index).padStart(2, "0")}</div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-cream">{d.name}</h3>
              <StatusPill status={d.status} />
              {item.reviewed && <span className="pill text-ok">reviewed</span>}
            </div>
            <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-moss">{d.summary}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="label-sm">Selection score</div>
          <div className="font-cond text-2xl font-bold text-blue">
            {d.selectionScore.toFixed(0)}
          </div>
          <div className="label-sm mt-1">novelty {d.novelty.toFixed(2)}</div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <DrillTag>{d.intensity} intensity</DrillTag>
        <DrillTag>{d.complexity}</DrillTag>
        <DrillTag>{d.space} space</DrillTag>
        <DrillTag>{d.equipment.join(" · ")}</DrillTag>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {d.mechanics.map((m) => (
          <EngagementMechanicPill key={m} name={m} />
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-3 text-center sm:grid-cols-5">
        <Stat label="Active players" value={`${Math.min(d.constraints.players, d.constraints.activePlayersPerRound * Math.max(1, d.constraints.stations))}/${d.constraints.players}`} />
        <Stat label="Est. attempts" value={`${item.flow.attemptsPerPlayer}`} />
        <Stat label="Duration" value={`${item.durationMin}'`} />
        <Stat label="Waiting" value={`${item.flow.waitingSec}s`} />
        <div className="flex items-center justify-center">
          <FlowBadge status={item.flow.flowStatus} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={`/drills/${d.id}/edit?sessionId=${sessionId}`}
          className="btn-ghost !px-3 !py-1.5 !text-[12px]"
        >
          <Pencil size={13} /> Edit rules
        </Link>
        <button
          className="btn-ghost !px-3 !py-1.5 !text-[12px]"
          onClick={() => remixDrillAction(d.id, sessionId)}
        >
          <Shuffle size={13} /> Remix
        </button>
        <button
          className="btn-ghost !px-3 !py-1.5 !text-[12px] hover:!border-bad/60 hover:!text-bad"
          onClick={() => removeSessionDrillAction(item.sessionDrillId)}
        >
          <Trash2 size={13} /> Remove
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-cond text-lg font-bold text-cream">{value}</div>
      <div className="label-sm">{label}</div>
    </div>
  );
}
