/**
 * Zod schemas for the Pillar 4 engine routes (small-cluster matches):
 *   POST /api/pillar4/rotation — squad substitution & minutes equity (§7.1)
 *   POST /api/pillar4/schedule — round-robin match scheduling (§7.2)
 */
import { z } from "zod";

const shortId = z.string().trim().min(1).max(64);

export const rotationRequestSchema = z
  .object({
    players: z
      .array(
        z.object({
          id: shortId.optional(),
          name: z.string().trim().min(1, "Every player needs a name").max(80),
          historicalMinutes: z.number().min(0).max(100000).optional(),
          fatigued: z.boolean().optional(),
        })
      )
      .min(2, "Need at least 2 players")
      .max(12, "Squads cap at 12 players"),
    matchMinutes: z.number().positive().max(240).optional(),
    intervalMinutes: z.number().positive().max(120).optional(),
    onPitch: z.number().int().min(1).max(11).optional(),
    equityBand: z
      .object({ min: z.number().min(0).max(1), max: z.number().min(1).max(2) })
      .optional(),
  })
  .refine((v) => (v.onPitch ?? 4) <= v.players.length, {
    message: "onPitch cannot exceed the number of players",
  });

export const scheduleRequestSchema = z.object({
  squads: z
    .array(
      z.object({
        id: shortId.optional(),
        name: z.string().trim().min(1, "Every squad needs a name").max(80),
        rating: z.number().min(0).max(5000).optional(),
      })
    )
    .min(2, "Need at least 2 squads")
    .max(16, "Sessions cap at 16 squads"),
  rounds: z.number().int().min(1).max(30).optional(),
  pitches: z.number().int().min(1).max(8).optional(),
  method: z.enum(["template", "annealed"]).optional(),
  iterations: z.number().int().min(100).max(20000).optional(),
  seed: z.number().int().min(0).max(2147483647).optional(),
  weights: z
    .object({
      rest: z.number().min(0).max(1000).optional(),
      wait: z.number().min(0).max(1000).optional(),
      repeat: z.number().min(0).max(1000).optional(),
      mismatch: z.number().min(0).max(1000).optional(),
    })
    .optional(),
});
