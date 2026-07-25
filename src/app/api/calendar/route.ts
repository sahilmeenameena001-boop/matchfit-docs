import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api";
import { getStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createCalendarSchema } from "@/lib/validation/pillarFeatures";

/**
 * GET  /api/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD   (public)
 *   Planned + completed pillars in a date range.
 * POST /api/calendar                                 (staff)
 *   Schedule a pillar on a date.
 */

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  try {
    const db = createAdminClient();
    let q = db
      .from("pillar_calendar")
      .select("*")
      .order("scheduled_date", { ascending: true });
    if (from) q = q.gte("scheduled_date", from);
    if (to) q = q.lte("scheduled_date", to);
    const { data, error } = await q;
    if (error) return ok([]); // graceful empty when table missing
    return ok(data ?? []);
  } catch {
    return ok([]); // backend not configured yet
  }
}

export async function POST(req: NextRequest) {
  const staff = await getStaff();
  if (!staff) return fail("UNAUTHORIZED", "Staff login required.", 401);

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Invalid JSON body.");
  }
  const parsed = createCalendarSchema.safeParse(raw);
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  try {
    const db = createAdminClient();
    const { data, error } = await db
      .from("pillar_calendar")
      .insert({
        scheduled_date: parsed.data.scheduledDate,
        pillar_number: parsed.data.pillarNumber,
        session_id: parsed.data.sessionId ?? null,
        title: parsed.data.title ?? null,
        notes: parsed.data.notes ?? null,
        created_by: staff.id,
      })
      .select("*")
      .single();
    if (error) return fail("DATABASE_ERROR", error.message, 500);
    return ok(data, 201);
  } catch {
    return fail("INTERNAL_ERROR", "Could not create calendar entry.", 500);
  }
}
