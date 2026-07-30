import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api";
import { getStaff } from "@/lib/auth";
import { planRotation } from "@/lib/pillar4";
import { rotationRequestSchema } from "@/lib/validation/pillar4";

/**
 * POST /api/pillar4/rotation   (staff)
 *
 * Pillar 4 §7.1 — substitution & minutes-equity plan for one squad.
 * Pure computation: nothing is written; the plan comes back for review
 * (e.g. to drop into a session plan's match_schedule / squads sections).
 *
 * Body: {
 *   players: [{ name, id?, historicalMinutes?, fatigued? }],   // 2–12 players
 *   matchMinutes?: 15, intervalMinutes?: 3, onPitch?: 4
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
  const parsed = rotationRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  try {
    return ok(planRotation(parsed.data));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not plan the rotation.";
    return fail("ENGINE_ERROR", message, 422);
  }
}
