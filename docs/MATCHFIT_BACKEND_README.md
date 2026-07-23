# MatchFIT MVP Backend

Backend specification and setup guide for the MatchFIT one-day MVP.

## 1. Objective

The backend must support one complete operational journey:

1. A participant registers.
2. A player profile is created.
3. The player is added to today’s session.
4. An admin checks the player in.
5. A coach records the player’s initial assessment.
6. The admin awards points.
7. The player’s division, rating and leaderboard position update.

The backend is intentionally lean. It should support today’s activation without attempting computer vision, RFID, payments, subscriptions or advanced league automation.

---

## 2. Recommended Stack

- **Frontend:** Existing MatchFIT Next.js frontend
- **Database:** Supabase PostgreSQL
- **Authentication:** Supabase Auth
- **File storage:** Supabase Storage
- **Deployment:** Vercel for frontend and server routes
- **Validation:** Zod
- **ORM:** Supabase client directly for Day 1
- **QR generation:** Client-side QR library using the player ID or check-in token

### Why Supabase

MatchFIT data is relational:

- Players belong to divisions.
- Players attend sessions.
- Sessions contain groups and teams.
- Players receive assessments.
- Players accumulate point transactions.
- Leaderboards are calculated from stored transactions.

PostgreSQL is therefore preferable to a document-only database for the MVP.

---

## 3. MVP Scope

### Included

- Participant registration
- Player profiles
- Admin login
- Session creation and management
- Attendance and check-in
- Initial player assessment
- Manual point awards
- Ten MatchFIT divisions
- Player leaderboard
- Session group and team allocation
- Five-pillar completion tracking
- Profile photo storage
- Basic audit trail

### Excluded

- Computer vision
- Automated match analysis
- RFID bib integration
- Payment gateway
- Subscription billing
- Automatic promotion and relegation
- AI player recommendations
- Match video storage
- Multi-location support
- Social feed
- Messaging
- Advanced coach management
- Automated injury diagnosis

---

## 4. Environment Variables

Create a `.env.local` file in the application root.

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLIC_KEY=
SUPABASE_SECRET_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
ADMIN_EMAIL=
```

### Important

- Never expose `SUPABASE_SECRET_KEY` in browser code.
- Use the service-role key only inside secure server routes.
- The anonymous key may be used by the frontend with Row Level Security enabled.
- Do not commit `.env.local`.

Add this to `.gitignore`:

```gitignore
.env
.env.local
.env.*.local
```

---

## 5. Suggested Project Structure

```text
src/
├── app/
│   ├── api/
│   │   ├── players/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       └── route.ts
│   │   ├── sessions/
│   │   │   ├── route.ts
│   │   │   ├── today/
│   │   │   │   └── route.ts
│   │   │   └── [id]/
│   │   │       ├── attendance/
│   │   │       │   └── route.ts
│   │   │       ├── assessments/
│   │   │       │   └── route.ts
│   │   │       ├── points/
│   │   │       │   └── route.ts
│   │   │       └── groups/
│   │   │           └── route.ts
│   │   ├── leaderboard/
│   │   │   └── route.ts
│   │   └── admin/
│   │       └── login/
│   │           └── route.ts
│   ├── admin/
│   ├── join/
│   ├── leaderboard/
│   ├── player/
│   │   └── [id]/
│   └── session/
│       └── today/
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── admin.ts
│   ├── auth.ts
│   ├── validation.ts
│   ├── ratings.ts
│   └── points.ts
├── types/
│   └── database.ts
└── middleware.ts

supabase/
├── migrations/
│   └── 001_matchfit_mvp.sql
└── seed.sql
```

---

## 6. Database Schema

Run the following SQL in the Supabase SQL Editor or save it as:

```text
supabase/migrations/001_matchfit_mvp.sql
```

```sql
create extension if not exists "uuid-ossp";

create type session_status as enum (
  'draft',
  'open',
  'active',
  'completed',
  'cancelled'
);

create type attendance_status as enum (
  'registered',
  'present',
  'late',
  'absent',
  'cancelled'
);

