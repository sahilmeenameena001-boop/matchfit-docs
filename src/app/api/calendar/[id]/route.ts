import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api";
import { getStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateCalendarSchema } from "@/lib/validation/pillarFeatures";

/**
 * PATCH /api/calendar/:id   (staff)
 *   Reschedule, edit, mark completed, or cancel a calendar entry.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await getStaff();
  if (!staff) return fail("UNAUTHORIZED", "Staff login required.", 401);

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Invalid JSON body.");
  }
  const parsed = updateCalendarSchema.safeParse(raw);
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  // Map camelCase input to DB columns; only include provided fields.
  const d = parsed.data;
  const update: Record<string, unknown> = {};
  if (d.scheduledDate !== undefined) update.scheduled_date = d.scheduledDate;
  if (d.pillarNumber !== undefined) update.pillar_number = d.pillarNumber;
  if (d.sessionId !== undefined) update.session_id = d.sessionId;
  if (d.title !== undefined) update.title = d.title;
  if (d.notes !== undefined) update.notes = d.notes;
  if (d.status !== undefined) update.status = d.status;

  if (Object.keys(update).length === 0) {
    return fail("VALIDATION_ERROR", "No fields to update.");
  }

  try {
    const db = createAdminClient();
    const { data, error } = await db
      .from("pillar_calendar")
      .update(update)
      .eq("id", (await params).id)
      .select("*")
      .maybeSingle();
    if (error) return fail("DATABASE_ERROR", error.message, 500);
    if (!data) return fail("NOT_FOUND", "Calendar entry not found.", 404);
    return ok(data);
  } catch {
    return fail("INTERNAL_ERROR", "Could not update calendar entry.", 500);
  }
}
