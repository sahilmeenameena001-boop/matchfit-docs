/**
 * Zod schemas for the two signup steps.
 * The same schemas are used on the client (instant feedback) and should be
 * reused on the server (POST /api/signup) so validation can never be bypassed.
 */
import { z } from "zod";
import { LIMITS, ageFromDob } from "@/lib/constants";

const phoneRegex = /^[6-9]\d{9}$/;
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/; // >=1 letter, >=1 number, min 8

/* ----------------------------- Step 1: Account ---------------------------- */

export const accountSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Enter your full name")
      .max(80, "Name is too long")
      .regex(/^[\p{L}][\p{L} .'-]*$/u, "Use letters, spaces, . ' - only"),
    email: z.string().trim().toLowerCase().email("Enter a valid email"),
    phone: z.string().trim().regex(phoneRegex, "Enter a valid 10-digit number"),
    password: z
      .string()
      .regex(passwordRegex, `Min ${LIMITS.passwordMin} chars, with a letter and a number`),
    confirmPassword: z.string(),
    consentGiven: z.literal(true, {
      errorMap: () => ({ message: "You must accept to continue" }),
    }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export type AccountInput = z.infer<typeof accountSchema>;

/* ----------------------------- Step 2: Profile ---------------------------- */

export const profileSchema = z.object({
  dateOfBirth: z
    .string()
    .min(1, "Select your date of birth")
    .refine((dob) => {
      const age = ageFromDob(dob);
      return age !== null && age >= LIMITS.age.min && age <= LIMITS.age.max;
    }, `Age must be between ${LIMITS.age.min} and ${LIMITS.age.max}`),
  gender: z.enum(["male", "female", "other"], {
    errorMap: () => ({ message: "Select a gender" }),
  }),
  heightCm: z
    .number({ invalid_type_error: "Enter your height" })
    .min(LIMITS.heightCm.min, `Min ${LIMITS.heightCm.min} cm`)
    .max(LIMITS.heightCm.max, `Max ${LIMITS.heightCm.max} cm`),
  weightKg: z
    .number({ invalid_type_error: "Enter your weight" })
    .min(LIMITS.weightKg.min, `Min ${LIMITS.weightKg.min} kg`)
    .max(LIMITS.weightKg.max, `Max ${LIMITS.weightKg.max} kg`),
  playingCategory: z.enum(["beginner", "intermediate", "professional"], {
    errorMap: () => ({ message: "Select a category" }),
  }),
  preferredPosition: z
    .enum(["goalkeeper", "defender", "midfielder", "forward"])
    .optional(),
  preferredFoot: z.enum(["left", "right", "both", "unknown"]).optional(),
  experienceLevel: z
    .enum(["never_played", "beginner", "returning", "regular"])
    .optional(),
  experienceYears: z
    .number()
    .int()
    .min(LIMITS.experienceYears.min)
    .max(LIMITS.experienceYears.max)
    .optional(),
  // Health & injury (all optional, private — never exposed publicly)
  existingInjury: z.string().max(LIMITS.healthNoteMax, "Too long").optional(),
  jointPainMovement: z.string().max(LIMITS.healthNoteMax, "Too long").optional(),
  medicalCondition: z.string().max(LIMITS.healthNoteMax, "Too long").optional(),
  emergencyContactName: z
    .string()
    .trim()
    .min(2, "Enter a contact name")
    .max(80, "Too long"),
  emergencyContactPhone: z
    .string()
    .trim()
    .regex(phoneRegex, "Enter a valid 10-digit number"),
});

export type ProfileInput = z.infer<typeof profileSchema>;

/* --------------------------- Combined payload ----------------------------- */

export type SignupPayload = {
  account: Omit<AccountInput, "confirmPassword">;
  profile: ProfileInput;
};
