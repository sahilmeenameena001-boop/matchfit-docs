"use client";

/** Live scoring (spec §19): timer, rounds, tap-only event capture generated
 *  from the drill's active scoring rules, undo, and completion → review. */
import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Award, Check, Pause, Play, RotateCcw, SkipForward, Square } from "lucide-react";
import { useLiveScoring } from "@/playlab/store/live-scoring-store";
import { completeRunAction, submitReviewAction, type LiveEventInput } from "@/playlab/lib/actions";
import type { DrillView } from "@/playlab/types";
import { FlowBadge, StatusPill } from "@/playlab/components/ui";
import { calculateFlow } from "@/playlab/lib/player-flow";

interface LiveDrill {
  sessionDrillId: string;
  durationMin: number;
  status: string;
  drill: DrillView;
}
interface LivePlayer {
  id: string;
  name: string;
  teamId: string | null;
}
interface LiveTeam {
  id: string;
  name: string;
  color: string;
}

export function LiveScoringPanel({
  sessionId,
  sessionTitle,
  drills,
  players,
  teams,
}: {
  sessionId: string;
  sessionTitle: string;
  drills: LiveDrill[];
  players: LivePlayer[];
  teams: LiveTeam[];
}) {
  const live = useLiveScoring();
  const [runId, setRunId] = useState<string | null>(null);
  const [playerOfDrill, setPlayerOfDrill] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const active = drills.find((d) => d.sessionDrillId === live.sessionDrillId) ?? null;

  useEffect(() => {
    const t = setInterval(() => useLiveScoring.getState().tick(), 1000);
    return () => clearInterval(t);
  }, []);

  const xpFired = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of live.events) {
      if (!e.playerId) continue;
      const k = `${e.playerId}|${e.eventType}`;
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }, [live.events]);

  if (!active) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="label">Live scoring</div>
        <h1 className="mt-1 font-cond text-3xl font-bold uppercase tracking-wide text-cream">
          {sessionTitle}
        </h1>
        <p className="mt-1 text-[12px] text-moss">Pick the drill you are about to run.</p>
        <div className="mt-6 space-y-3">
          {drills.map((d) => (
            <button
              key={d.sessionDrillId}
              onClick={() => live.start(d.sessionDrillId)}
              className="glass flex w-full flex-wrap items-center justify-between gap-3 p-5 text-left hover:border-blue/50"
            >
              <div>
                <div className="font-semibold text-cream">{d.drill.name}</div>
                <div className="mt-0.5 text-[12px] text-moss">
                  {d.durationMin}&apos; · {d.drill.scoringRules.filter((s) => s.enabled).length} scoring events · {d.status}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <FlowBadge status={calculateFlow(d.drill.constraints).flowStatus} />
                <StatusPill status={d.drill.status} />
                <Play size={18} className="text-blue" />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const scoringButtons = active.drill.scoringRules.filter((s) => s.enabled);
  const playerScore = new Map<string, number>();
  const teamScore = new Map<string, number>();
  let totalXp = 0;
  for (const e of live.events) {
    if (e.playerId) playerScore.set(e.playerId, (playerScore.get(e.playerId) ?? 0) + e.points);
    if (e.teamId) teamScore.set(e.teamId, (teamScore.get(e.teamId) ?? 0) + e.points);
    totalXp += e.xp;
  }

  const xpForEvent = (eventType: string, playerId: string | null): number => {
    let xp = 0;
    for (const r of active.drill.xpRules) {
      if (!r.enabled || r.category === "participation") continue;
      if (r.sourceEventType !== eventType) continue;
      if (playerId && r.dailyCap !== undefined) {
        const fired = xpFired.get(`${playerId}|${eventType}`) ?? 0;
        if (fired >= r.dailyCap) continue;
      }
      xp += r.xp;
    }
    return xp;
  };

  const record = (rule: (typeof scoringButtons)[number]) => {
    const isTeam = rule.appliesTo === "team";
    const playerId = isTeam ? undefined : (live.selectedPlayerId ?? undefined);
    const teamId = isTeam
      ? (live.selectedTeamId ??
        (live.selectedPlayerId
          ? (players.find((p) => p.id === live.selectedPlayerId)?.teamId ?? undefined)
          : undefined))
      : (players.find((p) => p.id === live.selectedPlayerId)?.teamId ?? undefined);
    if (!playerId && !teamId) return; // must select someone first
    live.record({
      eventType: rule.eventType,
      label: rule.label,
      points: rule.points,
      xp: xpForEvent(rule.eventType, playerId ?? null),
      round: live.round,
      playerId,
      teamId: teamId ?? undefined,
    });
  };

  const completeDrill = () =>
    start(async () => {
      // Participation + team-win XP sweep at completion.
      const finalEvents: LiveEventInput[] = [...live.events];
      const partRule = active.drill.xpRules.find((r) => r.enabled && r.category === "participation");
      const activePlayers = new Set(live.events.map((e) => e.playerId).filter(Boolean) as string[]);
      if (partRule) {
        for (const pid of activePlayers) {
          finalEvents.push({
            eventType: "participation",
            label: partRule.label,
            points: 0,
            xp: partRule.xp,
            round: live.round,
            playerId: pid,
            teamId: players.find((p) => p.id === pid)?.teamId ?? undefined,
          });
        }
      }
      const teamXpRule = active.drill.xpRules.find(
        (r) => r.enabled && r.category === "teamwork" && r.sourceEventType === "roundWin"
      );
      if (teamXpRule) {
        const wins = new Map<string, number>();
        for (const e of live.events)
          if (e.eventType === "roundWin" && e.teamId)
            wins.set(e.teamId, (wins.get(e.teamId) ?? 0) + 1);
        for (const [teamId, count] of wins) {
          const credited = Math.min(count, teamXpRule.dailyCap ?? count);
          for (const p of players.filter((x) => x.teamId === teamId)) {
            if (activePlayers.has(p.id)) {
              finalEvents.push({
                eventType: "teamWinXp",
                label: teamXpRule.label,
                points: 0,
                xp: teamXpRule.xp * credited,
                round: live.round,
                playerId: p.id,
                teamId,
              });
            }
          }
        }
      }
      const res = await completeRunAction({
        sessionDrillId: active.sessionDrillId,
        rounds: live.round,
        events: finalEvents,
        playerOfDrillId: playerOfDrill ?? undefined,
      });
      setRunId(res.runId);
    });

  /* ---------- review state ---------- */
  if (runId) {
    return (
      <ReviewForm
        runId={runId}
        sessionId={sessionId}
        drillName={active.drill.name}
        recommendation={recommendation}
        onDone={(rec) => setRecommendation(rec)}
      />
    );
  }

  const mm = String(Math.floor(live.seconds / 60)).padStart(2, "0");
  const ss = String(live.seconds % 60).padStart(2, "0");

  return (
    <div className="mx-auto max-w-4xl">
      {/* timer bar */}
      <div className="glass-deep flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-4">
          <div className="font-cond text-4xl font-bold tabular-nums text-cream">{mm}:{ss}</div>
          <div>
            <div className="label-sm">Round</div>
            <div className="font-cond text-xl font-bold text-blue">{live.round}</div>
          </div>
          <div className="min-w-0">
            <div className="label-sm">Drill</div>
            <div className="truncate text-sm font-semibold text-cream">{active.drill.name}</div>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost !px-3" onClick={() => live.setRunning(!live.running)}>
            {live.running ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button className="btn-ghost !px-3" onClick={() => live.nextRound()}>
            <SkipForward size={16} /> Round
          </button>
          <button className="btn-primary !px-3" disabled={pending} onClick={completeDrill}>
            <Square size={15} /> {pending ? "Saving…" : "End drill"}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_290px]">
        <div>
          {/* team chips */}
          <div className="flex flex-wrap gap-2">
            {teams.map((t) => (
              <button
                key={t.id}
                onClick={() => live.select(null, t.id)}
                className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                  live.selectedTeamId === t.id
                    ? "border-blue bg-blue/15 text-cream"
                    : "border-line text-cream/70 hover:border-cream/40"
                }`}
              >
                <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: t.color }} />
                {t.name}
                <span className="num-blue ml-2">{teamScore.get(t.id) ?? 0}</span>
              </button>
            ))}
          </div>

          {/* player chips */}
          <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {players.map((p) => (
              <button
                key={p.id}
                onClick={() => live.select(p.id, null)}
                className={`truncate rounded-xl border px-2.5 py-2 text-left text-[13px] ${
                  live.selectedPlayerId === p.id
                    ? "border-blue bg-blue/15 text-cream"
                    : "border-line text-cream/70 hover:border-cream/40"
                }`}
              >
                {p.name}
                <span className="num-blue ml-1.5">{playerScore.get(p.id) ?? 0}</span>
              </button>
            ))}
          </div>

          {/* event buttons */}
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {scoringButtons.map((s) => (
              <button
                key={s.id}
                onClick={() => record(s)}
                disabled={!live.selectedPlayerId && !live.selectedTeamId}
                className="rounded-2xl border border-blue/40 bg-blue/10 px-3 py-4 text-sm font-bold text-cream transition-colors hover:bg-blue/25 disabled:opacity-30"
              >
                + {s.label}
                <div className="label-sm mt-0.5">
                  {s.points} pt{s.points === 1 ? "" : "s"} · {s.appliesTo}
                </div>
              </button>
            ))}
          </div>
          {!live.selectedPlayerId && !live.selectedTeamId && (
            <p className="mt-2 text-[12px] text-warn">Select a player or team first.</p>
          )}
          <div className="mt-3 flex gap-2">
            <button className="btn-ghost !px-3 !py-1.5 !text-[12px]" onClick={() => live.undo()}>
              <RotateCcw size={13} /> Undo last
            </button>
          </div>
        </div>

        {/* feed + xp */}
        <aside className="space-y-3">
          <div className="glass p-4">
            <div className="flex items-center justify-between">
              <div className="label">XP earned</div>
              <div className="font-cond text-2xl font-bold text-ok">{totalXp}</div>
            </div>
            <div className="label-sm mt-1">performance XP so far (participation adds at the end)</div>
          </div>
          <div className="glass p-4">
            <div className="label mb-2">Player of the drill</div>
            <select
              className="input"
              value={playerOfDrill ?? ""}
              onChange={(e) => setPlayerOfDrill(e.target.value || null)}
            >
              <option value="">— pick later —</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <Award size={14} className="mt-2 text-warn" />
          </div>
          <div className="glass max-h-[320px] overflow-y-auto p-4">
            <div className="label mb-2">Event feed</div>
            {live.events.length === 0 && <p className="text-[12px] text-moss">No events yet.</p>}
            <ul className="space-y-1.5">
              {[...live.events].reverse().map((e, i) => (
                <li key={i} className="flex justify-between gap-2 text-[12px] text-cream/85">
                  <span className="truncate">
                    R{e.round} · {e.label}
                    {e.playerId && (
                      <span className="text-moss"> — {players.find((p) => p.id === e.playerId)?.name}</span>
                    )}
                    {!e.playerId && e.teamId && (
                      <span className="text-moss"> — {teams.find((t) => t.id === e.teamId)?.name}</span>
                    )}
                  </span>
                  <span className="num-blue flex-none">+{e.points}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ------------------------- post-session review ---------------------------- */

const REVIEW_FIELDS = [
  ["easeOfExplanation", "Ease of explanation"],
  ["playerEnjoyment", "Player enjoyment"],
  ["objectiveAchieved", "Objective achieved"],
  ["scoringClarity", "Scoring clarity"],
  ["operationalEase", "Operational ease"],
  ["contentQuality", "Content quality"],
  ["safety", "Safety"],
] as const;

function ReviewForm({
  runId,
  sessionId,
  drillName,
  recommendation,
  onDone,
}: {
  runId: string;
  sessionId: string;
  drillName: string;
  recommendation: string | null;
  onDone: (rec: string) => void;
}) {
  const [scores, setScores] = useState<Record<string, number>>(
    Object.fromEntries(REVIEW_FIELDS.map(([k]) => [k, 4]))
  );
  const [actualDurationMin, setActualDurationMin] = useState(15);
  const [attemptsPerPlayer, setAttemptsPerPlayer] = useState(4);
  const [queueIssue, setQueueIssue] = useState(false);
  const [runAgain, setRunAgain] = useState(true);
  const [notes, setNotes] = useState("");
  const [pending, start] = useTransition();
  const live = useLiveScoring();

  if (recommendation) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="glass p-6 text-center">
          <Check size={32} className="mx-auto text-ok" />
          <h2 className="mt-2 font-cond text-2xl font-bold uppercase text-cream">Review saved</h2>
          <p className="mt-3 text-sm leading-relaxed text-cream/85">{recommendation}</p>
          <div className="mt-5 flex justify-center gap-2">
            <Link href={`/playlab/sessions/${sessionId}`} className="btn-primary" onClick={() => live.reset()}>
              Back to session
            </Link>
            <Link href="/playlab/leaderboard" className="btn-ghost" onClick={() => live.reset()}>
              View leaderboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="label">Post-session review</div>
      <h1 className="mt-1 font-cond text-2xl font-bold uppercase tracking-wide text-cream">
        {drillName}
      </h1>
      <div className="glass mt-4 space-y-4 p-5">
        {REVIEW_FIELDS.map(([key, label]) => (
          <div key={key} className="flex items-center justify-between gap-3">
            <span className="text-sm text-cream/85">{label}</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setScores((s) => ({ ...s, [key]: n }))}
                  className={`h-8 w-8 rounded-lg border font-cond text-sm font-bold ${
                    scores[key] >= n ? "border-blue bg-blue/20 text-cream" : "border-line text-dim"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        ))}
        <div className="grid grid-cols-2 gap-3 border-t border-line pt-3">
          <label className="block">
            <span className="label-sm">Actual duration (min)</span>
            <input type="number" className="input mt-1" value={actualDurationMin}
              onChange={(e) => setActualDurationMin(Number(e.target.value))} />
          </label>
          <label className="block">
            <span className="label-sm">Attempts per player</span>
            <input type="number" className="input mt-1" value={attemptsPerPlayer}
              onChange={(e) => setAttemptsPerPlayer(Number(e.target.value))} />
          </label>
        </div>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm text-cream/85">
            <input type="checkbox" checked={queueIssue} onChange={(e) => setQueueIssue(e.target.checked)} className="h-4 w-4 accent-[#d9a441]" />
            Queue issue occurred
          </label>
          <label className="flex items-center gap-2 text-sm text-cream/85">
            <input type="checkbox" checked={runAgain} onChange={(e) => setRunAgain(e.target.checked)} className="h-4 w-4 accent-[#58b98b]" />
            Run again
          </label>
        </div>
        <textarea
          className="input min-h-[70px]"
          placeholder="Coach notes…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <button
          className="btn-primary w-full"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await submitReviewAction({
                runId,
                easeOfExplanation: scores.easeOfExplanation,
                playerEnjoyment: scores.playerEnjoyment,
                objectiveAchieved: scores.objectiveAchieved,
                scoringClarity: scores.scoringClarity,
                operationalEase: scores.operationalEase,
                contentQuality: scores.contentQuality,
                safety: scores.safety,
                actualDurationMin,
                attemptsPerPlayer,
                queueIssue,
                notes,
                runAgain,
              });
              onDone(res.recommendation);
            })
          }
        >
          {pending ? "Saving…" : "Submit review"}
        </button>
      </div>
    </div>
  );
}
