"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Copy, GripVertical, Pencil, Trash2 } from "lucide-react";
import type { SessionContext } from "@/playlab/types";
import {
  duplicateSessionDrillAction,
  removeSessionDrillAction,
  reorderSessionDrillsAction,
  setSessionDrillDurationAction,
} from "@/playlab/lib/actions";
import type { SessionItem } from "./SessionView";

/** Drag-and-drop session timeline with warnings (spec §20). */
export function SessionTimeline({
  items,
  context,
}: {
  items: SessionItem[];
  context: SessionContext;
}) {
  const [order, setOrder] = useState(items.map((i) => i.sessionDrillId));
  const [dragId, setDragId] = useState<string | null>(null);

  const ordered = useMemo(
    () =>
      order
        .map((id) => items.find((i) => i.sessionDrillId === id))
        .filter((x): x is SessionItem => Boolean(x)),
    [order, items]
  );

  const commit = (next: string[]) => {
    setOrder(next);
    reorderSessionDrillsAction(next);
  };

  const move = (id: string, dir: -1 | 1) => {
    const idx = order.indexOf(id);
    const to = idx + dir;
    if (to < 0 || to >= order.length) return;
    const next = [...order];
    [next[idx], next[to]] = [next[to], next[idx]];
    commit(next);
  };

  const onDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const next = order.filter((x) => x !== dragId);
    next.splice(next.indexOf(targetId) + 1, 0, dragId);
    commit(next);
    setDragId(null);
  };

  const totalUsed = ordered.reduce((s, i) => s + i.durationMin + i.drill.constraints.setupMin, 0);
  const remaining = context.durationMin - totalUsed;

  // Warnings: consecutive high intensity + tight setup transitions.
  const warnings: string[] = [];
  let highStreak = 0;
  for (const item of ordered) {
    highStreak = item.drill.intensity === "High" ? highStreak + 1 : 0;
    if (highStreak === 3) warnings.push("Three high-intensity blocks are scheduled consecutively — insert a recovery block.");
  }
  for (let i = 1; i < ordered.length; i++) {
    const setup = ordered[i].drill.constraints.setupMin;
    if (setup >= 4)
      warnings.push(
        `Equipment transition into "${ordered[i].drill.name}" needs ~${setup} minutes — stage it during the previous block.`
      );
  }
  const mech = new Map<string, number>();
  for (const i of ordered) for (const m of i.drill.mechanics) mech.set(m, (mech.get(m) ?? 0) + 1);
  const repeated = [...mech.entries()].filter(([, c]) => c >= 3).map(([m]) => m);
  if (repeated.length > 0) warnings.push(`"${repeated[0]}" appears in ${mech.get(repeated[0])} blocks — vary the mechanics.`);

  return (
    <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_300px]">
      <div className="space-y-2">
        {ordered.map((item, i) => (
          <div
            key={item.sessionDrillId}
            draggable
            onDragStart={() => setDragId(item.sessionDrillId)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(item.sessionDrillId)}
            className={`glass flex flex-wrap items-center gap-3 p-4 ${dragId === item.sessionDrillId ? "opacity-50" : ""}`}
          >
            <GripVertical size={16} className="cursor-grab text-dim" />
            <span className="num-blue w-8 text-lg font-bold">{String(i + 1).padStart(2, "0")}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold text-cream">{item.drill.name}</div>
              <div className="text-[11px] text-moss">
                {item.drill.pillar} · {item.drill.intensity} intensity ·{" "}
                {Math.min(item.drill.constraints.players, item.drill.constraints.activePlayersPerRound * Math.max(1, item.drill.constraints.stations))} active · setup {item.drill.constraints.setupMin}&apos; · {item.status}
              </div>
            </div>
            <label className="flex items-center gap-1 text-[12px] text-moss">
              <input
                type="number"
                min={2}
                max={60}
                defaultValue={item.durationMin}
                onBlur={(e) => setSessionDrillDurationAction(item.sessionDrillId, Number(e.target.value))}
                className="input !w-16 !px-2 !py-1 text-center"
              />
              min
            </label>
            <div className="flex items-center gap-1">
              <IconBtn onClick={() => move(item.sessionDrillId, -1)}><ArrowUp size={14} /></IconBtn>
              <IconBtn onClick={() => move(item.sessionDrillId, 1)}><ArrowDown size={14} /></IconBtn>
              <IconBtn onClick={() => duplicateSessionDrillAction(item.sessionDrillId)}><Copy size={14} /></IconBtn>
              <Link href={`/playlab/drills/${item.drill.id}/edit?sessionId=${context.id}`} className="rounded-lg border border-line p-1.5 text-cream/70 hover:border-blue/60 hover:text-cream">
                <Pencil size={14} />
              </Link>
              <IconBtn danger onClick={() => removeSessionDrillAction(item.sessionDrillId)}>
                <Trash2 size={14} />
              </IconBtn>
            </div>
          </div>
        ))}
      </div>

      <aside className="space-y-4">
        <div className="glass p-5">
          <div className="label mb-3">Time budget</div>
          <div className="flex items-end justify-between">
            <div>
              <div className="font-cond text-3xl font-bold text-cream">{totalUsed}&apos;</div>
              <div className="label-sm">planned incl. setup</div>
            </div>
            <div className="text-right">
              <div className={`font-cond text-3xl font-bold ${remaining < 0 ? "text-bad" : "text-ok"}`}>
                {remaining}&apos;
              </div>
              <div className="label-sm">remaining of {context.durationMin}&apos;</div>
            </div>
          </div>
          <div className="mt-3 flex gap-1">
            {ordered.map((item) => (
              <div
                key={item.sessionDrillId}
                title={`${item.drill.name} — ${item.durationMin}'`}
                className={`h-2 rounded-full ${
                  item.drill.intensity === "High" ? "bg-bad" : item.drill.intensity === "Medium" ? "bg-warn" : "bg-ok"
                }`}
                style={{ width: `${(item.durationMin / Math.max(1, totalUsed)) * 100}%` }}
              />
            ))}
          </div>
          <div className="label-sm mt-2">intensity sequence (green low → red high)</div>
        </div>

        <div className="glass p-5">
          <div className="label mb-2">Timeline warnings</div>
          {warnings.length === 0 ? (
            <p className="text-[12px] text-ok">No sequencing issues detected.</p>
          ) : (
            <ul className="space-y-2">
              {warnings.map((w, i) => (
                <li key={i} className="text-[12px] leading-relaxed text-warn">
                  {w}
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border border-line p-1.5 text-cream/70 transition-colors ${
        danger ? "hover:border-bad/60 hover:text-bad" : "hover:border-blue/60 hover:text-cream"
      }`}
    >
      {children}
    </button>
  );
}
