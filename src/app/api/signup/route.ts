import { NextRequest, NextResponse } from "next/server";
import { accountSchema, profileSchema } from "@/lib/validation/signup";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

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

  const { account, profile } = parsed.data;
  
  const admin = createAdminClient();

  // 1. Reject duplicate phone/email -> PLAYER_ALREADY_EXISTS
  const { data: existingPlayer } = await admin
    .from("players")
    .select("id")
    .or(`phone.eq.${account.phone},email.eq.${account.email}`)
    .maybeSingle();

  if (existingPlayer) {
    return err("PLAYER_ALREADY_EXISTS", "A player with this phone or email already exists.", 409);
  }

  // 2. Create the Supabase Auth user
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: account.email,
    password: account.password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    return err("AUTH_ERROR", authError?.message || "Failed to create user", 500);
  }
  
  const authUserId = authData.user.id;

  // 3. Get 'Division 10' ID
  const { data: divisionData } = await admin
    .from("divisions")
    .select("id")
    .eq("name", "Division 10")
    .single();
    
  const divisionId = divisionData?.id;

  // 4. Insert players row
  const { data: player, error: playerError } = await admin
    .from("players")
    .insert({
      auth_user_id: authUserId,
      full_name: account.fullName,
      phone: account.phone,
      email: account.email,
      date_of_birth: profile.dateOfBirth,
      gender: profile.gender,
      height_cm: profile.heightCm,
      weight_kg: profile.weightKg,
      playing_category: profile.playingCategory,
      preferred_position: profile.preferredPosition,
      preferred_foot: profile.preferredFoot,
      experience_level: profile.experienceLevel,
      experience_years: profile.experienceYears,
      existing_injury: profile.existingInjury,
      joint_pain_movement: profile.jointPainMovement,
      medical_condition: profile.medicalCondition,
      emergency_contact_name: profile.emergencyContactName,
      emergency_contact_phone: profile.emergencyContactPhone,
      consent_given: account.consentGiven,
      division_id: divisionId,
    })
    .select("id")
    .single();

  if (playerError || !player) {
    // Rollback auth user
    await admin.auth.admin.deleteUser(authUserId);
    return err("DATABASE_ERROR", playerError?.message || "Failed to create player profile.", 500);
  }
  
  const playerId = player.id;

  // 5. Register player for today's open session + attendance row
  const { data: session } = await admin
    .from("sessions")
    .select("id")
    .eq("status", "open")
    .order("session_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sessionId = session?.id;

  if (sessionId) {
    // Insert registrations in parallel
    await Promise.all([
      admin.from("session_registrations").insert({
        session_id: sessionId,
        player_id: playerId,
      }),
      admin.from("attendance").insert({
        session_id: sessionId,
        player_id: playerId,
        status: "registered",
      }),
    ]);
  }

  // 6. Return payload
  return NextResponse.json(
    {
      success: true,
      data: {
        playerId,
        sessionId: sessionId || "no-open-session",
        division: "Division 10",
        profileUrl: `/player/${playerId}`,
      },
    },
    { status: 201 }
  );
}
