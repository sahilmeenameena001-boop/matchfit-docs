/** Small shared presentation atoms (status pills, tags, meters, panels). */
import type { DrillStatus, IssueLevel } from "@/types";

export function StatusPill({ status }: { status: DrillStatus | string }) {
  const styles: Record<string, string> = {
    library: "text-cream/70 border-line",
    aiDraft: "text-blue border-blue/50 bg-blue/10",
    coachApproved: "text-ok border-ok/50 bg-ok/10",
    scheduledForTest: "text-warn border-warn/50 bg-warn/10",
    tested: "text-cream border-cream/40 bg-cream/10",
    needsModification: "text-bad border-bad/50 bg-bad/10",
    verified: "text-ok border-ok/60 bg-ok/15",
    archived: "text-dim border-line",
  };
  const label: Record<string, string> = {
    aiDraft: "AI draft",
    coachApproved: "coach approved",
    scheduledForTest: "test queue",
    needsModification: "needs changes",
  };
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 font-cond text-[10px] uppercase tracking-[0.14em] ${styles[status] ?? styles.library}`}
    >
      {label[status] ?? status}
    </span>
  );
}

export function DrillTag({ children }: { children: React.ReactNode }) {
  return <span className="pill">{children}</span>;
}

export function EngagementMechanicPill({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-blue/30 bg-blue/[0.08] px-2.5 py-0.5 text-[11px] text-[#9cc3ff]">
      {name}
    </span>
  );
}

export function Meter({
  value,
  max,
  tone = "blue",
}: {
  value: number;
  max: number;
  tone?: "blue" | "ok" | "warn" | "bad";
}) {
  const colors = { blue: "bg-blue", ok: "bg-ok", warn: "bg-warn", bad: "bg-bad" };
  const pct = Math.min(100, Math.max(0, (value / Math.max(1, max)) * 100));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[rgba(236,232,217,0.08)]">
      <div className={`h-full rounded-full ${colors[tone]}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function IssueBadge({ level }: { level: IssueLevel }) {
  const map = {
    blocking: "text-bad border-bad/60 bg-bad/10",
    warning: "text-warn border-warn/60 bg-warn/10",
    info: "text-blue border-blue/50 bg-blue/10",
  };
  return (
    <span
      className={`inline-flex flex-none rounded-md border px-1.5 py-0.5 font-cond text-[9px] uppercase tracking-[0.14em] ${map[level]}`}
    >
      {level}
    </span>
  );
}

export function SectionTitle({
  children,
  right,
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="label !text-cream/90">{children}</h2>
      {right}
    </div>
  );
}

export function FlowBadge({ status }: { status: "healthy" | "moderate" | "poor" }) {
  const map = {
    healthy: "text-ok border-ok/60 bg-ok/10",
    moderate: "text-warn border-warn/60 bg-warn/10",
    poor: "text-bad border-bad/60 bg-bad/10",
  };
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 font-cond text-[10px] uppercase tracking-[0.14em] ${map[status]}`}
    >
      {status === "healthy" ? "healthy flow" : status === "moderate" ? "moderate flow" : "poor flow"}
    </span>
  );
}
