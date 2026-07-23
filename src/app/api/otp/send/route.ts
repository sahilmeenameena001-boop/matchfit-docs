import { NextRequest, NextResponse } from "next/server";
import { sendOtpSchema, toE164 } from "@/lib/validation/otp";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * POST /api/otp/send  — sends a 6-digit SMS OTP via Supabase Auth.
 *
 * Supabase GENERATES and SENDS the code (you don't create it). Requirements:
 *   1. An SMS provider (Twilio / MessageBird / Vonage) configured in
 *      Supabase Dashboard → Authentication → Providers → Phone.
 *   2. NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.
 *
 * Body: { "phone": "9876543210" }
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

  const parsed = sendOtpSchema.safeParse(raw);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid phone.");
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLIC_KEY) {
    return err(
      "OTP_NOT_CONFIGURED",
      "Supabase env vars are missing. Add them to .env.local and configure a phone/SMS provider.",
      500
    );
  }

  try {
    const supa = await createServerSupabaseClient();
    // `shouldCreateUser: true` lets a brand-new phone sign up via OTP.
    const { error } = await supa.auth.signInWithOtp({
      phone: toE164(parsed.data.phone),
      options: { channel: "sms", shouldCreateUser: true },
    });

    if (error) {
      return err("OTP_SEND_FAILED", error.message, 502);
    }
    return NextResponse.json({
      success: true,
      data: { sent: true, phone: parsed.data.phone },
    });
  } catch (e) {
    return err("INTERNAL_ERROR", "Could not send the code. Please try again.", 500);
  }
}
