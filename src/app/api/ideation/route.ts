import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api";
import { getStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ideationSchema } from "@/lib/validation/pillarFeatures";

/**
 * POST /api/ideation   (staff)
 *
 * Ideating a session activity (e.g. "Football passing drill") does two things:
 *   1. Adds/updates a CALENDAR entry for that day (so it shows up as
 *      "do this pillar on that date").
 *   2. If a sessionId is given, attaches the idea to that session's PLAN
 *      in the matching pillar column (stations / challenges / pairings / …).
 *
 * The calendar holds ONE block per pillar per day (unique constraint), so a
 * repeat idea for the same pillar/day updates that block; the individual
 * activities accumulate inside the session plan.
 */

// pillar -> which session_plans jsonb column the activity belongs to
const PILLAR_PLAN_COLUMN: Record<number, string> = {
  1: "stations",
  2: "challenges",
  3: "pairings",
  4: "match_schedule",
  5: "movement_plan",
};

export async function POST(req: NextRequest) {
  const staff = await getStaff();
  if (!staff) return fail("UNAUTHORIZED", "Staff login required.", 401);

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Invalid JSON body.");
  }
  const parsed = ideationSchema.safeParse(raw);
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input.");
  }
  const d = parsed.data;

  try {
    const db = createAdminClient();

    // 1. Calendar entry — upsert so one pillar/day block is created or refreshed.
    const { data: entry, error: calErr } = await db
      .from("pillar_calendar")
      .upsert(
        {
          scheduled_date: d.scheduledDate,
          pillar_number: d.pillarNumber,
          title: d.title,
          notes: d.notes ?? null,
          session_id: d.sessionId ?? null,
          status: "planned",
          created_by: staff.id,
        },
        { onConflict: "scheduled_date,pillar_number" }
      )
      .select("*")
      .single();
    if (calErr) return fail("DATABASE_ERROR", calErr.message, 500);

    // 2. Attach to the session plan (if a session is loaded and has a plan).
    let linkedToPlan = false;
    if (d.sessionId) {
      const col = PILLAR_PLAN_COLUMN[d.pillarNumber];
      const { data: plan } = await db
        .from("session_plans")
        .select("*")
        .eq("session_id", d.sessionId)
        .maybeSingle();

      if (plan) {
        const planRow = plan as Record<string, unknown>;
        const existing = Array.isArray(planRow[col])
          ? (planRow[col] as unknown[])
          : [];
        existing.push({
          title: d.title,
          notes: d.notes ?? null,
          date: d.scheduledDate,
        });
        await db
          .from("session_plans")
          .update({ [col]: existing })
          .eq("session_id", d.sessionId);
        linkedToPlan = true;
      }
    }

    return ok({ entry, linkedToPlan }, 201);
  } catch {
    return fail("INTERNAL_ERROR", "Could not save the idea.", 500);
  }
}