create type admin_role as enum (
  'admin',
  'coach',
  'staff'
);

create table divisions (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  level integer not null unique check (level between 1 and 10),
  minimum_points integer not null default 0,
  created_at timestamptz not null default now()
);

create table players (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  phone text not null unique,
  email text,
  age integer check (age between 12 and 80),
  profile_photo_url text,
  preferred_position text,
  preferred_foot text check (
    preferred_foot in ('left', 'right', 'both', 'unknown')
  ),
  experience_level text check (
    experience_level in (
      'never_played',
      'beginner',
      'returning',
      'regular'
    )
  ),
  injury_notes text,
  emergency_contact_name text,
  emergency_contact_phone text,
  consent_given boolean not null default false,
  division_id uuid references divisions(id),
  public_profile_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table admins (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role admin_role not null default 'staff',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table sessions (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  session_date date not null,
  start_time time not null,
  end_time time not null,
  location text,
  capacity integer not null default 30,
  status session_status not null default 'draft',
  current_pillar integer check (current_pillar between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table session_registrations (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references sessions(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  registered_at timestamptz not null default now(),
  unique (session_id, player_id)
);

create table attendance (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references sessions(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  status attendance_status not null default 'registered',
  checked_in_at timestamptz,
  checked_in_by uuid references admins(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, player_id)
);

create table assessments (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references sessions(id) on delete set null,
  player_id uuid not null references players(id) on delete cascade,
  movement integer not null check (movement between 1 and 10),
  stamina integer not null check (stamina between 1 and 10),
  ball_control integer not null check (ball_control between 1 and 10),
  passing integer not null check (passing between 1 and 10),
  one_v_one integer not null check (one_v_one between 1 and 10),
  game_awareness integer not null check (game_awareness between 1 and 10),
  overall_rating integer not null check (overall_rating between 1 and 100),
  pain_or_limitation text,
  coach_note text,
  assessed_by uuid references admins(id),
  created_at timestamptz not null default now()
);

create table point_transactions (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references sessions(id) on delete set null,
  player_id uuid not null references players(id) on delete cascade,
  action_type text not null,
  points_per_action integer not null,
  quantity integer not null default 1 check (quantity > 0),
  total_points integer generated always as (
    points_per_action * quantity
  ) stored,
  notes text,
  awarded_by uuid references admins(id),
  created_at timestamptz not null default now()
);

create table session_groups (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references sessions(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  group_name text,
  team_name text,
  station_name text,
  created_at timestamptz not null default now(),
  unique (session_id, player_id)
);

create table pillar_completion (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references sessions(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  pillar_number integer not null check (pillar_number between 1 and 5),
  completed boolean not null default false,
  completed_at timestamptz,
  marked_by uuid references admins(id),
  unique (session_id, player_id, pillar_number)
);

create index idx_players_phone on players(phone);
create index idx_players_division on players(division_id);
create index idx_sessions_date on sessions(session_date);
create index idx_attendance_session on attendance(session_id);
create index idx_attendance_player on attendance(player_id);
create index idx_points_player on point_transactions(player_id);
create index idx_points_session on point_transactions(session_id);
create index idx_assessments_player on assessments(player_id);
```

---

## 7. Updated-At Trigger

```sql
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_players_updated_at
before update on players
for each row execute procedure update_updated_at_column();

create trigger update_sessions_updated_at
before update on sessions
for each row execute procedure update_updated_at_column();

create trigger update_attendance_updated_at
before update on attendance
for each row execute procedure update_updated_at_column();
```

---

## 8. Seed Data

Save as:

```text
supabase/seed.sql
```

```sql
insert into divisions (name, level, minimum_points)
values
  ('Division 10', 10, 0),
  ('Division 9', 9, 500),
  ('Division 8', 8, 1000),
  ('Division 7', 7, 1750),
  ('Division 6', 6, 2750),
  ('Division 5', 5, 4000),
  ('Division 4', 4, 5500),
  ('Division 3', 3, 7500),
  ('Division 2', 2, 10000),
  ('Division 1', 1, 13000)
on conflict (name) do nothing;

insert into sessions (
  title,
  session_date,
  start_time,
  end_time,
  location,
  capacity,
  status,
  current_pillar
)
values (
  'MatchFIT Activation — Day 1',
  current_date,
  '06:30',
  '08:30',
  'MatchFIT Activation Site',
  30,
  'open',
  1
);
```

All newly registered players should be assigned to Division 10 by default.

---

## 9. Player Rating Formula

The initial assessment contains six coach-entered scores from 1 to 10.

Weights:

| Attribute | Weight |
|---|---:|
| Movement | 15% |
| Stamina | 15% |
| Ball control | 20% |
| Passing | 15% |
| 1v1 | 15% |
| Game awareness | 20% |

```ts
export type AssessmentInput = {
  movement: number;
  stamina: number;
  ballControl: number;
  passing: number;
  oneVOne: number;
  gameAwareness: number;
};

export function calculateOverallRating(
  input: AssessmentInput
): number {
  const weightedScore =
    input.movement * 0.15 +
    input.stamina * 0.15 +
    input.ballControl * 0.2 +
    input.passing * 0.15 +
    input.oneVOne * 0.15 +
    input.gameAwareness * 0.2;

  return Math.round(weightedScore * 10);
}
```

### Validation

Each input must:

- Be an integer
- Be between 1 and 10
- Be entered by an authenticated admin or coach

---

## 10. Points Configuration

Store point actions as transactions. Never only update a single total-points field.

```ts
export const POINT_ACTIONS = {
  attendance: 100,
  five_pillars_complete: 50,
  goal: 20,
  assist: 15,
  successful_one_v_one: 10,
  tackle_or_interception: 10,
  match_win: 25,
  fair_play: 15,
  coach_bonus: 5
} as const;
```

### Coach Bonus

Allow `coach_bonus` values between 5 and 25.

### Reason for Transaction Storage

Transaction storage provides:

- Auditability
- Session-level reports
- Reversal capability
- Player history
- Accurate leaderboard calculations
- Future analytics support

---

## 11. Leaderboard Query

Create a view for the current leaderboard.

```sql
create or replace view player_leaderboard as
select
  p.id as player_id,
  p.full_name,
  p.profile_photo_url,
  p.preferred_position,
  d.name as division_name,
  d.level as division_level,
  coalesce(sum(pt.total_points), 0)::integer as total_points,
  count(distinct case
    when a.status in ('present', 'late') then a.session_id
  end)::integer as sessions_attended,
  coalesce(max(ass.overall_rating), 0)::integer as latest_rating
from players p
left join divisions d
  on d.id = p.division_id
left join point_transactions pt
  on pt.player_id = p.id
left join attendance a
  on a.player_id = p.id
left join assessments ass
  on ass.player_id = p.id
group by
  p.id,
  p.full_name,
  p.profile_photo_url,
  p.preferred_position,
  d.name,
  d.level;
```

Leaderboard ordering:

```sql
select *
from player_leaderboard
order by total_points desc, sessions_attended desc, latest_rating desc;
```

---

## 12. API Contract

All API responses should use the same envelope.

### Success

```json
{
  "success": true,
  "data": {}
}
```

### Error

```json
{
  "success": false,
  "error": {
    "code": "PLAYER_NOT_FOUND",
    "message": "Player could not be found."
  }
}
```

---

## 13. Required API Routes

### `POST /api/players`

Creates a participant and registers them for today’s open session.

Request:

```json
{
  "fullName": "Aman Sharma",
  "phone": "9876543210",
  "email": "aman@example.com",
  "age": 27,
  "preferredPosition": "Midfielder",
  "preferredFoot": "right",
  "experienceLevel": "returning",
  "injuryNotes": "Mild ankle stiffness",
  "emergencyContactName": "Riya Sharma",
  "emergencyContactPhone": "9876500000",
  "consentGiven": true
}
```

Response:

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

Rules:

- Phone number must be unique.
- Consent must be true.
- Assign Division 10.
- Register player for today’s open session.
- Create an attendance row with status `registered`.

---

### `GET /api/players/:id`

Returns:

- Player details
- Division
- Latest assessment
- Total points
- Attendance count
- Five-pillar completion
- Recent point history

---

### `GET /api/sessions/today`

Returns today’s active or open session.

Response should include:

- Session details
- Current pillar
- Registered participant count
- Present participant count
- Session schedule

Recommended schedule:

```json
[
  {
    "pillar": 0,
    "title": "Check-in and briefing",
    "startMinute": 0,
    "endMinute": 10
  },
  {
    "pillar": 1,
    "title": "Football training",
    "startMinute": 10,
    "endMinute": 30
  },
  {
    "pillar": 2,
    "title": "Gamified drills",
    "startMinute": 30,
    "endMinute": 48
  },
  {
    "pillar": 3,
    "title": "1v1 rounds",
    "startMinute": 48,
    "endMinute": 68
  },
  {
    "pillar": 4,
    "title": "Small-cluster matches",
    "startMinute": 68,
    "endMinute": 94
  },
  {
    "pillar": 5,
    "title": "Physio and controlled activations",
    "startMinute": 94,
    "endMinute": 117
  },
  {
    "pillar": 6,
    "title": "Wrap-up",
    "startMinute": 117,
    "endMinute": 120
  }
]
```

---

### `PATCH /api/sessions/:id/attendance`

Admin-only route.

Request:

```json
{
  "playerId": "uuid",
  "status": "present"
}
```

On successful check-in:

- Set status to `present`.
- Set `checked_in_at`.
- Store `checked_in_by`.
- Award attendance points only once.

---

### `POST /api/sessions/:id/assessments`

Admin or coach only.

Request:

```json
{
  "playerId": "uuid",
  "movement": 6,
  "stamina": 5,
  "ballControl": 7,
  "passing": 6,
  "oneVOne": 6,
  "gameAwareness": 7,
  "painOrLimitation": "Mild heel discomfort",
  "coachNote": "Good awareness. Needs conditioning."
}
```

The backend must calculate `overall_rating`.

Do not accept `overall_rating` directly from the client.

---

### `POST /api/sessions/:id/points`

Admin or coach only.

Request:

```json
{
  "playerId": "uuid",
  "actionType": "goal",
  "quantity": 2,
  "notes": "Two goals in Group B match"
}
```

The backend must:

- Validate the action.
- Derive points from server-side configuration.
- Reject arbitrary client-entered point values except permitted coach bonuses.
- Insert a point transaction.

---

### `PATCH /api/sessions/:id/groups`

Admin-only route.

Request:

```json
{
  "playerId": "uuid",
  "groupName": "Group B",
  "teamName": "Orange",
  "stationName": "Pitch 1"
}
```

---

### `PATCH /api/sessions/:id/pillars`

Admin or coach only.

Request:

```json
{
  "playerId": "uuid",
  "pillarNumber": 5,
  "completed": true
}
```

When all five pillars are complete:

- Award the `five_pillars_complete` bonus once.
- Do not award duplicate bonuses.

---

### `GET /api/leaderboard`

Supported query parameters:

```text
?period=all
?period=today
?division=10
```

Return:

- Rank
- Player ID
- Name
- Profile photo
- Position
- Division
- Sessions attended
- Latest rating
- Total points

---

## 14. Input Validation

Use Zod for every mutation route.

Example:

```ts
import { z } from "zod";

export const createPlayerSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  phone: z.string().regex(/^[6-9]\d{9}$/),
  email: z.string().email().optional().or(z.literal("")),
  age: z.number().int().min(12).max(80),
  preferredPosition: z.string().trim().min(2).max(40),
  preferredFoot: z.enum(["left", "right", "both", "unknown"]),
  experienceLevel: z.enum([
    "never_played",
    "beginner",
    "returning",
    "regular"
  ]),
  injuryNotes: z.string().max(500).optional(),
  emergencyContactName: z.string().trim().min(2).max(80),
  emergencyContactPhone: z.string().regex(/^[6-9]\d{9}$/),
  consentGiven: z.literal(true)
});
```

---

## 15. Supabase Clients

### Browser Client

```ts
// src/lib/supabase/client.ts

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLIC_KEY!
  );
}
```

### Server Client

```ts
// src/lib/supabase/server.ts

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLIC_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Cookies may be read-only in some server contexts.
          }
        }
      }
    }
  );
}
```

### Admin Client

```ts
// src/lib/supabase/admin.ts

