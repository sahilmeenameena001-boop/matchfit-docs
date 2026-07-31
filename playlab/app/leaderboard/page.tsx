import { db } from "@/lib/db";
import { Meter } from "@/components/ui";

export default async function LeaderboardPage() {
  const players = await db.player.findMany({
    include: { team: true, results: { include: { run: true } } },
    orderBy: { xpTotal: "desc" },
  });
  const teams = await db.team.findMany({ include: { results: true, players: true } });
  const maxXp = Math.max(1, ...players.map((p) => p.xpTotal));

  return (
    <div className="mx-auto max-w-4xl">
      <div className="label">Leaderboard</div>
      <h1 className="mt-1 font-cond text-3xl font-bold uppercase tracking-wide text-cream">
        MatchFIT XP standings
      </h1>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {teams
          .map((t) => ({ ...t, total: t.results.reduce((s, r) => s + r.drillScore, 0) }))
          .sort((a, b) => b.total - a.total)
          .map((t, i) => (
            <div key={t.id} className="glass p-5">
              <div className="flex items-center justify-between">
                <span className="num-blue text-lg font-bold">{String(i + 1).padStart(2, "0")}</span>
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.color }} />
              </div>
              <div className="mt-1 font-semibold text-cream">{t.name}</div>
              <div className="font-cond text-3xl font-bold text-blue">{t.total}</div>
              <div className="label-sm">accumulated drill points</div>
            </div>
          ))}
      </div>

      <div className="glass mt-6 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left">
              <th className="label px-5 py-3">#</th>
              <th className="label px-3 py-3">Player</th>
              <th className="label px-3 py-3">Position</th>
              <th className="label px-3 py-3">Team</th>
              <th className="label hidden px-3 py-3 sm:table-cell">Progress</th>
              <th className="label px-5 py-3 text-right">XP</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p, i) => (
              <tr key={p.id} className="border-b border-line/50 last:border-0">
                <td className="num-blue px-5 py-2.5 font-bold">{String(i + 1).padStart(2, "0")}</td>
                <td className="px-3 py-2.5 text-cream">{p.name}</td>
                <td className="px-3 py-2.5 text-[12px] text-moss">{p.position}</td>
                <td className="px-3 py-2.5">
                  <span className="inline-flex items-center gap-1.5 text-[12px] text-moss">
                    <span className="h-2 w-2 rounded-full" style={{ background: p.team?.color ?? "#666" }} />
                    {p.team?.name ?? "—"}
                  </span>
                </td>
                <td className="hidden px-3 py-2.5 sm:table-cell">
                  <div className="w-40"><Meter value={p.xpTotal} max={maxXp} tone="ok" /></div>
                </td>
                <td className="px-5 py-2.5 text-right font-cond text-base font-bold text-cream">
                  {p.xpTotal}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
