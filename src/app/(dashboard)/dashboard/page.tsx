"use client";

/**
 * Dashboard overview — summary tiles + quick links into each feature.
 * Pulls live counts from the calendar and library APIs (graceful when empty).
 */
import { useEffect, useState } from "react";
import Link from "next/link";

type Counts = { calendar: number; upcoming: number; library: number };

export default function DashboardOverview() {
  const [counts, setCounts] = useState<Counts>({
    calendar: 0,
    upcoming: 0,
    library: 0,
  });

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    Promise.all([
      fetch("/api/calendar").then((r) => r.json()).catch(() => null),
      fetch("/api/library").then((r) => r.json()).catch(() => null),
    ]).then(([cal, lib]) => {
      const calItems: { scheduled_date: string }[] = cal?.success ? cal.data : [];
      setCounts({
        calendar: calItems.length,
        upcoming: calItems.filter((e) => e.scheduled_date >= today).length,
        library: lib?.success ? lib.data.length : 0,
      });
    });
  }, []);

  return (
    <div className="dash-panel">
      <h1 className="dash-title">Overview</h1>
      <p className="dash-sub">Manage sessions, planning and published outputs.</p>

      <div className="tile-grid">
        <Link href="/calendar" className="tile">
          <div className="tile-icon">📅</div>
          <div className="tile-value">{counts.upcoming}</div>
          <div className="tile-label">Upcoming pillar sessions</div>
        </Link>

        <Link href="/calendar" className="tile">
          <div className="tile-icon">🗓️</div>
          <div className="tile-value">{counts.calendar}</div>
          <div className="tile-label">Total scheduled entries</div>
        </Link>

        <Link href="/plan" className="tile">
          <div className="tile-icon">🗂️</div>
          <div className="tile-value">＋</div>
          <div className="tile-label">Assemble a session plan</div>
        </Link>

        <Link href="/drills" className="tile">
          <div className="tile-icon">🎯</div>
          <div className="tile-value">P2</div>
          <div className="tile-label">Gamified drills &amp; XP</div>
        </Link>

        <Link href="/matches" className="tile">
          <div className="tile-icon">⚽</div>
          <div className="tile-value">P4</div>
          <div className="tile-label">Rotations &amp; match schedule</div>
        </Link>

        <Link href="/library" className="tile">
          <div className="tile-icon">📚</div>
          <div className="tile-value">{counts.library}</div>
          <div className="tile-label">Published outputs</div>
        </Link>
      </div>

      <div className="quick-links">
        <h2 className="dash-h2">Quick actions</h2>
        <div className="ql-row">
          <Link href="/calendar" className="btn btn-ghost ql-btn">View calendar</Link>
          <Link href="/plan" className="btn btn-ghost ql-btn">Plan a session</Link>
          <Link href="/drills" className="btn btn-ghost ql-btn">Run drill games</Link>
          <Link href="/matches" className="btn btn-ghost ql-btn">Plan match day</Link>
          <Link href="/library" className="btn btn-ghost ql-btn">Browse library</Link>
        </div>
      </div>
    </div>
  );
}
