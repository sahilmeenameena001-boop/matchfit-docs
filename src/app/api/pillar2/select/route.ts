import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api";
import { getStaff } from "@/lib/auth";
import { selectChallenges } from "@/lib/pillar2";
import { selectRequestSchema } from "@/lib/validation/pillar2";

/**
 * POST /api/pillar2/select   (staff)
 *
 * Pillar 2 §5.3 — challenge selection:
 *   Score = Relevance + Player Need + Novelty + Equipment Fit − Fatigue Risk.
 * Pure computation over the built-in catalog: nothing is written.
 *
 * Body: {
 *   sessionFocus?: ["first_touch"], playerNeeds?: { first_touch: 0.8 },
 *   recentChallenges?: [{ challengeId, sessionsAgo }],
 *   availableEquipment?: ["cones","balls"], availableSpace?: "medium",
 *   squadSize?: 5, count?: 3
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
  const parsed = selectRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  try {
    return ok(selectChallenges(parsed.data));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not select challenges.";
    return fail("ENGINE_ERROR", message, 422);
  }
}
