"use client";

/**
 * Planning / Integration working page (staff).
 *
 * Two tools:
 *  A) Ideation → Calendar: ideate an activity (e.g. a football drill) for a date;
 *     it's added to the calendar for that day (and attached to the loaded plan).
 *  B) Session plan: generate a draft plan for a session, review sections, confirm.
 *
 * Talks to POST /api/ideation, POST /api/plans/generate, GET|PATCH /api/plans/:id.
 * Writes require a logged-in staff account (the API enforces this).
 */
import { useState } from "react";
import Link from "next/link";

type Plan = {
  session_id: string;
  plan_date: string;
  status: string;
  squads: unknown[];
  stations: unknown[];
  challenges: unknown[];
  pairings: unknown[];
  match_schedule: unknown[];
  movement_plan: unknown[];
  notes: string | null;
};

const PILLARS = [
  { value: 1, label: "Pillar 1 · Footy Training (drills)" },
  { value: 2, label: "Pillar 2 · Gamified Football Drills" },
  { value: 3, label: "Pillar 3 · 1v1 Duels" },
  { value: 4, label: "Pillar 4 · Small-Cluster Matches" },
  { value: 5, label: "Pillar 5 · Physio & Core" },
];

const SECTIONS: { key: keyof Plan; label: string }[] = [
  { key: "squads", label: "Squads (A–F)" },
  { key: "stations", label: "Pillar 1 · Stations" },
  { key: "challenges", label: "Pillar 2 · Challenges" },
  { key: "pairings", label: "Pillar 3 · 1v1 Pairings" },
  { key: "match_schedule", label: "Pillar 4 · Match Schedule" },
  { key: "movement_plan", label: "Pillar 5 · Movement Plan" },
];

