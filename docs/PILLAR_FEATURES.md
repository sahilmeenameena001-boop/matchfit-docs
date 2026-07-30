# Pillar Features — Calendar · Planning · Output Library

Three features layered onto the pillars. All follow the project's **public-read / staff-write**
pattern (RLS + admin server routes). Migration: `supabase/migrations/003_pillar_features.sql`.

---

## 1. Calendar (plan + track)

Plan future pillar sessions and track completed ones. Public read, staff edit.

- **Table:** `pillar_calendar` (date, pillar_number, session_id, title, notes, status)
- **Page:** [`/calendar`](../src/app/calendar/page.tsx) — public view grouped by date
- **API:**
  | Route | Access | Purpose |
  |---|---|---|
  | `GET /api/calendar?from=&to=` | Public | Planned + completed pillars in a range |
  | `POST /api/calendar` | Staff | Schedule a pillar on a date |
  | `PATCH /api/calendar/:id` | Staff | Reschedule / mark completed / cancel |

Per-player completion still lives in the existing `pillar_completion` table; the calendar is
the session-level plan/track layer above it.

---

## 2. Planning / Integration

A staff workspace that assembles a full session plan (squads, stations, pairings, match
schedule, movement) then confirms it. Confirmed plans are public.

- **Table:** `session_plans` (one per session; jsonb columns per pillar; status draft/confirmed/archived)
- **Page:** [`/plan`](../src/app/plan/page.tsx) — generate draft → review sections → confirm
- **API:**
  | Route | Access | Purpose |
  |---|---|---|
  | `POST /api/plans/generate` | Staff | Create/reset a draft plan for a session |
  | `GET /api/plans/:sessionId` | Public (confirmed) | View the plan |
  | `PATCH /api/plans/:sessionId` | Staff | Edit fields / confirm / archive |

> **Engine TODO:** `POST /api/plans/generate` currently creates an *empty* draft. The
> Pillar 4 engine (rotations + match scheduling — see [PILLAR4_ENGINE.md](PILLAR4_ENGINE.md))
> is ready to pre-fill `squads` / `match_schedule` once squad rosters live in the DB;
> stations / pairings engines are still pending.

---

## 3. Output Library

A public, browsable repository of published outputs — summaries, player cards, reports,
awards, exports.

- **Table:** `output_library` (kind, title, session_id, player_id, payload jsonb, file_url, is_public)
- **Page:** [`/library`](../src/app/library/page.tsx) — filterable grid
- **API:**
  | Route | Access | Purpose |
  |---|---|---|
  | `GET /api/library?kind=&player=&session=` | Public | Browse published outputs |
  | `POST /api/library` | Staff | Publish an output |

---

## Shared building blocks (new)

- `src/lib/api.ts` — `ok()` / `fail()` response-envelope helpers
- `src/lib/auth.ts` — `getStaff()` gate for write routes (verifies the user is an active admin)
- `src/lib/validation/pillarFeatures.ts` — Zod schemas for all three features

## Setup to make them live

1. Run `supabase/migrations/003_pillar_features.sql` in Supabase.
2. Ensure `.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY`.
3. Staff writes require a logged-in admin (row in the `admins` table, `active = true`).

Until the DB is connected, every page renders a graceful empty state and the GET APIs
return `[]` — nothing breaks.
