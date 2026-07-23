/**
 * Zod schemas + helper for phone (SMS) OTP.
 * We collect a 10-digit Indian number in the UI, but Supabase / the SMS provider
 * needs E.164 format (+91XXXXXXXXXX) — convert with `toE164` before sending.
 */
import { z } from "zod";

const phoneRegex = /^[6-9]\d{9}$/;

export const sendOtpSchema = z.object({
  phone: z.string().trim().regex(phoneRegex, "Enter a valid 10-digit number"),
});

export const verifyOtpSchema = z.object({
  phone: z.string().trim().regex(phoneRegex, "Enter a valid 10-digit number"),
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

/** 9876543210 -> +919876543210 (India). Change the country code if needed. */
export const toE164 = (phone: string) => `+91${phone}`;
