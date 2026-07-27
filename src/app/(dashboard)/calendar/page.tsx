"use client";

/**
 * Pillar calendar — QUICK LOCAL MODE.
 * Add / view / complete / remove pillar sessions with no login and no Supabase.
 * Entries are stored in the browser (localStorage) via src/lib/localCalendar.ts.
 */
import { useEffect, useState } from "react";
import {
  loadEntries,
  addEntry,
  removeEntry,
  setStatus,
  type LocalEntry,
} from "@/lib/localCalendar";

const PILLARS: { value: number; label: string }[] = [
  { value: 1, label: "Pillar 1 · Footy Training" },
  { value: 2, label: "Pillar 2 · Gamified Drills" },
  { value: 3, label: "Pillar 3 · 1v1 Duels" },
  { value: 4, label: "Pillar 4 · Small-Cluster Matches" },
  { value: 5, label: "Pillar 5 · Physio & Core" },
];
const pillarLabel = (n: number) =>
  PILLARS.find((p) => p.value === n)?.label ?? `Pillar ${n}`;

export default function CalendarPage() {
  const [entries, setEntries] = useState<LocalEntry[]>([]);
  const [ready, setReady] = useState(false);

  // form
  const [pillar, setPillar] = useState(1);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    setEntries(loadEntries());
    setReady(true);
  }, []);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!title.trim() || !date) {
      setErr("Enter a session name and a date.");
      return;
    }
    setEntries(
      addEntry({ scheduled_date: date, pillar_number: pillar, title: title.trim(), notes: notes.trim() || undefined })
    );
    setTitle("");
    setNotes("");
  };

  const del = (id: string) => setEntries(removeEntry(id));
  const toggle = (e: LocalEntry) =>
    setEntries(setStatus(e.id, e.status === "completed" ? "planned" : "completed"));

  // group by date, sorted
  const byDate = entries.reduce<Record<string, LocalEntry[]>>((acc, e) => {
    (acc[e.scheduled_date] ||= []).push(e);
    return acc;
  }, {});
  const dates = Object.keys(byDate).sort();

  return (
    <div className="dash-panel">
      <h1 className="dash-title">Pillar Calendar</h1>
      <p className="dash-sub">
        Schedule pillar sessions by date. Saved on this device.
      </p>

      {/* Add form */}
      <form className="idea-card" onSubmit={add}>
        <h2 className="dash-h2" style={{ marginTop: 0 }}>＋ Add a session</h2>
        {err && <div className="form-error">{err}</div>}
        <div className="field">
          <label htmlFor="pillar">Pillar</label>
          <select id="pillar" value={pillar} onChange={(e) => setPillar(Number(e.target.value))}>
            {PILLARS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div className="row">
          <div className="field">
            <label htmlFor="title">Session name</label>
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Passing & first touch"
            />
          </div>
          <div className="field">
            <label htmlFor="date">Date</label>
            <input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="notes">
            Notes <span className="opt">(optional)</span>
          </label>
          <input
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Focus / coaching points"
          />
        </div>
        <button className="btn btn-primary auto" type="submit">
          Add to calendar
        </button>
      </form>

      {/* List */}
      {!ready ? (
        <p className="dash-sub">Loading…</p>
      ) : dates.length === 0 ? (
        <div className="empty">No sessions scheduled yet. Add your first one above.</div>
      ) : (
        <div className="cal-list">
          {dates.map((d) => (
            <div key={d} className="cal-day">
              <div className="cal-date">
                {new Date(d).toLocaleDateString(undefined, {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </div>
              <div className="cal-pillars">
                {byDate[d]
                  .sort((a, b) => a.pillar_number - b.pillar_number)
                  .map((e) => (
                    <span key={e.id} className={`pillar-chip ${e.status}`} title={e.notes || ""}>
                      <b>P{e.pillar_number}</b> {e.title}
                      <button
                        type="button"
                        className="chip-btn"
                        title={e.status === "completed" ? "Mark planned" : "Mark done"}
                        onClick={() => toggle(e)}
                      >
                        {e.status === "completed" ? "↺" : "✓"}
                      </button>
                      <button
                        type="button"
                        className="chip-btn danger"
                        title="Remove"
                        onClick={() => del(e.id)}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
