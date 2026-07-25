import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api";
import { getStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createLibrarySchema } from "@/lib/validation/pillarFeatures";

/**
 * GET  /api/library?kind=&player=&session=   (public — published items only)
 * POST /api/library                          (staff — publish an output)
 */

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const kind = searchParams.get("kind");
  const player = searchParams.get("player");
  const session = searchParams.get("session");
  try {
    const db = createAdminClient();
    let q = db
      .from("output_library")
      .select("*")
      .eq("is_public", true)
      .order("created_at", { ascending: false });
    if (kind) q = q.eq("kind", kind);
    if (player) q = q.eq("player_id", player);
    if (session) q = q.eq("session_id", session);
    const { data, error } = await q;
    if (error) return ok([]);
    return ok(data ?? []);
  } catch {
    return ok([]);
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
  const parsed = createLibrarySchema.safeParse(raw);
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  try {
    const db = createAdminClient();
    const { data, error } = await db
      .from("output_library")
      .insert({
        kind: parsed.data.kind,
        title: parsed.data.title,
        session_id: parsed.data.sessionId ?? null,
        player_id: parsed.data.playerId ?? null,
        payload: parsed.data.payload ?? null,
        file_url: parsed.data.fileUrl ?? null,
        is_public: parsed.data.isPublic ?? true,
        created_by: staff.id,
      })
      .select("*")
      .single();
    if (error) return fail("DATABASE_ERROR", error.message, 500);
    return ok(data, 201);
  } catch {
    return fail("INTERNAL_ERROR", "Could not publish output.", 500);
  }
}
