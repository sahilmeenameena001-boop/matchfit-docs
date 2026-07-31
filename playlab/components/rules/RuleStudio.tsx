"use client";

/** Rule Permutation Studio (spec §11–17): edit rules and parameters with the
 *  compatibility engine, scoring/XP builders, flow metrics and a live round
 *  simulation reacting to every change. */
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Plus, Save, Trash2 } from "lucide-react";
import { validateDrill } from "@/lib/rule-engine";
import { calculateFlow } from "@/lib/player-flow";
import { scoreEvents } from "@/lib/scoring-engine";
import { computeXP, xpGuardrails } from "@/lib/xp-engine";
import { saveDrillAction } from "@/lib/actions";
import { FlowBadge, IssueBadge, StatusPill } from "@/components/ui";
import type {
  DrillConstraints,
  DrillRule,
  DrillView,
  RuleCategory,
  ScoringRule,
  SimEvent,
  XPEvent,
} from "@/types";

const CATEGORIES: RuleCategory[] = [
  "start", "action", "success", "bonus", "penalty", "progression", "tiebreak",
];

const RULE_TEMPLATES: Record<RuleCategory, Array<Omit<DrillRule, "id">>> = {
  start: [
    { category: "start", title: "Randomised start", description: "Possession source is randomised each round.", enabled: true, parameters: { randomisedStart: true } },
    { category: "start", title: "Fixed starting positions", description: "Players restart from marked cones.", enabled: true, parameters: { positions: 3 } },
  ],
  action: [
    { category: "action", title: "Limited touches", description: "Maximum touches per action.", enabled: true, parameters: { maxTouches: 2 } },
    { category: "action", title: "Unlimited touches", description: "No touch restriction.", enabled: true, parameters: { unlimitedTouches: true } },
    { category: "action", title: "Weak-foot attempts", description: "Weak-foot actions are flagged for bonuses.", enabled: true, parameters: { required: false } },
    { category: "action", title: "Passing requirement", description: "A minimum pass count before scoring.", enabled: true, parameters: { minPasses: 3 } },
    { category: "action", title: "Defender restriction", description: "Defenders press passively.", enabled: true, parameters: { passive: true } },
  ],
  success: [
    { category: "success", title: "Target score ends round", description: "First to the target score wins the round.", enabled: true, parameters: { endsRound: true, targetScore: 5 } },
    { category: "success", title: "Countdown ends round", description: "Highest score when time expires wins.", enabled: true, parameters: { endsRound: true } },
  ],
  bonus: [
    { category: "bonus", title: "Streak bonus", description: "Consecutive successes earn bonus points.", enabled: true, parameters: { streakLength: 3, bonusPoints: 2 } },
    { category: "bonus", title: "Weak-foot bonus", description: "Weak-foot success earns +1.", enabled: true, parameters: { bonusPoints: 1 } },
    { category: "bonus", title: "Comeback multiplier", description: "Trailing side scores double.", enabled: true, parameters: { multiplier: 2 } },
  ],
  penalty: [
    { category: "penalty", title: "Ball out", description: "Ball out of area concedes a point.", enabled: true, parameters: { penaltyPoints: 1 } },
    { category: "penalty", title: "Time violation", description: "Slow restarts concede possession.", enabled: true, parameters: { seconds: 5 } },
  ],
  progression: [
    { category: "progression", title: "Add active defender", description: "Introduce a live defender.", enabled: false, parameters: { defenders: 1 } },
    { category: "progression", title: "Reduce time", description: "Cut round time as success grows.", enabled: false, parameters: { secondsCut: 10 } },
    { category: "progression", title: "Narrow target", description: "Shrink the scoring target.", enabled: false, parameters: { widthFactor: 0.5 } },
  ],
  tiebreak: [
    { category: "tiebreak", title: "Sudden-death tie-break", description: "One decisive attempt.", enabled: true, parameters: { suddenDeath: true } },
    { category: "tiebreak", title: "Fastest time wins", description: "Quickest clean round takes it.", enabled: true, parameters: {} },
  ],
};

const SIM_PRESETS: Array<{ label: string; event: SimEvent }> = [
  { label: "Normal goal", event: { eventType: "goal" } },
  { label: "Correct target", event: { eventType: "targetHit" } },
  { label: "Completed pass", event: { eventType: "completedPass" } },
  { label: "Weak-foot action", event: { eventType: "custom" } },
  { label: "Interception", event: { eventType: "interception" } },
  { label: "3-action streak", event: { eventType: "streak" } },
  { label: "Round win", event: { eventType: "roundWin" } },
];