import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}
```

Use the admin client only inside secure backend routes.

---

## 16. Authentication

### Public Access

Public users may:

- Register as players
- View their own profile through a secure public link
- View today’s session information
- View the public leaderboard

### Protected Access

Only authenticated staff may:

- Check players in
- Enter assessments
- Award points
- Change groups
- Mark pillar completion
- Change divisions
- Close sessions

### Day-1 Admin Login

For the one-day MVP:

1. Create admin users manually in Supabase Auth.
2. Add each user to the `admins` table.
3. Protect `/admin` using Next.js middleware.
4. Verify the authenticated user exists in `admins` and is active.

---

## 17. Row Level Security

Enable Row Level Security on all tables.

```sql
alter table players enable row level security;
alter table admins enable row level security;
alter table sessions enable row level security;
alter table session_registrations enable row level security;
alter table attendance enable row level security;
alter table assessments enable row level security;
alter table point_transactions enable row level security;
alter table session_groups enable row level security;
alter table pillar_completion enable row level security;
```

### MVP Policy Approach

- Public reads may be allowed only for safe profile and leaderboard views.
- Public inserts should go through secure server routes.
- All admin mutations should go through authenticated server routes.
- Sensitive fields such as injury notes and emergency contacts must never be included in public leaderboard responses.

Do not expose the full `players` table directly to anonymous users.

---

## 18. Profile Photo Storage

Create a Supabase Storage bucket:

```text
player-photos
```

Recommended rules:

- Accept JPG, PNG and WEBP.
- Maximum file size: 5 MB.
- Rename uploaded files to the player UUID.
- Store only the resulting URL in `players.profile_photo_url`.
- Use a default MatchFIT avatar when no image exists.

Suggested path:

```text
player-photos/{player_id}/profile.webp
```

---

## 19. QR Check-In

The QR code should contain a URL, not sensitive participant information.

Example:

```text
https://matchfit-five.vercel.app/check-in/{player_id}
```

Preferred production version:

```text
https://matchfit-five.vercel.app/check-in/{short_lived_token}
```

For today’s MVP, a player ID URL is acceptable only if the admin route verifies authorization before changing attendance.

The QR code must not contain:

- Phone number
- Email
- Injury notes
- Emergency contact
- Assessment details

---

## 20. Error Codes

Use predictable error codes.

```text
VALIDATION_ERROR
UNAUTHORIZED
FORBIDDEN
PLAYER_NOT_FOUND
PLAYER_ALREADY_EXISTS
SESSION_NOT_FOUND
SESSION_FULL
SESSION_CLOSED
ALREADY_CHECKED_IN
ASSESSMENT_NOT_FOUND
INVALID_POINT_ACTION
DUPLICATE_POINT_AWARD
DATABASE_ERROR
INTERNAL_ERROR
```

---

## 21. Duplicate Protection

The backend must prevent:

- Duplicate player accounts using the same phone number
- Duplicate session registration
- Duplicate attendance rows
- Repeated attendance-point awards
- Repeated five-pillar completion bonuses
- Duplicate division seed entries

Use both application-level checks and database unique constraints.

---

## 22. Audit Requirements

Every admin mutation should store:

- Acting admin ID
- Timestamp
- Session ID
- Player ID
- Action details

The MVP already stores this through:

- `checked_in_by`
- `assessed_by`
- `awarded_by`
- `marked_by`

A full audit-log table may be added after Day 1.

---

## 23. Local Development

Install dependencies:

```bash
npm install
npm install @supabase/supabase-js @supabase/ssr zod
npm install qrcode.react
```

Run locally:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Recommended scripts:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit"
  }
}
```

