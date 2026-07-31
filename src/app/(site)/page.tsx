import Link from "next/link";

/**
 * MatchFIT front page — presents the Five-Pillar programme and routes into
 * the coach tools (dashboard) and the player sign-up flow.
 */

const PILLARS: Array<{
  n: number;
  icon: string;
  name: string;
  blurb: string;
  href?: string;
}> = [
  {
    n: 1,
    icon: "🏃",
    name: "Footy Training",
    blurb: "Structured station work — technique blocks with measurable reps.",
  },
  {
    n: 2,
    icon: "🎯",
    name: "Gamified Drills",
    blurb:
      "Win the game, groove the skill — smart challenge picks, live scoring, XP.",
    href: "/drills",
  },
  {
    n: 3,
    icon: "⚔️",
    name: "1v1 Duels",
    blurb: "Competitive duel ladders that sharpen decisions under pressure.",
  },
  {
    n: 4,
    icon: "⚽",
    name: "Small-Cluster Matches",
    blurb:
      "4-a-side with fair-minutes rotations and blowout-free round robins.",
    href: "/matches",
  },
  {
    n: 5,
    icon: "🧘",
    name: "Physio & Core",
    blurb: "Recovery, mobility and injury-prevention woven into every week.",
  },
];

const TOOLS = [
  { icon: "🏠", label: "Coach dashboard", href: "/dashboard" },
  { icon: "📅", label: "Pillar calendar", href: "/calendar" },
  { icon: "🗂️", label: "Session planning", href: "/plan" },
  { icon: "🧪", label: "PlayLab drill studio", href: "/playlab" },
  { icon: "📚", label: "Output library", href: "/library" },
];

export default function Home() {
  return (
    <main className="land">
      <section className="land-hero">
        <div className="brand-row">
          <span className="dot" />
          <strong>MATCHFIT</strong>
        </div>
        <h1>
          Six squads. Five pillars.
          <br />
          <em>One session.</em>
        </h1>
        <p>
          MatchFIT turns football training into games worth winning — pick the
          right drills with maths, keep minutes fair with equity rotations,
          schedule competitive small-sided matches, and track every player&apos;s
          progress as XP.
        </p>
        <div className="land-cta">
          <Link href="/dashboard" className="primary">
            Open the coach dashboard
          </Link>
          <Link href="/signup" className="ghost">
            Player sign-up
          </Link>
        </div>
      </section>

      <section className="land-section">
        <h2>The Five-Pillar Programme</h2>
        <p className="sub">
          Two pillars run live in your browser today — the rest are on the way.
        </p>
        <div className="pillar-grid">
          {PILLARS.map((p) =>
            p.href ? (
              <Link href={p.href} className="pillar-card" key={p.n}>
                <span className="badge-live">LIVE</span>
                <span className="pillar-num">PILLAR {p.n}</span>
                <span className="pillar-icon">{p.icon}</span>
                <h3>{p.name}</h3>
                <p>{p.blurb}</p>
                <span className="go">Open workspace →</span>
              </Link>
            ) : (
              <div className="pillar-card" key={p.n}>
                <span className="badge-soon">SOON</span>
                <span className="pillar-num">PILLAR {p.n}</span>
                <span className="pillar-icon">{p.icon}</span>
                <h3>{p.name}</h3>
                <p>{p.blurb}</p>
              </div>
            )
          )}
        </div>
      </section>

      <section className="land-section">
        <h2>Coach tools</h2>
        <p className="sub">Plan it, run it, publish it — all in one place.</p>
        <div className="land-tools">
          {TOOLS.map((t) => (
            <Link href={t.href} key={t.href}>
              <span>{t.icon}</span>
              {t.label}
            </Link>
          ))}
        </div>
      </section>

      <footer className="land-foot">
        Player registration takes two quick steps —{" "}
        <Link href="/signup">create a profile</Link> · Staff?{" "}
        <Link href="/login">log in</Link>
      </footer>
    </main>
  );
}
