import Link from "next/link";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { db } from "@/playlab/lib/db";
import { StatusPill } from "@/playlab/components/ui";

export default async function SessionsPage() {
  const sessions = await db.session.findMany({
    include: { players: true, drills: true },
    orderBy: { date: "desc" },
  });

  return (
    <div className="mx-auto max-w-4xl">
      <div className="label">Sessions</div>
      <h1 className="mt-1 font-cond text-3xl font-bold uppercase tracking-wide text-cream">
        Session plans
      </h1>
      <div className="mt-6 space-y-4">
        {sessions.map((s) => (
          <Link key={s.id} href={`/playlab/sessions/${s.id}`} className="glass block p-5 transition-colors hover:border-blue/50">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-cream">{s.title}</div>
                <div className="mt-1 flex flex-wrap gap-4 text-[12px] text-moss">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays size={13} /> {s.date}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={13} /> {s.venue}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users size={13} /> {s.players.length} players · {s.drills.length} drills
                  </span>
                </div>
              </div>
              <StatusPill status={s.status} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