Before merging:

```bash
npm run lint
npm run typecheck
npm run build
```

---

## 24. One-Day Development Order

### Hour 0–1

- Create Supabase project
- Add environment variables
- Run migration
- Run seed
- Create admin users
- Confirm frontend can connect

### Hour 1–3

Build:

- Player registration API
- Player profile query
- Today’s session query
- Admin authentication

### Hour 3–5

Build:

- Attendance route
- Assessment route
- Points route
- Group assignment route
- Pillar completion route

### Hour 5–7

Build:

- Leaderboard query
- Admin participant list
- Profile aggregation
- QR check-in flow

### Hour 7–9

Test complete journey:

1. Register player
2. Confirm Division 10
3. Confirm session registration
4. Check player in
5. Add assessment
6. Award points
7. Mark pillars complete
8. Confirm player profile updates
9. Confirm leaderboard updates

### Final Integration

- Remove mock data
- Protect admin routes
- Test mobile browser
- Add error states
- Deploy
- Seed 10–20 demo players
- Record a working demo

---

## 25. Developer Ownership

### Developer 1 — Backend Lead

- Supabase setup
- Schema and migrations
- Shared types
- Authentication
- Deployment
- Pull-request review

### Developer 2 — Player Service

- Player registration
- Profile fetch
- Photo upload
- Duplicate-phone handling

