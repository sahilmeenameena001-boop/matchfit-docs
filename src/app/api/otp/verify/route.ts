import { NextRequest, NextResponse } from "next/server";
import { verifyOtpSchema, toE164 } from "@/lib/validation/otp";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * POST /api/otp/verify  — verifies the 6-digit SMS OTP via Supabase Auth.
 *
 * On success, Supabase sets the auth session cookie (through the server client),
 * so the user is logged in after this call.
 *
 * Body: { "phone": "9876543210", "code": "123456" }
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

  const parsed = verifyOtpSchema.safeParse(raw);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLIC_KEY) {
    return err("OTP_NOT_CONFIGURED", "Supabase env vars are missing.", 500);
  }

  try {
    const supa = await createServerSupabaseClient();
    const { data, error } = await supa.auth.verifyOtp({
      phone: toE164(parsed.data.phone),
      token: parsed.data.code,
      type: "sms",
    });

    if (error || !data.user) {
      return err("OTP_INVALID", "The code is incorrect or has expired.", 401);
    }
    return NextResponse.json({
      success: true,
      data: { userId: data.user.id, verified: true },
    });
  } catch (e) {
    return err("INTERNAL_ERROR", "Could not verify the code. Please try again.", 500);
  }
}
