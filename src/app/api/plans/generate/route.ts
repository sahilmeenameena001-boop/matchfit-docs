import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api";
import { getStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { generatePlanSchema } from "@/lib/validation/pillarFeatures";

/**
 * POST /api/plans/generate   (staff)
 *   Creates (or resets) a DRAFT plan for a session.
 *
 * TODO (engine): once the allocation/scheduler/pairing engine exists
 * (see the Five-Pillar logic spec), pre-fill squads/stations/pairings/
 * match_schedule/movement_plan here instead of empty defaults.
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
  const parsed = generatePlanSchema.safeParse(raw);
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  try {
    const db = createAdminClient();
    // Empty scaffold for now; the engine will fill these.
    const draft = {
      session_id: parsed.data.sessionId,
      plan_date: parsed.data.planDate,
      status: "draft",
      squads: [],
      stations: [],
      challenges: [],
      pairings: [],
      match_schedule: [],
      movement_plan: [],
      created_by: staff.id,
    };
    // One plan per session → upsert on session_id.
    const { data, error } = await db
      .from("session_plans")
      .upsert(draft, { onConflict: "session_id" })
      .select("*")
      .single();
    if (error) return fail("DATABASE_ERROR", error.message, 500);
    return ok(data, 201);
  } catch {
    return fail("INTERNAL_ERROR", "Could not generate plan.", 500);
  }
}
