import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { toDrillView } from "@/lib/serialize";
import { RuleStudio } from "@/components/rules/RuleStudio";

export default async function DrillEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ drillId: string }>;
  searchParams: Promise<{ sessionId?: string }>;
}) {
  const { drillId } = await params;
  const { sessionId } = await searchParams;
  const row = await db.drill.findUnique({
    where: { id: drillId },
    include: { rules: { orderBy: { sortOrder: "asc" } }, scoringRules: true, xpRules: true },
  });
  if (!row) notFound();
  const session = await db.session.findFirst({
    where: sessionId ? { id: sessionId } : undefined,
  });

  return (
    <RuleStudio
      drill={toDrillView(row)}
      sessionId={session?.id}
      xpTarget={{ min: session?.xpTargetMin ?? 50, max: session?.xpTargetMax ?? 120 }}
    />
  );
}
