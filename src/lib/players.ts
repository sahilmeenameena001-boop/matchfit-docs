import { createAdminClient } from "@/lib/supabase/admin";

/**
 * PUBLIC player columns only — this is what a QR scan / public profile may show.
 * Private fields (phone, email, date_of_birth, existing_injury, joint_pain_movement,
 * medical_condition, emergency_contact_*) are DELIBERATELY excluded and must never
 * be selected here.
 */
const PUBLIC_COLUMNS =
  "id, full_name, profile_photo_url, preferred_position, preferred_foot, playing_category, public_profile_enabled, divisions(name, level)";

export type PublicPlayer = {
  id: string;
  full_name: string;
  profile_photo_url: string | null;
  preferred_position: string | null;
  preferred_foot: string | null;
  playing_category: string | null;
  public_profile_enabled: boolean;
  divisions: { name: string; level: number } | null;
};

/**
 * Fetch a player's PUBLIC profile by id.
 * Returns null if not found, if the backend isn't configured yet, or on any error
 * (so the page can render a graceful fallback + the QR).
 */
export async function getPublicPlayer(id: string): Promise<PublicPlayer | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("players")
      .select(PUBLIC_COLUMNS)
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return null;
    return data as unknown as PublicPlayer;
  } catch {
    // Missing env / no DB connection yet — let the page show a fallback.
    return null;
  }
}
