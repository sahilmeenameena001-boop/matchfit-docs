-- 003_pillar_features.sql
-- Three pillar features: (1) Calendar, (2) Planning/Integration, (3) Output Library.
-- Pattern: public read, staff-only write (writes go through admin/service-role server routes).

-- Reuse the updated_at helper (safe to re-create).
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================
-- 1. Calendar (plan + track)
-- ============================================================
create table if not exists pillar_calendar (
  id             uuid primary key default uuid_generate_v4(),
  scheduled_date date not null,
  pillar_number  integer not null check (pillar_number between 1 and 5),
  session_id     uuid references sessions(id) on delete set null,
  title          text,
  notes          text,
  status         text not null default 'planned'
                 check (status in ('planned','completed','cancelled')),
  created_by     uuid references admins(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (scheduled_date, pillar_number)
);
create index if not exists idx_calendar_date on pillar_calendar(scheduled_date);

create trigger update_pillar_calendar_updated_at
before update on pillar_calendar
for each row execute procedure update_updated_at_column();

-- ============================================================
-- 2. Planning / Integration (one assembled plan per session)
-- ============================================================
create table if not exists session_plans (
  id             uuid primary key default uuid_generate_v4(),
  session_id     uuid references sessions(id) on delete cascade,
  plan_date      date not null,
  status         text not null default 'draft'
                 check (status in ('draft','confirmed','archived')),
  squads         jsonb,          -- allocation output (Squads A-F)
  stations       jsonb,          -- pillar 1 stations + difficulty
  challenges     jsonb,          -- pillar 2 chosen games
  pairings       jsonb,          -- pillar 3 1v1 pairs
  match_schedule jsonb,          -- pillar 4 round-robin
  movement_plan  jsonb,          -- pillar 5 readiness / pods
  notes          text,
  created_by     uuid references admins(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (session_id)
);
create index if not exists idx_plans_status on session_plans(status);

create trigger update_session_plans_updated_at
before update on session_plans
for each row execute procedure update_updated_at_column();

-- ============================================================
-- 3. Output Library (published artifacts)
-- ============================================================
create table if not exists output_library (
  id          uuid primary key default uuid_generate_v4(),
  kind        text not null
              check (kind in ('session_summary','player_card','report','award','export')),
  title       text not null,
  session_id  uuid references sessions(id) on delete set null,
  player_id   uuid references players(id) on delete set null,
  payload     jsonb,           -- structured data (scores, xp, awards)
  file_url    text,            -- Supabase Storage link (pdf/csv/image)
  is_public   boolean not null default true,
  created_by  uuid references admins(id),
  created_at  timestamptz not null default now()
);
create index if not exists idx_library_kind on output_library(kind);
create index if not exists idx_library_public on output_library(is_public);

-- ============================================================
-- Row Level Security: public reads, no public writes
-- (staff writes bypass RLS via the service-role key in server routes)
-- ============================================================
alter table pillar_calendar enable row level security;
alter table session_plans   enable row level security;
alter table output_library  enable row level security;

-- Calendar: fully public to read.
create policy "public reads calendar"
  on pillar_calendar for select using (true);

-- Plans: only CONFIRMED plans are public.
create policy "public reads confirmed plans"
  on session_plans for select using (status = 'confirmed');

-- Library: only items flagged public.
create policy "public reads published outputs"
  on output_library for select using (is_public = true);
