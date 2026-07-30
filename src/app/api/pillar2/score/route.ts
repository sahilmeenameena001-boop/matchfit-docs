import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api";
import { getStaff } from "@/lib/auth";
import { scoreSquadChallenge } from "@/lib/pillar2";
import { squadScoreRequestSchema } from "@/lib/validation/pillar2";

/**
 * POST /api/pillar2/score   (staff)
 *
 * Pillar 2 — score one squad's challenge run with the §5.6 anti-gaming rules
 * (correct-only, diminishing low-risk points, capped bonuses, coach override,
 * minimum participation) and the §5.5 difficulty multipliers. Team score
 * accumulates while individual contributions stay visible (§5.2).
 *
 * Body: {
 *   players: [{ playerId, name?, difficulty?, attempts: [{ correct, points?,
 *     risk?, bonusMultiplier?, coachOverride? }] }],
 *   minParticipation?: 1, participationPenalty?: 0.9,
 *   antiGaming?: { diminishingAfter?, diminishingFactor?, bonusCap? }
 * }
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
  const parsed = squadScoreRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  try {
    return ok(scoreSquadChallenge(parsed.data));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not score the squad.";
    return fail("ENGINE_ERROR", message, 422);
  }
}
