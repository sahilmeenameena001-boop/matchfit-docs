import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type Staff = { id: string; role: string; active: boolean };

/**
 * Returns the logged-in staff member (admin/coach/staff) or null.
 * Used to gate write routes for the pillar features.
 *
 * Verifies the Supabase-authenticated user exists in the `admins` table and is active.
 * Returns null on any failure (not logged in, not staff, or backend not configured).
 */
export async function getStaff(): Promise<Staff | null> {
  try {
    const supa = createServerSupabaseClient();
    const {
      data: { user },
    } = await supa.auth.getUser();
    if (!user) return null;

    const admin = createAdminClient();
    const { data } = await admin
      .from("admins")
      .select("id, role, active")
      .eq("id", user.id)
      .maybeSingle();

    if (!data || data.active !== true) return null;
    return data as Staff;
  } catch {
    return null;
  }
}
