import { NextRequest, NextResponse } from "next/server";
import { loginSchema } from "@/lib/validation/login";

/**
 * POST /api/login  —  STUB / REFERENCE IMPLEMENTATION
 * ----------------------------------------------------
 * Validates the payload and returns a fake success so the login UI is testable
 * before the real backend exists.
 *
 * Krishay / backend team — replace the stub block with Supabase auth:
 *
 *   import { createServerSupabaseClient } from "@/lib/supabase/server";
 *   const supa = await createServerSupabaseClient();
 *   const { data, error } = await supa.auth.signInWithPassword({ email, password });
 *   if (error) return err("UNAUTHORIZED", "Incorrect email or password.", 401);
 *   return NextResponse.json({ success: true, data: { userId: data.user.id } });
 *
 * The @supabase/ssr server client sets the auth cookie automatically, so the
 * session persists after this call.
 */

const err = (code: string, message: string, status = 400) =>
  NextResponse.json({ success: false, error: { code, message } }, { status });

export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return err("VALIDATION_ERROR", "Invalid JSON body.");
  }

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  // ---------------------------------------------------------------------------
  // TODO: real implementation (Supabase signInWithPassword). Stub success below.
  // ---------------------------------------------------------------------------
  return NextResponse.json({
    success: true,
    data: { userId: "00000000-0000-0000-0000-000000000000" },
  });
}
