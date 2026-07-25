"use client";

/**
 * Pillar calendar — public view of planned + completed pillar sessions.
 * Reads GET /api/calendar. Staff editing happens through the API / admin tools.
 */
import { useEffect, useState } from "react";
import Link from "next/link";

type Entry = {
  id: string;
  scheduled_date: string;
  pillar_number: number;
  title: string | null;
  status: "planned" | "completed" | "cancelled";
};

const PILLARS: Record<number, string> = {
  1: "Footy Training",
  2: "Gamified Drills",
  3: "1v1 Duels",
  4: "Small-Cluster Matches",
  5: "Physio & Core",
};

export default function CalendarPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/calendar")
      .then((r) => r.json())
      .then((j) => setEntries(j.success ? j.data : []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, []);

  // Group by date.
  const byDate = entries.reduce<Record<string, Entry[]>>((acc, e) => {
    (acc[e.scheduled_date] ||= []).push(e);
    return acc;
  }, {});
  const dates = Object.keys(byDate).sort();

  return (
    <main className="page">
      <div className="card wide">
        <div className="brand">
          <span className="dot" />
          <strong>MATCHFIT</strong>
        </div>
        <h1 className="title">Pillar Calendar</h1>
        <p className="subtitle">Planned and completed pillar sessions.</p>

        {loading ? (
          <p className="subtitle">Loading…</p>
        ) : dates.length === 0 ? (
          <div className="empty">
            No sessions scheduled yet. Staff can add entries via the calendar API.
          </div>
        ) : (
          <div className="cal-list">
            {dates.map((date) => (
              <div key={date} className="cal-day">
                <div className="cal-date">
                  {new Date(date).toLocaleDateString(undefined, {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </div>
                <div className="cal-pillars">
                  {byDate[date]
                    .sort((a, b) => a.pillar_number - b.pillar_number)
                    .map((e) => (
                      <span key={e.id} className={`pillar-chip ${e.status}`}>
                        <b>P{e.pillar_number}</b>{" "}
                        {e.title || PILLARS[e.pillar_number]}
                        {e.status === "completed" && " ✓"}
                        {e.status === "cancelled" && " ✕"}
                      </span>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="foot-note">
          <Link href="/">← Back to MatchFIT</Link>
        </p>
      </div>
    </main>
  );
}