export default function PlanPage() {
  // ----- shared session context -----
  const [sessionId, setSessionId] = useState("");
  const [planDate, setPlanDate] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);

  // ----- ideation form -----
  const [idea, setIdea] = useState({ pillar: 1, date: "", title: "", notes: "" });
  const [ideaMsg, setIdeaMsg] = useState("");
  const [ideaOk, setIdeaOk] = useState(false);

  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const call = async (url: string, method: string, body?: unknown) => {
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json();
      return { okFlag: res.ok && json.success, json };
    } catch {
      return { okFlag: false, json: null };
    }
  };

  // --- A) Ideate -> calendar ---
  const addIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    setIdeaMsg("");
    setIdeaOk(false);
    if (!idea.title || !idea.date) {
      setIdeaMsg("Enter an activity name and date.");
      return;
    }
    setBusy(true);
    const { okFlag, json } = await call("/api/ideation", "POST", {
      pillarNumber: idea.pillar,
      scheduledDate: idea.date,
      title: idea.title,
      notes: idea.notes || undefined,
      sessionId: sessionId || undefined,
    });
    setBusy(false);
    if (!okFlag) {
      setIdeaMsg(json?.error?.message ?? "Could not add the idea. (Staff login required.)");
      return;
    }
    setIdeaOk(true);
    setIdeaMsg(
      `Added to the calendar on ${idea.date}` +
        (json.data?.linkedToPlan ? " and attached to this session's plan." : ".")
    );
    setIdea({ ...idea, title: "", notes: "" });
  };

  // --- B) Session plan ---
  const generate = async () => {
    setMsg("");
    if (!sessionId || !planDate) {
      setMsg("Enter a session id and date.");
      return;
    }
    setBusy(true);
    const { okFlag, json } = await call("/api/plans/generate", "POST", {
      sessionId,
      planDate,
    });
    setBusy(false);
    if (!okFlag) {
      setMsg(json?.error?.message ?? "Could not generate plan.");
      return;
    }
    setPlan(json.data);
    setMsg("Draft generated.");
  };

  const confirm = async () => {
    if (!plan) return;
    setBusy(true);
    const { okFlag, json } = await call(`/api/plans/${plan.session_id}`, "PATCH", {
      status: "confirmed",
    });
    setBusy(false);
    if (okFlag) {
      setPlan(json.data);
      setMsg("Plan confirmed — now public.");
    } else {
      setMsg(json?.error?.message ?? "Could not confirm.");
    }
  };

  return (
    <div className="dash-panel">
      <h1 className="dash-title">Session Planning &amp; Ideation</h1>
      <p className="dash-sub">
        Ideate an activity and it lands on the calendar for that day. Staff only.
      </p>

      {/* Session context (optional — links ideas to a plan) */}
      <div className="row">
        <div className="field">
          <label htmlFor="sid">
            Session ID <span className="opt">(optional — links ideas to a plan)</span>
          </label>
          <input
            id="sid"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            placeholder="uuid of the session"
          />
        </div>
      </div>

      {/* A) Ideation -> Calendar */}
      <div className="idea-card">
        <h2 className="dash-h2" style={{ marginTop: 0 }}>💡 Ideate an activity</h2>
        {ideaMsg && (
          <div className={ideaOk ? "info-ok" : "form-error"}>{ideaMsg}</div>
        )}
        <form onSubmit={addIdea}>
          <div className="field">
            <label htmlFor="ipillar">Activity type</label>
            <select
              id="ipillar"
              value={idea.pillar}
              onChange={(e) => setIdea({ ...idea, pillar: Number(e.target.value) })}
            >
              {PILLARS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="row">
            <div className="field">
              <label htmlFor="ititle">Activity name</label>
              <input
                id="ititle"
                value={idea.title}
                onChange={(e) => setIdea({ ...idea, title: e.target.value })}
                placeholder="e.g. Football passing drill"
              />
            </div>
            <div className="field">
              <label htmlFor="idate">Date</label>
              <input
                id="idate"
                type="date"
                value={idea.date}
                onChange={(e) => setIdea({ ...idea, date: e.target.value })}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="inotes">
              Notes <span className="opt">(optional)</span>
            </label>
            <textarea
              id="inotes"
              value={idea.notes}
              onChange={(e) => setIdea({ ...idea, notes: e.target.value })}
              placeholder="What's the idea / focus for this activity?"
            />
          </div>
          <button className="btn btn-primary auto" disabled={busy} type="submit">
            {busy ? "Adding…" : "Add to calendar"}
          </button>
          {ideaOk && (
            <Link href="/calendar" className="link-inline" style={{ marginLeft: 14 }}>
              View calendar →
            </Link>
          )}
        </form>
      </div>

      {/* B) Session plan */}
      <div className="divider" />
      <h2 className="dash-h2">🗂️ Full session plan</h2>
      {msg && <div className="form-error">{msg}</div>}
      <div className="row">
        <div className="field">
          <label htmlFor="pdate">Plan date</label>
          <input
            id="pdate"
            type="date"
            value={planDate}
            onChange={(e) => setPlanDate(e.target.value)}
          />
        </div>
      </div>
      <button className="btn btn-primary auto" disabled={busy} onClick={generate}>
        {busy ? "Working…" : "Generate draft plan"}
      </button>

      {plan && (
        <>
          <p className="qr-heading" style={{ marginTop: 20 }}>
            Plan status: <b>{plan.status}</b>
          </p>
          <div className="plan-grid">
            {SECTIONS.map((s) => {
              const arr = (plan[s.key] as unknown[]) || [];
              return (
                <div key={s.key as string} className="plan-cell">
                  <span className="plan-label">{s.label}</span>
                  <span className="plan-count">
                    {Array.isArray(arr) ? `${arr.length} items` : "—"}
                  </span>
                </div>
              );
            })}
          </div>
          {plan.status !== "confirmed" && (
            <button
              className="btn btn-primary auto"
              style={{ marginTop: 16 }}
              disabled={busy}
              onClick={confirm}
            >
              Confirm plan
            </button>
          )}
        </>
      )}
    </div>
  );
}
