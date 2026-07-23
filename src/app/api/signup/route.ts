import { NextRequest, NextResponse } from "next/server";
import { accountSchema, profileSchema } from "@/lib/validation/signup";
import { z } from "zod";

/**
 * POST /api/signup  —  STUB / REFERENCE IMPLEMENTATION
 * ----------------------------------------------------
 * This validates the incoming payload and returns a fake success response so the
 * frontend flow is testable end-to-end BEFORE the real backend is wired.
 *
 * Krishay / backend team: replace the "TODO: real implementation" block with the
 * steps documented in docs/PROFILE_FIELDS.md → "POST /api/signup contract":
 *   1. Ensure consentGiven === true
 *   2. Reject duplicate phone/email  -> PLAYER_ALREADY_EXISTS
 *   3. supabase.auth.admin.createUser({ email, password })
 *   4. insert players row (division = Division 10), link auth_user_id
 *   5. register today's open session + attendance row ('registered')
 *   6. return { playerId, sessionId, division, profileUrl }
 */

// Server-side we re-validate with the SAME schemas the client used.
const bodySchema = z.object({
  account: accountSchema
    .innerType() // unwrap the .refine() so we can omit confirmPassword server-side
    .omit({ confirmPassword: true }),
  profile: profileSchema,
});

const err = (code: string, message: string, status = 400) =>
  NextResponse.json({ success: false, error: { code, message } }, { status });

export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return err("VALIDATION_ERROR", "Invalid JSON body.");
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input.");
  }
  if (!parsed.data.account.consentGiven) {
    return err("VALIDATION_ERROR", "Consent is required.");
  }

  // ---------------------------------------------------------------------------
  // TODO: real implementation (Supabase). For now, return a deterministic stub.
  // ---------------------------------------------------------------------------
  const fakePlayerId = "00000000-0000-0000-0000-000000000000";

  return NextResponse.json(
    {
      success: true,
      data: {
        playerId: fakePlayerId,
        sessionId: "00000000-0000-0000-0000-0000000000ff",
        division: "Division 10",
        profileUrl: `/player/${fakePlayerId}`,
      },
    },
    { status: 201 }
  );
}
