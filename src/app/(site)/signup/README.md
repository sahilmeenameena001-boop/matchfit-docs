# Signup Module (Frontend)

Multi-page player signup for MatchFIT. Built with Next.js App Router + React + Zod.
Field definitions live in [`docs/PROFILE_FIELDS.md`](../../../docs/PROFILE_FIELDS.md) — that is the source of truth.

## Flow

```
/signup            Step 1 — Account (name, email, phone, password, consent)
   │   validates with accountSchema, saves to SignupProvider (sessionStorage)
   ▼
/signup/profile    Step 2 — Profile (DOB, gender, height, weight, category, …)
   │   validates with profileSchema, POSTs { account, profile } to /api/signup
   ▼
/signup/complete   Success screen
```

No database write happens until the **end of Step 2**. Step 1 only stores data in the
browser (sessionStorage) so a refresh mid-flow doesn't lose progress.

## Files

| File | Role |
|---|---|
| `src/app/signup/layout.tsx` | Wraps both steps in `SignupProvider` |
| `src/app/signup/page.tsx` | Step 1 — Account form |
| `src/app/signup/profile/page.tsx` | Step 2 — Profile form (+ live BMI/age, unit toggles) |
| `src/app/signup/complete/page.tsx` | Success screen |
| `src/app/api/signup/route.ts` | **STUB** — validates + returns fake success. Replace with real Supabase logic. |
| `src/lib/signup/SignupProvider.tsx` | Shared state across steps |
| `src/lib/validation/signup.ts` | `accountSchema`, `profileSchema` (used by client **and** server) |
| `src/lib/constants.ts` | Enum options, validation bounds, unit + BMI/age helpers |

## What Krishay needs to do

1. **Wire the backend.** Open `src/app/api/signup/route.ts` and replace the
   `TODO: real implementation` block. The payload shape and required steps are in
   `docs/PROFILE_FIELDS.md → "POST /api/signup — contract"`.
2. **Run the DB migration** for the new columns (also in that doc, section
   "Database changes required"): `gender`, `height_cm`, `weight_kg`,
   `playing_category`, `date_of_birth`, `experience_years`, `auth_user_id`.
3. **Profile photo** is intentionally NOT in this form yet — per the spec it uploads
   to Supabase Storage *after* the player row exists (renamed to the player UUID).
   Add an upload step on the profile page (`/player/[id]`) or as an optional Step 2 field.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000 → **Get started**. The flow works fully against the stub
API (returns a fake player id) so you can click through before the backend is ready.

## Notes / conventions

- **Validation is shared.** Never trust the client — `route.ts` re-runs the same Zod
  schemas. Keep all rules in `src/lib/validation/signup.ts`.
- **Metric is canonical.** Height/weight always stored as `height_cm` / `weight_kg`.
  The ft/in and lb toggles convert to metric on input.
- **BMI and age are derived**, never collected — computed live in the UI and should be
  recomputed on the server/read side, not stored (see the doc).
- **Private health fields** (`existingInjury`, `jointPainMovement`, `medicalCondition`,
  `emergencyContact*`) must never appear in public profile/leaderboard responses.
