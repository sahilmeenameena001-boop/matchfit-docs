import { DashboardSidebar } from "@/components/DashboardSidebar";

/**
 * Dashboard shell — sidebar + content area.
 * This is a route GROUP: (dashboard) does not appear in the URL, so pages inside
 * keep their paths (/calendar, /plan, /library, /dashboard) while sharing this layout.
 */
export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dash">
      <DashboardSidebar />
      <main className="dash-main">{children}</main>
    </div>
  );
}
