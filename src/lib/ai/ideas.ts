import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

/**
 * AI-powered session ideation via Claude (Anthropic).
 *
 * Given a coach's focus (e.g. "improve weak-foot passing"), Claude returns a set
 * of practical activity ideas tagged to the five pillars. The coach can then drop
 * any idea onto the calendar via the existing ideation flow.
 *
 * Uses structured outputs (json_schema) so the response is always parseable, then
 * validates it with Zod. Requires ANTHROPIC_API_KEY in the environment (server-only).
 */

export const IdeasSchema = z.object({
  ideas: z.array(
    z.object({
      title: z.string(),
      pillarNumber: z.number().int().min(1).max(5),
      description: z.string(),
      coachingPoints: z.array(z.string()),
    })
  ),
});

export type Ideas = z.infer<typeof IdeasSchema>;

// JSON Schema handed to the API's structured-output constraint.
const OUTPUT_JSON_SCHEMA = {
  type: "object",
  properties: {
    ideas: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          pillarNumber: { type: "integer" },
          description: { type: "string" },
          coachingPoints: { type: "array", items: { type: "string" } },
        },
        required: ["title", "pillarNumber", "description", "coachingPoints"],
        additionalProperties: false,
      },
    },
  },
  required: ["ideas"],
  additionalProperties: false,
} as const;

const PILLARS = `1 = Footy Training (technical drills: passing, first touch, dribbling, finishing)
2 = Gamified Football Drills (games/challenges with a target skill)
3 = 1v1 Duels (attacking vs defending)
4 = Small-Cluster Matches (4v4 with rolling subs)
5 = Physio, Core & Corrective Movement (mobility, stability, recovery)`;

const SYSTEM = `You are a football (soccer) coaching assistant for the MatchFIT five-pillar programme.
Generate concise, practical, safe session activity ideas for amateur players.

The five pillars are:
${PILLARS}

For each idea provide: a short title, the pillar number (1-5) it belongs to, a one to two
sentence description of how it runs, and 2-3 short coaching points. Keep everything grounded
and realistic for a 30-player session — no equipment-heavy or unsafe drills.`;

export async function generateIdeas(input: {
  focus: string;
  pillarNumber?: number;
  count: number;
}): Promise<Ideas | null> {
  const client = new Anthropic();

  const pillarHint = input.pillarNumber
    ? `All ideas must target pillar ${input.pillarNumber}.`
    : `Choose the most fitting pillar (1-5) for each idea.`;

  const response = await client.messages.create({
    model: "claude-opus-5",
    max_tokens: 2000,
    // Low effort keeps this fast/cheap; thinking stays on by default on Opus 5.
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: OUTPUT_JSON_SCHEMA },
    },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Generate ${input.count} activity ideas. Coaching focus: ${input.focus}. ${pillarHint}`,
      },
    ],
    // output_config typings vary across SDK/zod versions; the runtime shape follows
    // the documented structured-outputs API.
  } as unknown as Anthropic.MessageCreateParamsNonStreaming);

  const text = response.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();

  if (!text) return null;
  try {
    const parsed = IdeasSchema.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
