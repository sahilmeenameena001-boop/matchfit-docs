/**
 * Zod schema for the login form.
 * Kept deliberately loose (no password-complexity check) — complexity is only
 * enforced at signup. Login just needs a well-formed email and a non-empty password.
 * Reuse this schema on the server (POST /api/login) so validation can't be bypassed.
 */
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
  rememberMe: z.boolean().optional().default(false),
});

export type LoginInput = z.infer<typeof loginSchema>;
