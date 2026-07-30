/**
 * Zod schemas for the Pillar 2 engine routes (gamified drills):
 *   POST /api/pillar2/select — challenge selection (§5.3)
 *   POST /api/pillar2/score  — squad challenge scoring (§5.5 + §5.6)
 *   POST /api/pillar2/xp     — weighted Pillar 2 XP (§5.7)
 */
import { z } from "zod";

const skillFocus = z.enum([
  "passing",
  "first_touch",
  "dribbling",
  "finishing",
  "defending",
  "possession",
  "reactions",
  "awareness",
]);

const space = z.enum(["small", "medium", "large"]);
const difficulty = z.enum(["foundation", "standard", "competitive", "advanced"]);

export const selectRequestSchema = z.object({
  sessionFocus: z.array(skillFocus).max(8).optional(),
  playerNeeds: z.record(skillFocus, z.number().min(0).max(1)).optional(),
  recentChallenges: z
    .array(
      z.object({
        challengeId: z.string().trim().min(1).max(64),
        sessionsAgo: z.number().int().min(1).max(50),
      })
    )
    .max(100)
    .optional(),
  availableEquipment: z.array(z.string().trim().min(1).max(40)).max(30).optional(),
  availableSpace: space.optional(),
  squadSize: z.number().int().min(1).max(11).optional(),
  count: z.number().int().min(1).max(6).optional(),
  strictEquipment: z.boolean().optional(),
  weights: z
    .object({
      relevance: z.number().min(0).max(100).optional(),
      need: z.number().min(0).max(100).optional(),
      novelty: z.number().min(0).max(100).optional(),
      equipmentFit: z.number().min(0).max(100).optional(),
      fatigueRisk: z.number().min(0).max(100).optional(),
    })
    .optional(),
});

const attempt = z.object({
  correct: z.boolean(),
  points: z.number().min(0).max(1000).optional(),
  risk: z.enum(["low", "standard", "high"]).optional(),
  bonusMultiplier: z.number().min(1).max(100).optional(),
  coachOverride: z.number().min(0).max(1000).optional(),
});

export const squadScoreRequestSchema = z.object({
  players: z
    .array(
      z.object({
        playerId: z.string().trim().min(1).max(64),
        name: z.string().trim().max(80).optional(),
        difficulty: difficulty.optional(),
        attempts: z.array(attempt).max(200),
      })
    )
    .min(1, "Need at least one player")
    .max(12, "Squads cap at 12 players"),
  minParticipation: z.number().int().min(0).max(50).optional(),
  participationPenalty: z.number().min(0).max(1).optional(),
  antiGaming: z
    .object({
      diminishingAfter: z.number().int().min(0).max(50).optional(),
      diminishingFactor: z.number().min(0).max(1).optional(),
      bonusCap: z.number().min(1).max(10).optional(),
    })
    .optional(),
});

const xpComponents = z.object({
  challengeResult: z.number().min(0).max(100),
  technicalExecution: z.number().min(0).max(100),
  improvement: z.number().min(0).max(100),
  teamContribution: z.number().min(0).max(100),
  creativity: z.number().min(0).max(100),
  sportsmanship: z.number().min(0).max(100),
});

export const xpRequestSchema = z.object({
  players: z
    .array(
      z.object({
        playerId: z.string().trim().min(1).max(64),
        name: z.string().trim().max(80).optional(),
        components: xpComponents,
      })
    )
    .min(1, "Need at least one player")
    .max(40),
});
