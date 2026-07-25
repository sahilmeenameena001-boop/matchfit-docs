/**
 * Zod schemas for the three pillar features:
 *   1. Calendar  2. Planning/Integration  3. Output Library
 * Reused on the server (write routes) so validation can't be bypassed.
 */
import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const uuid = z.string().uuid();

/* ---------------------------- 1. Calendar --------------------------------- */

export const createCalendarSchema = z.object({
  scheduledDate: isoDate,
  pillarNumber: z.number().int().min(1).max(5),
  sessionId: uuid.optional(),
  title: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(500).optional(),
});

export const updateCalendarSchema = z.object({
  scheduledDate: isoDate.optional(),
  pillarNumber: z.number().int().min(1).max(5).optional(),
  sessionId: uuid.nullable().optional(),
  title: z.string().trim().max(120).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  status: z.enum(["planned", "completed", "cancelled"]).optional(),
});

/* ------------------------ 2. Planning / Integration ----------------------- */

export const generatePlanSchema = z.object({
  sessionId: uuid,
  planDate: isoDate,
});

export const updatePlanSchema = z.object({
  status: z.enum(["draft", "confirmed", "archived"]).optional(),
  squads: z.any().optional(),
  stations: z.any().optional(),
  challenges: z.any().optional(),
  pairings: z.any().optional(),
  matchSchedule: z.any().optional(),
  movementPlan: z.any().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

/* --------------------------- 3. Output Library ---------------------------- */

export const createLibrarySchema = z.object({
  kind: z.enum(["session_summary", "player_card", "report", "award", "export"]),
  title: z.string().trim().min(2).max(160),
  sessionId: uuid.optional(),
  playerId: uuid.optional(),
  payload: z.any().optional(),
  fileUrl: z.string().url().optional(),
  isPublic: z.boolean().optional(),
});
