import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api";
import { getStaff } from "@/lib/auth";
import { rankByXP } from "@/lib/pillar2";
import { xpRequestSchema } from "@/lib/validation/pillar2";

/**
 * POST /api/pillar2/xp   (staff)
 *
 * Pillar 2 §5.7 — weighted XP ranking:
 *   challenge result 30%, technical execution 25%, improvement 20%,
 *   team contribution 15%, creativity 5%, sportsmanship 5%.
 * The challenge winner gets recognition, but the top XP scorer may be the
 * player who improved or contributed most. Pure computation.
 *
 * Body: { players: [{ playerId, name?, components: { challengeResult,
 *   technicalExecution, improvement, teamContribution, creativity,
 *   sportsmanship } }] }   // each component 0–100
 */
export async function POST(req: NextRequest) {
  const staff = await getStaff();
  if (!staff) return fail("UNAUTHORIZED", "Staff login required.", 401);

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Invalid JSON body.");
  }
  const parsed = xpRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  try {
    return ok(rankByXP(parsed.data.players));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not compute XP.";
    return fail("ENGINE_ERROR", message, 422);
  }
}
