# MatchFIT — User Profile & Signup Field Specification

This document is the **single source of truth** for every field collected during signup.
Frontend, backend, and database must all match the keys, types, and validation rules below.

> Flow: **Page 1 (Account)** → **Page 2 (Profile)** → **write to database**.
> The account (email + password) is created via Supabase Auth; the profile row is written to the `players` table and linked to the auth user.

---

## Legend

- **Key** — the exact JSON/DB field name (snake_case). Use this everywhere.
- **Required** — ✅ must be provided, ⬜ optional.
- **Stored in** — where the value ends up (`auth` = Supabase Auth, `players` = players table, `derived` = computed by the server, never collected).

---

## Page 1 — Account (authentication)

| Field | Key | Type | Required | Validation | Stored in |
|---|---|---|:--:|---|---|
| Full name | `full_name` | text | ✅ | 2–80 chars, letters/spaces/`.`/`-` | players |
| Email | `email` | email | ✅ | valid email, **unique** (login id) | auth + players |
| Phone | `phone` | tel | ✅ | `^[6-9]\d{9}$` (Indian 10-digit), **unique** | players |
| Password | `password` | password | ✅ | min 8, ≥1 letter and ≥1 number | auth (hashed) |
| Confirm password | `confirm_password` | password | ✅ | must equal `password` | not stored |
| Consent to terms | `consent_given` | boolean | ✅ | must be `true` | players |

---

## Page 2 — Profile

| Field | Key | Type | Required | Validation | Stored in |
|---|---|---|:--:|---|---|
| Date of birth | `date_of_birth` | date | ✅ | age between **12 and 80** on today's date | players |
| Age *(derived)* | `age` | integer | — | computed from `date_of_birth` | derived |
| Gender | `gender` | enum | ✅ | `male` \| `female` \| `other` | players |
| Height | `height_cm` | number | ✅ | **100–230 cm** (UI may toggle to ft/in) | players |
| Weight | `weight_kg` | number | ✅ | **25–200 kg** (UI may toggle to lb) | players |
| BMI *(derived)* | `bmi` | number | — | `weight_kg / (height_m)²`, 1 decimal | derived |
| Playing category | `playing_category` | enum | ✅ | `beginner` \| `intermediate` \| `professional` | players |
| Preferred position | `preferred_position` | enum | ⬜ | `goalkeeper` \| `defender` \| `midfielder` \| `forward` | players |
| Preferred foot | `preferred_foot` | enum | ⬜ | `left` \| `right` \| `both` \| `unknown` | players |
| Experience level | `experience_level` | enum | ⬜ | `never_played` \| `beginner` \| `returning` \| `regular` | players |
| Years playing | `experience_years` | integer | ⬜ | 0–50 | players |
| Existing injury | `existing_injury` | textarea | ⬜ | ≤ 500 chars | players *(private)* |
| Current pain / movement in joints | `joint_pain_movement` | textarea | ⬜ | ≤ 500 chars | players *(private)* |
| Medical condition | `medical_condition` | textarea | ⬜ | ≤ 500 chars | players *(private)* |
| Emergency contact name | `emergency_contact_name` | text | ✅ | 2–80 chars | players *(private)* |
| Emergency contact phone | `emergency_contact_phone` | tel | ✅ | `^[6-9]\d{9}$` | players *(private)* |
| Profile photo | `profile_photo` | file | ⬜ | JPG/PNG/WEBP, ≤ 5 MB | Supabase Storage → `profile_photo_url` |

> **Private fields** (`existing_injury`, `joint_pain_movement`, `medical_condition`, `emergency_contact_*`) must **never** appear in public profile or leaderboard responses.

---

## Enumerated values (use these exact strings)

```ts
export const GENDERS = ["male", "female", "other"] as const;

export const PLAYING_CATEGORIES = ["beginner", "intermediate", "professional"] as const;

export const POSITIONS = ["goalkeeper", "defender", "midfielder", "forward"] as const;

export const FEET = ["left", "right", "both", "unknown"] as const;

export const EXPERIENCE_LEVELS = [
  "never_played",
  "beginner",
  "returning",
  "regular",
] as const;
```

---

## Derived / server-set fields (never collected from the form)

| Field | Key | How it's set |
|---|---|---|
| Age | `age` | Computed from `date_of_birth`. |
| BMI | `bmi` | `weight_kg / (height_cm/100)²`, rounded to 1 decimal. |
| Division | `division_id` | Every new player defaults to **Division 10**. |
| Public profile enabled | `public_profile_enabled` | Defaults to `true`. |
| Created / updated timestamps | `created_at`, `updated_at` | Set by the database. |

---

## Height & weight — unit handling

- **Canonical storage is metric**: `height_cm` (number) and `weight_kg` (number). Always store metric.
- The UI **may** offer a display toggle:
  - Height: `cm` ↔ `ft/in`. Convert on input: `cm = (ft × 30.48) + (in × 2.54)`.
  - Weight: `kg` ↔ `lb`. Convert on input: `kg = lb × 0.45359237`.
