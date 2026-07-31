"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { label: string; href: string; num?: string };
type Section = { title: string; items: Item[] };

const SECTIONS: Section[] = [
  {
    title: "MatchFIT",
    items: [
      { label: "Sessions", href: "/sessions" },
      { label: "Drill Library", href: "/drills" },
      { label: "AI Drill Studio", href: "/drills/new" },
      { label: "Experimental Drills", href: "/drills?filter=experimental" },
      { label: "Leaderboard", href: "/leaderboard" },
    ],
  },
  {
    title: "Five Pillars",
    items: [
      { label: "Footy Training", href: "/drills?pillar=Footy Training", num: "01" },
      { label: "Gamified Football Drills", href: "/drills?pillar=Gamified Football Drills", num: "02" },
      { label: "One-v-One Duels", href: "/drills?pillar=One-v-One Duels", num: "03" },
      { label: "Small Cluster", href: "/drills?pillar=Small Cluster Football", num: "04" },
      { label: "Physio, Core & Corrective", href: "/drills?pillar=Physiotherapy, Core & Corrective Movement", num: "05" },
    ],
  },
  {
    title: "Session Tools",
    items: [
      { label: "Session Builder", href: "/sessions/s-main/builder" },
      { label: "Live Scoring", href: "/sessions/s-main/live" },
      { label: "Test Queue", href: "/drills?filter=test-queue" },
      { label: "Verified Drills", href: "/drills?filter=verified" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    const base = href.split("?")[0];
    if (base === "/sessions") return pathname === "/sessions" || pathname === "/";
    return pathname === base && !href.includes("?");
  };

  return (
    <aside className="sticky top-0 hidden h-screen w-64 flex-none flex-col gap-6 overflow-y-auto border-r border-line bg-[rgba(7,12,9,0.8)] px-4 py-6 backdrop-blur-lg md:flex">
      <Link href="/" className="flex items-center gap-2 px-2">
        <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue shadow-[0_0_12px_rgba(61,139,253,0.9)]" />
        <span className="font-cond text-lg font-bold uppercase tracking-[0.28em] text-cream">
          MatchFIT
        </span>
        <span className="label-sm mt-1">PlayLab</span>
      </Link>

      {SECTIONS.map((section) => (
        <nav key={section.title}>
          <div className="label mb-2 px-2">{section.title}</div>
          <ul className="space-y-1">
            {section.items.map((item, i) => {
              const active = isActive(item.href);
              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className={
                      active
                        ? "flex items-center gap-2 rounded-xl bg-cream px-3 py-2 text-sm font-semibold text-[#101a12]"
                        : "flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-cream/70 transition-colors hover:bg-[rgba(236,232,217,0.06)] hover:text-cream"
                    }
                  >
                    <span className={`num-blue text-[11px] ${active ? "text-[#1f5fd0]" : ""}`}>
                      {item.num ?? String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ))}

      <div className="mt-auto px-2">
        <div className="glass-deep px-3 py-3">
          <div className="label-sm">Demo coach</div>
          <div className="mt-1 text-sm text-cream">Coach Arjun Mehta</div>
          <div className="text-[11px] text-moss">KNC BaseCamp · U-15 group</div>
        </div>
      </div>
    </aside>
  );
}
