/**
 * Enumerated option lists for the signup form.
 * These MUST stay in sync with docs/PROFILE_FIELDS.md and the database enums.
 * The `value` is what gets stored/sent; the `label` is what the user sees.
 */

export const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
] as const;

export const PLAYING_CATEGORIES = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "professional", label: "Professional" },
] as const;

export const POSITIONS = [
  { value: "goalkeeper", label: "Goalkeeper" },
  { value: "defender", label: "Defender" },
  { value: "midfielder", label: "Midfielder" },
  { value: "forward", label: "Forward" },
] as const;

export const FEET = [
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
  { value: "both", label: "Both" },
  { value: "unknown", label: "Not sure" },
] as const;

export const EXPERIENCE_LEVELS = [
  { value: "never_played", label: "Never played" },
  { value: "beginner", label: "Beginner" },
  { value: "returning", label: "Returning after a break" },
  { value: "regular", label: "Play regularly" },
] as const;

// Validation bounds (kept here so form + schema share one source).
export const LIMITS = {
  age: { min: 12, max: 80 },
  heightCm: { min: 100, max: 230 },
  weightKg: { min: 25, max: 200 },
  experienceYears: { min: 0, max: 50 },
  passwordMin: 8,
  healthNoteMax: 500, // per health field (existing injury / joint pain / medical condition)
  photoMaxBytes: 5 * 1024 * 1024, // 5 MB
} as const;

// Unit conversion helpers (UI toggles metric <-> imperial; we always STORE metric).
export const toCm = (feet: number, inches: number) => feet * 30.48 + inches * 2.54;
export const cmToFtIn = (cm: number) => {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches - feet * 12);
  return { feet, inches };
};
export const lbToKg = (lb: number) => lb * 0.45359237;
export const kgToLb = (kg: number) => kg / 0.45359237;

// Derived BMI (never stored — compute on demand).
export const calcBmi = (weightKg: number, heightCm: number) => {
  if (!weightKg || !heightCm) return null;
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
};

// Age from date of birth (YYYY-MM-DD).
export const ageFromDob = (dob: string) => {
  if (!dob) return null;
  const b = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
};