- Round to **1 decimal place** before submitting.
- Validate the **metric** value against the ranges above, regardless of the display unit.

---

## Full signup payload (what the frontend sends)

The frontend collects both pages, then POSTs a single JSON body to **`POST /api/signup`**:

```json
{
  "account": {
    "fullName": "Aman Sharma",
    "email": "aman@example.com",
    "phone": "9876543210",
    "password": "••••••••",
    "consentGiven": true
  },
  "profile": {
    "dateOfBirth": "1998-04-12",
    "gender": "male",
    "heightCm": 178.5,
    "weightKg": 72.0,
    "playingCategory": "intermediate",
    "preferredPosition": "midfielder",
    "preferredFoot": "right",
    "experienceLevel": "returning",
    "experienceYears": 6,
    "existingInjury": "Recovering from a left hamstring strain",
    "jointPainMovement": "Mild pain in right knee when bending",
    "medicalCondition": "Asthma — carries an inhaler",
    "emergencyContactName": "Riya Sharma",
    "emergencyContactPhone": "9876500000"
  }
}
```

> The profile photo is uploaded **separately** to Supabase Storage after the player row exists
> (the file is renamed to the player UUID), and only the resulting URL is written to
> `players.profile_photo_url`.

---

## `POST /api/signup` — contract (for the backend team)

Response envelope follows the project standard `{ success, data }` / `{ success, error }`.

**Success (201):**
```json
{
  "success": true,
  "data": {
    "playerId": "uuid",
    "sessionId": "uuid",
    "division": "Division 10",
    "profileUrl": "/player/uuid"
  }
}
```

**The backend must, in one logical transaction:**
1. Validate the whole payload with Zod (reject with `VALIDATION_ERROR`).
2. Ensure `consentGiven === true`, else `VALIDATION_ERROR`.
3. Reject a duplicate `phone` or `email` with `PLAYER_ALREADY_EXISTS`.
4. Create the Supabase Auth user (email + password).
5. Insert the `players` row (default `division_id` → Division 10), linked to the auth user id.
6. Register the player for today's open session + create an `attendance` row (`registered`).
7. Return the payload above.

**Error codes:** `VALIDATION_ERROR`, `PLAYER_ALREADY_EXISTS`, `SESSION_NOT_FOUND`, `DATABASE_ERROR`, `INTERNAL_ERROR`.

---

## Database changes required

The existing `players` table (see main README) already has: `full_name`, `phone`, `email`,
`age`, `profile_photo_url`, `preferred_position`, `preferred_foot`, `experience_level`,
`injury_notes`, `emergency_contact_name`, `emergency_contact_phone`, `consent_given`,
`division_id`, `public_profile_enabled`.

Add the new fields with this migration (`supabase/migrations/002_profile_fields.sql`).
The old free-text `injury_notes` column is replaced by three structured health fields:

```sql
create type gender_type as enum ('male', 'female', 'other');
create type playing_category as enum ('beginner', 'intermediate', 'professional');

alter table players
  add column date_of_birth       date,
  add column gender              gender_type,
  add column height_cm           numeric(5,1) check (height_cm between 100 and 230),
  add column weight_kg           numeric(5,1) check (weight_kg between 25 and 200),
  add column playing_category    playing_category,
  add column experience_years    integer check (experience_years between 0 and 50),
  add column existing_injury     text,
  add column joint_pain_movement text,
  add column medical_condition   text,
  add column auth_user_id        uuid references auth.users(id) on delete set null;

-- Optional: migrate any legacy free-text notes into the new "existing_injury"
-- field, then drop the old column once nothing reads it.
-- update players set existing_injury = injury_notes where injury_notes is not null;
-- alter table players drop column injury_notes;

-- age can stay as-is (derived from date_of_birth at write time),
-- or be replaced by a generated column if you prefer.
```

> `bmi` is intentionally **not** stored — compute it on read so it never drifts out of sync
> with height/weight. Add a column only if you later need to sort/filter by it.

---

## Validation summary (copy into `lib/validation/signup.ts`)

| Rule | Applies to |
|---|---|
| Trim + length 2–80 | `full_name`, `emergency_contact_name` |
| `^[6-9]\d{9}$` | `phone`, `emergency_contact_phone` |
| Valid email | `email` |
| Password min 8, letter+number | `password` |
| Passwords match | `confirm_password` |
| Age 12–80 (from DOB) | `date_of_birth` |
| Height 100–230 cm | `height_cm` |
| Weight 25–200 kg | `weight_kg` |
| One of enum values | `gender`, `playing_category`, `preferred_position`, `preferred_foot`, `experience_level` |
| ≤ 500 chars each | `existing_injury`, `joint_pain_movement`, `medical_condition` |
| File ≤ 5 MB, JPG/PNG/WEBP | `profile_photo` |
| Must be `true` | `consent_given` |
