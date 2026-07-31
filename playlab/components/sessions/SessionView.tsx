"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, MapPin, Plus, Shuffle, Sparkles, Users2 } from "lucide-react";
import type { DrillMetrics, DrillView, SessionContext } from "@/types";
import type { SessionBalance } from "@/lib/session-analysis";
import { StatusPill } from "@/components/ui";
import { DrillCard } from "./DrillCard";
import { SessionBalancePanel } from "./SessionBalancePanel";
import { SessionTimeline } from "./SessionTimeline";
import { remixDrillAction } from "@/lib/actions";

export interface SessionItem {
  sessionDrillId: string;
  durationMin: number;
  status: string;
  drill: DrillView;
  flow: DrillMetrics;
  lastRunId: string | null;
  reviewed: boolean;
}

export interface SessionViewData {
  context: SessionContext;
  coachNotes: string;
  status: string;
  items: SessionItem[];
  balance: SessionBalance;
  teams: { id: string; name: string; color: string; players: string[]; sessionScore: number }[];
  xpBoard: {
    id: string;
    name: string;
    team: string;
    teamColor: string;
    xpTotal: number;
    sessionXp: number;
    sessionScore: number;
  }[];
}

const TABS = ["Drills & Catalogue", "Session Builder", "Squad Scoreboard", "XP Leaderboard"] as const;

export function SessionView({ data }: { data: SessionViewData }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Drills & Catalogue");
  const { context } = data;

  return (
    <div className="mx-auto max-w-6xl">
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="label">Session plan overview</div>
          <h1 className="mt-1 font-cond text-3xl font-bold uppercase tracking-wide text-cream">
            {context.title}
          </h1>
          <div className="mt-2 flex flex-wrap gap-4 text-[12px] text-moss">
            <span className="inline-flex items-center gap-1"><CalendarDays size={13} /> {context.date}</span>
            <span className="inline-flex items-center gap-1"><MapPin size={13} /> {context.venue} · {context.pitch}</span>
            <span className="inline-flex items-center gap-1"><Users2 size={13} /> {context.players} players · {context.coaches} coaches · {context.durationMin}&apos;</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill status={data.status} />
          <span className="pill">{context.targetIntensity} intensity</span>
        </div>
      </div>

      {/* actions */}
      <div className="mt-5 flex flex-wrap gap-2">
        <Link href={`/drills?sessionId=${context.id}`} className="btn-ghost">
          <Plus size={15} /> Add from library
        </Link>
        <Link href={`/drills/new?sessionId=${context.id}`} className="btn-primary">
          <Sparkles size={15} /> Create new MatchFIT drill
        </Link>
        {data.items[0] && (
          <button
            className="btn-ghost"
            onClick={() => remixDrillAction(data.items[0].drill.id, context.id)}
          >
            <Shuffle size={15} /> Remix selected drills
          </button>
        )}
      </div>

      {/* coach notes */}
      <div className="glass mt-5 p-5">
        <div className="label mb-1.5">Coach notes</div>
        <p className="text-sm leading-relaxed text-cream/85">{data.coachNotes}</p>
      </div>

      {/* tabs */}
      <div className="mt-6 flex flex-wrap gap-1 rounded-2xl border border-line bg-[rgba(7,12,9,0.6)] p-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              tab === t
                ? "rounded-xl bg-cream px-4 py-2 font-cond text-[12px] font-bold uppercase tracking-[0.12em] text-[#101a12]"
                : "rounded-xl px-4 py-2 font-cond text-[12px] uppercase tracking-[0.12em] text-cream/60 hover:text-cream"
            }
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Drills & Catalogue" && (
        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_330px]">
          <div className="space-y-4">
            <div className="label">Selected challenges — {data.items.length}</div>
            {data.items.map((item, i) => (
              <DrillCard key={item.sessionDrillId} item={item} index={i + 1} sessionId={context.id} />
            ))}
            {data.items.length === 0 && (
              <div className="glass p-8 text-center text-sm text-moss">
                No drills selected yet — add from the library or create one.
              </div>
            )}
          </div>
          <SessionBalancePanel balance={data.balance} />
        </div>
      )}

      {tab === "Session Builder" && (
        <SessionTimeline items={data.items} context={context} />
      )}

      {tab === "Squad Scoreboard" && (
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[...data.teams]
            .sort((a, b) => b.sessionScore - a.sessionScore)
            .map((t, i) => (
              <div key={t.id} className="glass p-5">
                <div className="flex items-center justify-between">
                  <span className="num-blue text-xl font-bold">{String(i + 1).padStart(2, "0")}</span>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.color }} />
                </div>
                <div className="mt-2 text-lg font-semibold text-cream">{t.name}</div>
                <div className="font-cond text-4xl font-bold text-blue">{t.sessionScore}</div>
                <div className="label-sm mt-1">session drill points</div>
                <ul className="mt-3 space-y-1 text-[12px] text-moss">
                  {t.players.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
            ))}
        </div>
      )}

      {tab === "XP Leaderboard" && (
        <div className="glass mt-6 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="label px-5 py-3">#</th>
                <th className="label px-3 py-3">Player</th>
                <th className="label px-3 py-3">Team</th>
                <th className="label px-3 py-3 text-right">Session XP</th>
                <th className="label px-5 py-3 text-right">Total XP</th>
              </tr>
            </thead>
            <tbody>
              {data.xpBoard.map((p, i) => (
                <tr key={p.id} className="border-b border-line/50 last:border-0">
                  <td className="num-blue px-5 py-2.5 font-bold">{String(i + 1).padStart(2, "0")}</td>
                  <td className="px-3 py-2.5 text-cream">{p.name}</td>
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center gap-1.5 text-[12px] text-moss">
                      <span className="h-2 w-2 rounded-full" style={{ background: p.teamColor }} />
                      {p.team}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right text-ok">
                    {p.sessionXp > 0 ? `+${p.sessionXp}` : "—"}
                  </td>
                  <td className="px-5 py-2.5 text-right font-cond text-base font-bold text-cream">
                    {p.xpTotal}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
