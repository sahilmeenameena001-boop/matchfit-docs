"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: "🏠" },
  { href: "/calendar", label: "Calendar", icon: "📅" },
  { href: "/plan", label: "Planning", icon: "🗂️" },
  { href: "/matches", label: "Matches", icon: "⚽" },
  { href: "/library", label: "Output Library", icon: "📚" },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <aside className="dash-sidebar">
      <div className="dash-brand">
        <span className="dot" />
        <strong>MATCHFIT</strong>
      </div>

      <nav className="dash-nav">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={isActive(item.href) ? "active" : ""}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="dash-sidebar-foot">
        <Link href="/">← Exit dashboard</Link>
      </div>
    </aside>
  );
}
