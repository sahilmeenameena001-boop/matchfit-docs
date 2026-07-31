"use client";

/** Six-step guided drill creation (spec §9) ending in three generated
 *  concepts from the local deterministic engine (§10). */
import { useMemo, useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { useDrillBuilder } from "@/store/drill-builder-store";
import { generateDrillConcepts } from "@/lib/drill-generator";
import { analyseSession, dimensionLabel } from "@/lib/session-analysis";
import { saveConceptAction } from "@/lib/actions";
import { FlowBadge } from "@/components/ui";
import type {
  CompetitionFormat,
  DrillView,
  EngagementMechanic,
  ExperienceTag,
  FootballObjective,
  GeneratedDrillConcept,
  SessionContext,
} from "@/types";

const OBJECTIVES: FootballObjective[] = [
  "passing", "finishing", "dribbling", "defending", "firstTouch", "scanning", "decisionMaking",
];
const REASONS = [
  "fill missing session component",
  "replace existing drill",
  "create a PlayLab challenge",
  "increase competition",
  "increase player repetitions",
  "create content moment",
  "test experimental format",
];
const EXPERIENCES: ExperienceTag[] = [
  "fast", "tactical", "chaotic", "skill-based", "pressure-based", "funny",
  "high-stakes", "collaborative", "individual", "unpredictable", "cinematic", "beginner-friendly",
];
const FORMATS: CompetitionFormat[] = [
  "player vs player", "team vs team", "player vs clock", "team vs clock", "relay",
  "knockout", "king of the court", "survival", "target score", "personal best",
  "sudden death", "progressive levels",
];
const MECHANICS: EngagementMechanic[] = [
  "visible score", "countdown", "limited attempts", "streak bonus", "score multiplier",
  "random target", "bonus target", "power-up", "penalty", "risk versus reward",
  "comeback rule", "mystery event", "territory capture", "elimination", "sudden death",
  "progressive difficulty",
];
const STEPS = ["Purpose", "Experience", "Format", "Mechanics", "Constraints", "Concepts"];

export function DrillWizard({
  context,
  selectedDrills,
  sessionId,
}: {
  context: SessionContext;
  selectedDrills: DrillView[];
  sessionId?: string;
}) {
  const b = useDrillBuilder();
  const [concepts, setConcepts] = useState<GeneratedDrillConcept[] | null>(null);
  const [saving, startSaving] = useTransition();
  const balance = useMemo(
    () => analyseSession(selectedDrills, context),
    [selectedDrills, context]
  );

  const generate = () => {
    setConcepts(
      generateDrillConcepts({
        sessionContext: context,
        selectedDrills,
        primaryObjective: b.primaryObjective,
        secondaryObjectives: b.secondaryObjectives,
        reason: b.reason,
        desiredExperience: b.experience,
        competitionFormat: b.format,
        engagementMechanics: b.mechanics,
        constraints: b.constraints,
      })
    );
    b.setStep(6);
  };

  const chip = (active: boolean) =>
    active
      ? "rounded-xl border border-blue bg-blue/15 px-3 py-2 text-[13px] font-semibold text-[#9cc3ff]"
      : "rounded-xl border border-line px-3 py-2 text-[13px] text-cream/70 hover:border-cream/40";

  return (
    <div className="mx-auto grid max-w-6xl gap-6 xl:grid-cols-[220px_1fr_280px]">
      {/* left: steps */}
      <aside className="glass h-fit p-4">
        <div className="label mb-3">AI Drill Studio</div>
        <ol className="space-y-1">
          {STEPS.map((s, i) => (
            <li key={s}>
              <button
                onClick={() => (i + 1 < 6 || concepts ? b.setStep(i + 1) : null)}
                className={
                  b.step === i + 1
                    ? "flex w-full items-center gap-2 rounded-xl bg-cream px-3 py-2 text-sm font-semibold text-[#101a12]"
                    : "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-cream/60 hover:text-cream"
                }
              >
                <span className={`num-blue text-[11px] ${b.step === i + 1 ? "text-[#1f5fd0]" : ""}`}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                {s}
              </button>
            </li>
          ))}
        </ol>
      </aside>

      {/* centre */}
      <div className="min-w-0">
        {b.step === 1 && (
          <StepCard title="Purpose" sub="What should this drill train, and why add it?">
            <div className="label mb-2">Primary football objective</div>
            <div className="flex flex-wrap gap-2">
              {OBJECTIVES.map((o) => (
                <button key={o} className={chip(b.primaryObjective === o)} onClick={() => b.set("primaryObjective", o)}>
                  {o}
                </button>
              ))}
            </div>
            <div className="label mb-2 mt-5">Secondary objectives (up to 2)</div>
            <div className="flex flex-wrap gap-2">
              {OBJECTIVES.filter((o) => o !== b.primaryObjective).map((o) => (
                <button key={o} className={chip(b.secondaryObjectives.includes(o))} onClick={() => b.toggleSecondary(o)}>
                  {o}
                </button>
              ))}
            </div>
            <div className="label mb-2 mt-5">Reason for adding</div>
            <div className="flex flex-wrap gap-2">
              {REASONS.map((r) => (
                <button key={r} className={chip(b.reason === r)} onClick={() => b.set("reason", r)}>
                  {r}
                </button>
              ))}
            </div>
          </StepCard>
        )}

        {b.step === 2 && (
          <StepCard title="Experience" sub="Pick up to three feelings the drill should create.">
            <div className="flex flex-wrap gap-2">
              {EXPERIENCES.map((t) => (
                <button key={t} className={chip(b.experience.includes(t))} onClick={() => b.toggleExperience(t)}>
                  {t}
                </button>
              ))}
            </div>
          </StepCard>
        )}

        {b.step === 3 && (
          <StepCard title="Competition format" sub="How do players compete?">
            <div className="flex flex-wrap gap-2">
              {FORMATS.map((f) => (
                <button key={f} className={chip(b.format === f)} onClick={() => b.set("format", f)}>
                  {f}
                </button>
              ))}
            </div>
          </StepCard>
        )}

        {b.step === 4 && (
          <StepCard title="Engagement mechanics" sub="Layer the game feel — at least three recommended.">
            <div className="flex flex-wrap gap-2">
              {MECHANICS.map((m) => (
                <button key={m} className={chip(b.mechanics.includes(m))} onClick={() => b.toggleMechanic(m)}>
                  {m}
                </button>
              ))}
            </div>
            {b.mechanics.length < 3 && (
              <p className="mt-3 text-[12px] text-warn">
                {b.mechanics.length}/3 minimum mechanics selected.
              </p>
            )}
          </StepCard>
        )}

        {b.step === 5 && (
          <StepCard title="Operational constraints" sub="The reality on the pitch.">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Num label="Players" k="players" min={4} max={30} />
              <Num label="Teams" k="teams" min={1} max={6} />
              <Num label="Active / round" k="activePlayersPerRound" min={1} max={12} />
              <Num label="Duration (min)" k="durationMin" min={5} max={40} />
              <Num label="Round (sec)" k="roundSec" min={15} max={600} />
              <Num label="Transition (sec)" k="transitionSec" min={0} max={120} />
              <Num label="Stations" k="stations" min={1} max={6} />
              <Num label="Setup (min)" k="setupMin" min={1} max={10} />
              <Num label="Coaches" k="coachCount" min={1} max={4} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Sel label="Pitch size" k="pitchSize" options={["Small", "Medium", "Large"]} />
              <Sel label="Intensity" k="intensity" options={["Low", "Medium", "High"]} />
              <Sel label="Contact" k="contactLevel" options={["none", "light", "full"]} />
            </div>
          </StepCard>
        )}

        {b.step === 6 && (
          <div className="space-y-4">
            {!concepts && (
              <div className="glass p-8 text-center">
                <p className="text-sm text-moss">Ready to generate three concepts from your choices.</p>
              </div>
            )}
            {concepts?.map((c) => (
              <ConceptCard
                key={c.conceptType}
                c={c}
                saving={saving}
                onSelect={() => startSaving(() => saveConceptAction(c, sessionId))}
              />
            ))}
          </div>
        )}

        <div className="mt-5 flex justify-between">
          <button className="btn-ghost" disabled={b.step === 1} onClick={() => b.setStep(Math.max(1, b.step - 1))}>
            Back
          </button>
          {b.step < 5 && (
            <button className="btn-primary" onClick={() => b.setStep(b.step + 1)}>
              Continue
            </button>
          )}
          {b.step === 5 && (
            <button className="btn-primary" onClick={generate}>
              <Sparkles size={15} /> Generate concepts
            </button>
          )}
          {b.step === 6 && concepts && (
            <button className="btn-ghost" onClick={generate}>
              <Sparkles size={15} /> Regenerate
            </button>
          )}
        </div>
      </div>

      {/* right: context */}
      <aside className="space-y-4">
        <div className="glass p-4">
          <div className="label mb-2">Session gaps</div>
          {balance.missing.length === 0 ? (
            <p className="text-[12px] text-ok">No missing dimensions.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {balance.missing.map((m) => (
                <span key={m} className="pill text-bad">{dimensionLabel(m)}</span>
              ))}
            </div>
          )}
          <p className="mt-3 text-[12px] leading-relaxed text-moss">{balance.recommendation}</p>
        </div>
        <div className="glass p-4">
          <div className="label mb-2">Constraints</div>
          <p className="text-[12px] leading-relaxed text-moss">
            {b.constraints.players} players · {b.constraints.teams} teams ·{" "}
            {b.constraints.activePlayersPerRound} active × {b.constraints.stations} station
            {b.constraints.stations > 1 ? "s" : ""} · {b.constraints.durationMin}&apos; ·{" "}
            {b.constraints.intensity} intensity
          </p>
        </div>
        <div className="glass p-4">
          <div className="label mb-2">Recommended mechanics</div>
          <p className="text-[12px] leading-relaxed text-moss">
            {balance.competitionBalance.verdict === "team-heavy"
              ? "personal best, limited attempts — restore individual stakes."
              : balance.competitionBalance.verdict === "individual-heavy"
                ? "team vs team, comeback rule — restore team stakes."
                : "bonus target, streak bonus — raise peaks without more load."}
          </p>
        </div>
      </aside>
    </div>
  );
}

function StepCard({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="glass p-6">
      <h2 className="font-cond text-xl font-bold uppercase tracking-wide text-cream">{title}</h2>
      <p className="mt-0.5 text-[12px] text-moss">{sub}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Num({ label, k, min, max }: { label: string; k: never | keyof import("@/types").DrillConstraints; min: number; max: number }) {
  const b = useDrillBuilder();
  return (
    <label className="block">
      <span className="label-sm">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={b.constraints[k] as number}
        onChange={(e) => b.setConstraint(k, Number(e.target.value) as never)}
        className="input mt-1"
      />
    </label>
  );
}

function Sel({ label, k, options }: { label: string; k: keyof import("@/types").DrillConstraints; options: string[] }) {
  const b = useDrillBuilder();
  return (
    <label className="block">
      <span className="label-sm">{label}</span>
      <select
        value={b.constraints[k] as string}
        onChange={(e) => b.setConstraint(k, e.target.value as never)}
        className="input mt-1"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

function ConceptCard({
  c,
  onSelect,
  saving,
}: {
  c: GeneratedDrillConcept;
  onSelect: () => void;
  saving: boolean;
}) {
  const badge = {
    reliable: { label: "Concept A — Reliable", cls: "text-ok border-ok/60 bg-ok/10" },
    matchfit: { label: "Concept B — Most MatchFIT", cls: "text-blue border-blue/60 bg-blue/10" },
    experimental: { label: "Concept C — Experimental", cls: "text-warn border-warn/60 bg-warn/10" },
  }[c.conceptType];
  return (
    <div className="glass p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className={`inline-flex rounded-full border px-2.5 py-0.5 font-cond text-[10px] uppercase tracking-[0.14em] ${badge.cls}`}>
            {badge.label}
          </span>
          <h3 className="mt-2 text-lg font-semibold text-cream">{c.name}</h3>
          <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-moss">{c.summary}</p>
        </div>
        <div className="text-right">
          <div className="label-sm">Selection score</div>
          <div className="font-cond text-2xl font-bold text-blue">{c.selectionScore.toFixed(0)}</div>
          <FlowBadge status={c.estimatedMetrics.flowStatus} />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[12px] text-moss sm:grid-cols-4">
        <span>novelty <b className="text-cream">{c.novelty}</b></span>
        <span>attempts/player <b className="text-cream">{c.estimatedMetrics.attemptsPerPlayer}</b></span>
        <span>rules <b className="text-cream">{c.rules.filter((r) => r.enabled).length}</b></span>
        <span>scoring events <b className="text-cream">{c.scoringRules.filter((r) => r.enabled).length}</b></span>
      </div>
      <p className="mt-2 text-[12px] text-blue">{c.sessionFitExplanation}</p>
      <div className="mt-3 flex gap-2 border-t border-line pt-3">
        <button className="btn-primary !px-3 !py-1.5 !text-[12px]" disabled={saving} onClick={onSelect}>
          {saving ? "Opening studio…" : "Select → Rule Studio"}
        </button>
      </div>
    </div>
  );
}