### Developer 3 — Session Service

- Today’s session
- Session registration
- Attendance
- QR check-in

### Developer 4 — Assessment Service

- Assessment validation
- Rating formula
- Coach notes
- Profile assessment output

### Developer 5 — Points and Divisions

- Point transactions
- Division seed
- Leaderboard
- Duplicate-award protection

### Developer 6 — Admin Integration

- Admin API consumption
- Group assignment
- Pillar completion
- End-to-end testing
- Error and loading states

---

## 26. End-to-End Acceptance Test

The backend is complete when all steps below pass:

### Registration

- A new player can register.
- Duplicate phone numbers are rejected.
- The player receives a UUID.
- The player is assigned to Division 10.
- The player is registered for today’s session.
- An attendance row is created.

### Check-In

- An admin can check the player in.
- Check-in time is stored.
- Attendance points are awarded once.
- Repeated check-in does not duplicate points.

### Assessment

- A coach can enter six scores.
- Invalid scores are rejected.
- The backend calculates the overall rating.
- The player profile displays the latest assessment.

### Points

- An admin can award valid actions.
- Arbitrary point values are rejected.
- Transactions appear in player history.
- Total points update correctly.

### Pillars

- Each pillar can be marked complete.
- All five pillar records are stored.
- The completion bonus is awarded once.