let seq = 100;
const nid = (p: string) => `${p}-${Date.now().toString(36)}-${++seq}`;

export function RuleStudio({
  drill,
  sessionId,
  xpTarget,
}: {
  drill: DrillView;
  sessionId?: string;
  xpTarget: { min: number; max: number };
}) {
  const [name, setName] = useState(drill.name);
  const [rules, setRules] = useState<DrillRule[]>(drill.rules);
  const [scoring, setScoring] = useState<ScoringRule[]>(drill.scoringRules);
  const [xp, setXp] = useState<XPEvent[]>(drill.xpRules);
  const [constraints, setConstraints] = useState<DrillConstraints>(drill.constraints);
  const [activeCat, setActiveCat] = useState<RuleCategory>("action");
  const [simEvents, setSimEvents] = useState<SimEvent[]>([
    { eventType: "goal" },
    { eventType: "targetHit" },
    { eventType: "streak" },
    { eventType: "roundWin" },
  ]);
  const [saving, startSaving] = useTransition();
  const [saved, setSaved] = useState(false);

  const issues = useMemo(
    () => [
      ...validateDrill({ rules, scoringRules: scoring, xpRules: xp, constraints }),
      ...xpGuardrails(xp, scoring, xpTarget),
    ],
    [rules, scoring, xp, constraints, xpTarget]
  );
  const flow = useMemo(() => calculateFlow(constraints), [constraints]);
  const simScore = useMemo(() => scoreEvents(simEvents, scoring), [simEvents, scoring]);
  const simXp = useMemo(() => computeXP(simEvents, xp), [simEvents, xp]);
  const enabledRules = rules.filter((r) => r.enabled).length;
  const complexity = enabledRules > 7 ? "Complex" : enabledRules > 4 ? "Moderate" : "Simple";
  // Rough derived difficulty: touch limits + defenders + narrow targets raise it.
  const difficulty = useMemo(() => {
    let score = 2;
    for (const r of rules.filter((x) => x.enabled)) {
      if (typeof r.parameters.maxTouches === "number") score += r.parameters.maxTouches <= 2 ? 2 : 1;
      if (r.parameters.defenders) score += 2;
      if (r.parameters.widthFactor) score += 1;
      if (r.parameters.minPasses) score += 1;
    }
    return Math.min(10, score);
  }, [rules]);
  const successRate = Math.max(15, 95 - difficulty * 8);

  const patchRule = (id: string, patch: Partial<DrillRule>) =>
    setRules((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const patchParam = (id: string, key: string, value: string | number | boolean) =>
    setRules((rs) =>
      rs.map((r) => (r.id === id ? { ...r, parameters: { ...r.parameters, [key]: value } } : r))
    );

  const save = (status?: string) =>
    startSaving(async () => {
      await saveDrillAction({
        drillId: drill.id,
        name,
        status,
        constraints,
        rules,
        scoringRules: scoring,
        xpRules: xp,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });

  const blocking = issues.some((i) => i.level === "blocking");

  return (
    <div className="mx-auto max-w-[1500px]">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href={sessionId ? `/sessions/${sessionId}` : `/drills/${drill.id}`}
            className="btn-ghost !px-2.5 !py-1.5"
          >
            <ArrowLeft size={15} />
          </Link>
          <div>
            <div className="label">Rule permutation studio</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-0.5 w-[340px] max-w-full border-b border-transparent bg-transparent font-cond text-2xl font-bold uppercase tracking-wide text-cream outline-none focus:border-blue"
            />
          </div>
          <StatusPill status={drill.status} />
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="text-[12px] text-ok">Saved ✓</span>}
          <button className="btn-ghost" disabled={saving} onClick={() => save()}>
            <Save size={15} /> Save draft
          </button>
          <button
            className="btn-primary"
            disabled={saving || blocking}
            title={blocking ? "Resolve blocking conflicts first" : ""}
            onClick={() => save("coachApproved")}
          >
            <Check size={15} /> Save &amp; approve
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[180px_1fr_330px]">
        {/* left: categories */}
        <aside className="glass h-fit p-3">
          {CATEGORIES.map((c) => {
            const count = rules.filter((r) => r.category === c && r.enabled).length;
            return (
              <button
                key={c}
                onClick={() => setActiveCat(c)}
                className={
                  activeCat === c
                    ? "flex w-full items-center justify-between rounded-xl bg-cream px-3 py-2 text-sm font-semibold capitalize text-[#101a12]"
                    : "flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm capitalize text-cream/65 hover:text-cream"
                }
              >
                {c}
                <span className={`num-blue text-[11px] ${activeCat === c ? "text-[#1f5fd0]" : ""}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </aside>

        {/* centre */}
        <div className="min-w-0 space-y-5">
          {/* rules of active category */}
          <div className="space-y-3">
            {rules
              .filter((r) => r.category === activeCat)
              .map((r) => (
                <div key={r.id} className={`glass p-4 ${r.enabled ? "" : "opacity-55"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-cream">{r.title}</div>
                      <p className="mt-0.5 text-[12px] text-moss">{r.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => patchRule(r.id, { enabled: !r.enabled })}
                        className={`h-6 w-11 rounded-full border transition-colors ${r.enabled ? "border-blue bg-blue/30" : "border-line bg-transparent"}`}
                      >
                        <span
                          className={`block h-4 w-4 rounded-full bg-cream transition-transform ${r.enabled ? "translate-x-6" : "translate-x-1"}`}
                        />
                      </button>
                      <button
                        onClick={() => setRules((rs) => rs.filter((x) => x.id !== r.id))}
                        className="rounded-lg border border-line p-1.5 text-cream/60 hover:border-bad/60 hover:text-bad"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  {Object.keys(r.parameters).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-3 border-t border-line pt-3">
                      {Object.entries(r.parameters).map(([k, v]) => (
                        <label key={k} className="flex items-center gap-2 text-[12px] text-moss">
                          {k}
                          {typeof v === "boolean" ? (
                            <input
                              type="checkbox"
                              checked={v}
                              onChange={(e) => patchParam(r.id, k, e.target.checked)}
                              className="h-4 w-4 accent-[#3d8bfd]"
                            />
                          ) : typeof v === "number" ? (
                            <input
                              type="number"
                              value={v}
                              onChange={(e) => patchParam(r.id, k, Number(e.target.value))}
                              className="input !w-20 !px-2 !py-1 text-center"
                            />
                          ) : (
                            <input
                              value={v}
                              onChange={(e) => patchParam(r.id, k, e.target.value)}
                              className="input !w-28 !px-2 !py-1"
                            />
                          )}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            <div className="flex flex-wrap gap-2">
              {RULE_TEMPLATES[activeCat].map((t) => (
                <button
                  key={t.title}
                  className="btn-ghost !px-3 !py-1.5 !text-[12px]"
                  onClick={() => setRules((rs) => [...rs, { ...t, id: nid("r") }])}
                >
                  <Plus size={12} /> {t.title}
                </button>
              ))}
            </div>
          </div>

          {/* scoring builder */}
          <div className="glass p-4">
            <div className="mb-1 flex items-center justify-between">
              <div>
                <div className="label">Drill score</div>
                <p className="text-[11px] text-moss">Determines who wins this game.</p>
              </div>
              <button
                className="btn-ghost !px-3 !py-1.5 !text-[12px]"
                onClick={() =>
                  setScoring((s) => [
                    ...s,
                    { id: nid("s"), eventType: "custom", label: "New event", points: 1, appliesTo: "player", enabled: true },
                  ])
                }
              >
                <Plus size={12} /> Add event
              </button>
            </div>
            <div className="mt-2 space-y-2">
              {scoring.map((s) => (
                <div key={s.id} className={`flex flex-wrap items-center gap-2 rounded-xl border border-line p-2 ${s.enabled ? "" : "opacity-50"}`}>
                  <input
                    value={s.label}
                    onChange={(e) => setScoring((all) => all.map((x) => (x.id === s.id ? { ...x, label: e.target.value } : x)))}
                    className="input !w-44 !px-2 !py-1"
                  />
                  <select
                    value={s.eventType}
                    onChange={(e) => setScoring((all) => all.map((x) => (x.id === s.id ? { ...x, eventType: e.target.value } : x)))}
                    className="input !w-36 !px-2 !py-1"
                  >
                    {["goal", "targetHit", "completedPass", "interception", "defensiveStop", "assist", "roundWin", "streak", "timeBonus", "custom"].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <label className="flex items-center gap-1 text-[11px] text-moss">
                    pts
                    <input
                      type="number"
                      value={s.points}
                      onChange={(e) => setScoring((all) => all.map((x) => (x.id === s.id ? { ...x, points: Number(e.target.value) } : x)))}
                      className="input !w-16 !px-2 !py-1 text-center"
                    />
                  </label>
                  <select
                    value={s.appliesTo}
                    onChange={(e) => setScoring((all) => all.map((x) => (x.id === s.id ? { ...x, appliesTo: e.target.value as "player" | "team" } : x)))}
                    className="input !w-24 !px-2 !py-1"
                  >
                    <option value="player">player</option>
                    <option value="team">team</option>
                  </select>
                  <label className="flex items-center gap-1 text-[11px] text-moss">
                    cap
                    <input
                      type="number"
                      value={s.maxOccurrences ?? ""}
                      placeholder="∞"
                      onChange={(e) =>
                        setScoring((all) =>
                          all.map((x) =>
                            x.id === s.id
                              ? { ...x, maxOccurrences: e.target.value === "" ? undefined : Number(e.target.value) }
                              : x
                          )
                        )
                      }
                      className="input !w-14 !px-1 !py-1 text-center"
                    />
                  </label>
                  <button
                    onClick={() => setScoring((all) => all.map((x) => (x.id === s.id ? { ...x, enabled: !x.enabled } : x)))}
                    className="pill hover:border-blue/60"
                  >
                    {s.enabled ? "on" : "off"}
                  </button>
                  <button
                    onClick={() => setScoring((all) => all.filter((x) => x.id !== s.id))}
                    className="rounded-lg border border-line p-1 text-cream/60 hover:border-bad/60 hover:text-bad"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* xp builder */}
          <div className="glass p-4">
            <div className="mb-1 flex items-center justify-between">
              <div>
                <div className="label !text-ok">MatchFIT XP</div>
                <p className="text-[11px] text-moss">Contributes to player progression and leaderboards.</p>
              </div>
              <button
                className="btn-ghost !px-3 !py-1.5 !text-[12px]"
                onClick={() =>
                  setXp((all) => [
                    ...all,
                    { id: nid("x"), sourceEventType: "goal", label: "New XP event", xp: 5, category: "performance", dailyCap: 3, enabled: true },
                  ])
                }
              >
                <Plus size={12} /> Add XP rule
              </button>
            </div>
            <div className="mt-2 space-y-2">
              {xp.map((x) => (
                <div key={x.id} className={`flex flex-wrap items-center gap-2 rounded-xl border border-line p-2 ${x.enabled ? "" : "opacity-50"}`}>
                  <input
                    value={x.label}
                    onChange={(e) => setXp((all) => all.map((y) => (y.id === x.id ? { ...y, label: e.target.value } : y)))}
                    className="input !w-48 !px-2 !py-1"
                  />
                  <select
                    value={x.sourceEventType}
                    onChange={(e) => setXp((all) => all.map((y) => (y.id === x.id ? { ...y, sourceEventType: e.target.value } : y)))}
                    className="input !w-36 !px-2 !py-1"
                  >
                    {["participation", "goal", "targetHit", "completedPass", "interception", "roundWin", "streak", "custom", "fairPlay"].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <label className="flex items-center gap-1 text-[11px] text-moss">
                    XP
                    <input
                      type="number"
                      value={x.xp}
                      onChange={(e) => setXp((all) => all.map((y) => (y.id === x.id ? { ...y, xp: Number(e.target.value) } : y)))}
                      className="input !w-16 !px-2 !py-1 text-center"
                    />
                  </label>
                  <select
                    value={x.category}
                    onChange={(e) => setXp((all) => all.map((y) => (y.id === x.id ? { ...y, category: e.target.value as XPEvent["category"] } : y)))}
                    className="input !w-32 !px-2 !py-1"
                  >
                    {["participation", "performance", "improvement", "teamwork", "fairPlay", "personalBest"].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <label className="flex items-center gap-1 text-[11px] text-moss">
                    cap
                    <input
                      type="number"
                      value={x.dailyCap ?? ""}
                      placeholder="∞"
                      onChange={(e) =>
                        setXp((all) =>
                          all.map((y) =>
                            y.id === x.id
                              ? { ...y, dailyCap: e.target.value === "" ? undefined : Number(e.target.value) }
                              : y
                          )
                        )
                      }
                      className="input !w-14 !px-1 !py-1 text-center"
                    />
                  </label>
                  <button
                    onClick={() => setXp((all) => all.map((y) => (y.id === x.id ? { ...y, enabled: !y.enabled } : y)))}
                    className="pill hover:border-blue/60"
                  >
                    {x.enabled ? "on" : "off"}
                  </button>
                  <button
                    onClick={() => setXp((all) => all.filter((y) => y.id !== x.id))}
                    className="rounded-lg border border-line p-1 text-cream/60 hover:border-bad/60 hover:text-bad"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* right rail */}
        <aside className="space-y-4">
          <div className="glass-deep p-4">
            <div className="label mb-2">Compatibility</div>
            {issues.length === 0 ? (
              <p className="text-[12px] text-ok">No conflicts detected.</p>
            ) : (
              <ul className="space-y-2">
                {issues.map((i, k) => (
                  <li key={k} className="flex items-start gap-2 text-[12px] leading-relaxed text-cream/85">
                    <IssueBadge level={i.level} />
                    <span>{i.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="glass p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="label">Player flow</div>
              <FlowBadge status={flow.flowStatus} />
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <Mini label="rounds" value={String(flow.roundsPossible)} />
              <Mini label="attempts/player" value={String(flow.attemptsPerPlayer)} />
              <Mini label="active time" value={`${flow.activeTimeMin}'`} />
              <Mini label="waiting" value={`${flow.waitingSec}s`} />
              <Mini label="queue" value={String(flow.queueSize)} />
              <Mini label="participation" value={`${Math.round(flow.participationRatio * 100)}%`} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <ConNum label="active/round" value={constraints.activePlayersPerRound} onChange={(v) => setConstraints((c) => ({ ...c, activePlayersPerRound: v }))} />
              <ConNum label="stations" value={constraints.stations} onChange={(v) => setConstraints((c) => ({ ...c, stations: v }))} />
              <ConNum label="round sec" value={constraints.roundSec} onChange={(v) => setConstraints((c) => ({ ...c, roundSec: v }))} />
              <ConNum label="duration min" value={constraints.durationMin} onChange={(v) => setConstraints((c) => ({ ...c, durationMin: v }))} />
            </div>
            <div className="mt-3 border-t border-line pt-2 text-[11px] text-moss">
              complexity <b className="text-cream">{complexity}</b> · difficulty{" "}
              <b className="text-cream">{difficulty}/10</b> · est. success{" "}
              <b className="text-cream">{successRate}%</b>
            </div>
          </div>

          <div className="glass p-4">
            <div className="label mb-2">Round simulation</div>
            <div className="flex flex-wrap gap-1.5">
              {SIM_PRESETS.map((p) => (
                <button
                  key={p.label}
                  className="pill hover:border-blue/60"
                  onClick={() => setSimEvents((e) => [...e, p.event])}
                >
                  + {p.label}
                </button>
              ))}
              <button className="pill hover:border-bad/60" onClick={() => setSimEvents([])}>
                clear
              </button>
            </div>
            <div className="mt-3 border-t border-line pt-2">
              <div className="label-sm mb-1">Drill score</div>
              {simScore.lines.map((l, i) => (
                <div key={i} className="flex justify-between text-[12px] text-cream/85">
                  <span>{l.label}</span>
                  <span className="font-cond text-blue">+{l.points}</span>
                </div>
              ))}
              <div className="mt-1 flex justify-between border-t border-line pt-1 text-[13px] font-bold text-cream">
                <span>Total drill score</span>
                <span className="font-cond text-blue">{simScore.total}</span>
              </div>
              {simScore.unscored.length > 0 && (
                <p className="mt-1 text-[11px] text-warn">
                  unmatched: {[...new Set(simScore.unscored)].join(", ")}
                </p>
              )}
            </div>
            <div className="mt-3 border-t border-line pt-2">
              <div className="label-sm mb-1 !text-ok">MatchFIT XP</div>
              {simXp.lines.map((l, i) => (
                <div key={i} className="flex justify-between text-[12px] text-cream/85">
                  <span>{l.label}</span>
                  <span className="font-cond text-ok">+{l.xp} XP</span>
                </div>
              ))}
              <div className="mt-1 flex justify-between border-t border-line pt-1 text-[13px] font-bold text-cream">
                <span>Total MatchFIT XP</span>
                <span className="font-cond text-ok">{simXp.total} XP</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line px-2 py-1.5">
      <div className="font-cond text-base font-bold text-cream">{value}</div>
      <div className="label-sm">{label}</div>
    </div>
  );
}

function ConNum({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="label-sm">{label}</span>
      <input
        type="number"
        min={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="input mt-0.5 !px-2 !py-1 text-center"
      />
    </label>
  );
}
