import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api";
import { getStaff } from "@/lib/auth";
import { scheduleMatches } from "@/lib/pillar4";
import { scheduleRequestSchema } from "@/lib/validation/pillar4";

/**
 * POST /api/pillar4/schedule   (staff)
 *
 * Pillar 4 §7.2 — round-robin match schedule across squads on limited
 * pitches. Pure computation: nothing is written; the schedule comes back
 * for review.
 *
 * Body: {
 *   squads: [{ name, id?, rating? }],          // 2–16 squads
 *   rounds?: 6, pitches?: 2,
 *   method?: "annealed" | "template",
 *   iterations?: 2000, seed?: 42,
 *   weights?: { rest?, wait?, repeat?, mismatch? }
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
  const parsed = scheduleRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  try {
    return ok(scheduleMatches(parsed.data));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not build the schedule.";
    return fail("ENGINE_ERROR", message, 422);
  }
}
