"use client";

/**
 * Planning / Integration working page (staff).
 * Assembles a session plan: generate a draft, review the sections that the engine
 * will fill (squads / stations / pairings / schedule / movement), then Confirm.
 *
 * Talks to POST /api/plans/generate and GET|PATCH /api/plans/:sessionId.
 * Writes require a logged-in staff account (the API enforces this).
 */
import { useState } from "react";

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

const SECTIONS: { key: keyof Plan; label: string }[] = [
  { key: "squads", label: "Squads (A–F)" },
  { key: "stations", label: "Pillar 1 · Stations" },
  { key: "challenges", label: "Pillar 2 · Challenges" },
  { key: "pairings", label: "Pillar 3 · 1v1 Pairings" },
  { key: "match_schedule", label: "Pillar 4 · Match Schedule" },
  { key: "movement_plan", label: "Pillar 5 · Movement Plan" },
];

export default function PlanPage() {
  const [sessionId, setSessionId] = useState("");
  const [planDate, setPlanDate] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const call = async (url: string, method: string, body?: unknown) => {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setMsg(json?.error?.message ?? "Request failed.");
        return null;
      }
      return json.data;
    } catch {
      setMsg("Could not reach the API. Is the backend configured?");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const generate = async () => {
    if (!sessionId || !planDate) {
      setMsg("Enter a session id and date.");
      return;
    }
    const data = await call("/api/plans/generate", "POST", { sessionId, planDate });
    if (data) {
      setPlan(data);
      setMsg("Draft generated. Engine will fill the sections.");
    }
  };

  const confirm = async () => {
    if (!plan) return;
    const data = await call(`/api/plans/${plan.session_id}`, "PATCH", {
      status: "confirmed",
    });
    if (data) {
      setPlan(data);
      setMsg("Plan confirmed — now public.");
    }
  };

  return (
    <div className="dash-panel">
      <h1 className="dash-title">Session Planning</h1>
      <p className="dash-sub">Assemble and confirm a session plan. Staff only.</p>

      {msg && <div className="form-error">{msg}</div>}

      <div className="row">
        <div className="field">
          <label htmlFor="sid">Session ID</label>
          <input
            id="sid"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            placeholder="uuid of the session"
          />
        </div>
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
          <div className="divider" />
          <p className="qr-heading">
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
