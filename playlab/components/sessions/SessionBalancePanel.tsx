"use client";

import type { SessionBalance } from "@/lib/session-analysis";
import { dimensionLabel } from "@/lib/session-analysis";
import { Meter, SectionTitle } from "@/components/ui";

/** Right-hand session balance panel (spec §8). */
export function SessionBalancePanel({ balance }: { balance: SessionBalance }) {
  const max = Math.max(5, ...balance.readings.map((r) => r.total));
  return (
    <aside className="space-y-4">
      <div className="glass p-5">
        <SectionTitle>Session balance</SectionTitle>
        <div className="space-y-2.5">
          {balance.readings.map((r) => (
            <div key={r.dimension}>
              <div className="mb-1 flex items-center justify-between text-[11px]">
                <span className={r.level === "missing" ? "text-bad" : r.level === "over" ? "text-warn" : "text-cream/75"}>
                  {dimensionLabel(r.dimension)}
                </span>
                <span className="text-dim">{r.total}</span>
              </div>
              <Meter
                value={r.total}
                max={max}
                tone={r.level === "missing" ? "bad" : r.level === "over" ? "warn" : "ok"}
              />
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5 text-[11px]">
          <span className="pill text-bad">{balance.missing.length} missing</span>
          <span className="pill text-ok">{balance.adequate.length} adequate</span>
          <span className="pill text-warn">{balance.over.length} over</span>
        </div>
      </div>

      <div className="glass p-5">
        <SectionTitle>Insight</SectionTitle>
        <p className="text-[13px] leading-relaxed text-cream/85">{balance.recommendation}</p>
        {balance.intensityConcern && (
          <p className="mt-2 text-[12px] text-warn">{balance.intensityConcern}</p>
        )}
        {balance.duplicatedMechanics.length > 0 && (
          <p className="mt-2 text-[12px] text-moss">
            Repeated mechanics: {balance.duplicatedMechanics.join(", ")}
          </p>
        )}
        {balance.queueRisks.map((q) => (
          <p key={q.drill} className="mt-2 text-[12px] text-bad">
            Queue risk in {q.drill} (~{q.waitingSec}s wait)
          </p>
        ))}
        <div className="mt-3 border-t border-line pt-3 text-[12px] text-moss">
          Individual vs team competition:{" "}
          <span className="text-cream">{balance.competitionBalance.individual}</span> ·{" "}
          <span className="text-cream">{balance.competitionBalance.team}</span>{" "}
          <span className={balance.competitionBalance.verdict === "balanced" ? "text-ok" : "text-warn"}>
            ({balance.competitionBalance.verdict})
          </span>
        </div>
      </div>
    </aside>
  );
}