### Leaderboard

- The player appears in the leaderboard.
- Ranking uses points first.
- Division filtering works.
- Today and all-time views work.

### Security

- Public users cannot mutate admin-controlled data.
- Injury and emergency-contact details do not appear publicly.
- Service-role credentials are not exposed in the browser.

---

## 27. Definition of Done

The Day-1 backend is ready when:

- The production database is live.
- The existing frontend is connected to real data.
- The admin dashboard can operate the session.
- A participant can register in under two minutes.
- Check-in works from a phone.
- Coach assessments save correctly.
- Points and leaderboard update without refresh errors.
- No sensitive fields are publicly exposed.
- The production build succeeds.
- The complete journey has been tested with at least 10 sample players.

---

## 28. Post-MVP Priorities

After the activation MVP is stable:

1. Automatic team balancing
2. Promotion and relegation rules
3. Detailed player progression charts
4. Coach-specific permissions
5. Session templates
6. CSV exports
7. Match event logging
8. Video uploads
9. Computer-vision analytics
10. RFID or smart-bib integration
11. Membership and payment systems
12. Multi-location support

---

## 29. Core Product Principle

Build the operational loop before building advanced analytics.

The MVP must reliably answer:

- Who registered?
- Who attended?
- What did they complete?
- How did they perform?
- What points did they earn?
- Which division are they in?
- What should the player see after the session?

Everything else can be layered on top of this foundation.
