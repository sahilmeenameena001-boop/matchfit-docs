import { NextRequest, NextResponse } from "next/server";
import { loginSchema } from "@/lib/validation/login";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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

  const { email, password } = parsed.data;

  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return err("UNAUTHORIZED", error.message, 401);
  }

  return NextResponse.json({
    success: true,
    data: { userId: data.user.id },
  });
}
