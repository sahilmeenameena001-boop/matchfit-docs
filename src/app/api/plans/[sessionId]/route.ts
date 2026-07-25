import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api";
import { getStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { updatePlanSchema } from "@/lib/validation/pillarFeatures";

/**
 * GET   /api/plans/:sessionId   (public for CONFIRMED plans; staff see drafts too)
 * PATCH /api/plans/:sessionId   (staff) — edit fields / confirm / archive
 */

export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const db = createAdminClient();
    const { data, error } = await db
      .from("session_plans")
      .select("*")
      .eq("session_id", params.sessionId)
      .maybeSingle();
    if (error || !data) return ok(null); // no plan yet / not configured
    // Drafts are visible only to staff.
    if (data.status !== "confirmed") {
      const staff = await getStaff();
      if (!staff) return ok(null);
    }
    return ok(data);
  } catch {
    return ok(null);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const staff = await getStaff();
  if (!staff) return fail("UNAUTHORIZED", "Staff login required.", 401);

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Invalid JSON body.");
  }
  const parsed = updatePlanSchema.safeParse(raw);
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const d = parsed.data;
  const update: Record<string, unknown> = {};
  if (d.status !== undefined) update.status = d.status;
  if (d.squads !== undefined) update.squads = d.squads;
  if (d.stations !== undefined) update.stations = d.stations;
  if (d.challenges !== undefined) update.challenges = d.challenges;
  if (d.pairings !== undefined) update.pairings = d.pairings;
  if (d.matchSchedule !== undefined) update.match_schedule = d.matchSchedule;
  if (d.movementPlan !== undefined) update.movement_plan = d.movementPlan;
  if (d.notes !== undefined) update.notes = d.notes;

  if (Object.keys(update).length === 0) {
    return fail("VALIDATION_ERROR", "No fields to update.");
  }

  try {
    const db = createAdminClient();
    const { data, error } = await db
      .from("session_plans")
      .update(update)
      .eq("session_id", params.sessionId)
      .select("*")
      .maybeSingle();
    if (error) return fail("DATABASE_ERROR", error.message, 500);
    if (!data) return fail("NOT_FOUND", "No plan for this session.", 404);
    return ok(data);
  } catch {
    return fail("INTERNAL_ERROR", "Could not update plan.", 500);
  }
}
