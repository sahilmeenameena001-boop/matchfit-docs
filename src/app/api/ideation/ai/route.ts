import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api";
import { getStaff } from "@/lib/auth";
import { z } from "zod";
import { generateIdeas } from "@/lib/ai/ideas";

/**
 * POST /api/ideation/ai   (staff)
 *
 * AI-assisted ideation: Claude suggests session activities for a coaching focus.
 * The coach reviews the suggestions and can drop any one onto the calendar via
 * POST /api/ideation. This route only generates ideas — it does not write anything.
 *
 * Body: { "focus": "weak-foot passing under pressure", "pillarNumber"?: 1, "count"?: 4 }
 * Requires ANTHROPIC_API_KEY in .env.local.
 */

const bodySchema = z.object({
  focus: z.string().trim().min(3, "Describe what to work on").max(300),
  pillarNumber: z.number().int().min(1).max(5).optional(),
  count: z.number().int().min(1).max(6).optional(),
});

export async function POST(req: NextRequest) {
  const staff = await getStaff();
  if (!staff) return fail("UNAUTHORIZED", "Staff login required.", 401);

  if (!process.env.ANTHROPIC_API_KEY) {
    return fail(
      "AI_NOT_CONFIGURED",
      "ANTHROPIC_API_KEY is not set. Add it to .env.local to enable AI ideation.",
      500
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Invalid JSON body.");
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  try {
    const data = await generateIdeas({
      focus: parsed.data.focus,
      pillarNumber: parsed.data.pillarNumber,
      count: parsed.data.count ?? 4,
    });
    if (!data) return fail("AI_ERROR", "Could not generate ideas. Please try again.", 502);
    return ok(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "AI request failed.";
    return fail("AI_ERROR", message, 502);
  }
}
