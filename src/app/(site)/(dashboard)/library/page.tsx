"use client";

/**
 * Output Library — public, browsable repository of published outputs
 * (session summaries, player cards, reports, awards, exports).
 * Reads GET /api/library with an optional `kind` filter.
 */
import { useEffect, useState } from "react";

type Output = {
  id: string;
  kind: string;
  title: string;
  file_url: string | null;
  created_at: string;
};

const KINDS = [
  { value: "", label: "All" },
  { value: "session_summary", label: "Summaries" },
  { value: "player_card", label: "Player cards" },
  { value: "report", label: "Reports" },
  { value: "award", label: "Awards" },
  { value: "export", label: "Exports" },
];

const ICON: Record<string, string> = {
  session_summary: "📋",
  player_card: "🃏",
  report: "📊",
  award: "🏅",
  export: "📁",
};

export default function LibraryPage() {
  const [items, setItems] = useState<Output[]>([]);
  const [kind, setKind] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/library${kind ? `?kind=${kind}` : ""}`)
      .then((r) => r.json())
      .then((j) => setItems(j.success ? j.data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [kind]);

  return (
    <div className="dash-panel">
      <h1 className="dash-title">Output Library</h1>
      <p className="dash-sub">Session summaries, player cards, reports and exports.</p>

      <div className="segmented" style={{ marginBottom: 18 }}>
        {KINDS.map((k) => (
          <button
            key={k.value}
            type="button"
            className={kind === k.value ? "selected" : ""}
            onClick={() => setKind(k.value)}
          >
            {k.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="dash-sub">Loading…</p>
      ) : items.length === 0 ? (
        <div className="empty">
          Nothing published yet. Staff publish outputs via the library API.
        </div>
      ) : (
        <div className="lib-grid">
          {items.map((o) => (
            <div key={o.id} className="lib-card">
              <div className="lib-icon">{ICON[o.kind] || "📄"}</div>
              <div className="lib-title">{o.title}</div>
              <div className="lib-kind">{o.kind.replace(/_/g, " ")}</div>
              {o.file_url && (
                <a
                  href={o.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-inline"
                >
                  Open →
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
