-- Empire Mercenary Company — Complete Schema
-- Milestone progression. Point-buy attributes. Martial classes at Week 6.
-- Self-report + episode accountability. Squad size ≤ 6.
--
-- This replaces the earlier 20261019_initial_schema.sql draft. That file
-- created the same tables without IF NOT EXISTS, added the squad foreign key
-- in a second step, used unnamed indexes, omitted session_notes, and defined
-- RLS policies under different names. Applying both would duplicate policies
-- (Postgres ORs permissive policies), so the draft was removed.

create extension if not exists "uuid-ossp";

-- ============================================================
-- CORE
-- ============================================================

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  discord_id text unique,
  display_name text,
  avatar_url text,
  created_at timestamptz default now(),
  last_seen_at timestamptz
);

create table if not exists public.guilds (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  banner_url text,
  founded_at timestamptz default now(),
  commander_id uuid references public.users(id),
  settings jsonb default '{}'::jsonb
);

create table if not exists public.squads (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds(id) on delete cascade,
  name text not null,
  max_size int default 6 check (max_size <= 6),
  created_at timestamptz default now()
);

create table if not exists public.characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  guild_id uuid references public.guilds(id),
  squad_id uuid references public.squads(id) on delete set null,
  name text not null,
  race text,
  origin_word text,
  profession text,
  class text,
  rank text default 'Recruit',
  level int default 1 check (level >= 1),
  strength int default 8 check (strength between 8 and 20),
  dexterity int default 8 check (dexterity between 8 and 20),
  constitution int default 8 check (constitution between 8 and 20),
  intelligence int default 8 check (intelligence between 8 and 20),
  wisdom int default 8 check (wisdom between 8 and 20),
  charisma int default 8 check (charisma between 8 and 20),
  attribute_points int default 0,
  portrait_url text,
  notes text,
  created_at timestamptz default now(),
  unique(user_id)
);

create table if not exists public.guild_memberships (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  character_id uuid references public.characters(id) on delete set null,
  role text default 'Recruit',
  joined_at timestamptz default now(),
  unique(guild_id, user_id)
);

-- ============================================================
-- PROGRESSION
-- ============================================================

create table if not exists public.attribute_point_ledger (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters(id) on delete cascade,
  source text not null,
  source_id uuid,
  points_awarded int not null,
  attribute_target text,
  reason text,
  created_at timestamptz default now()
);

create table if not exists public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters(id) on delete cascade,
  date date not null default current_date,
  type text not null,
  exercise text,
  sets int,
  reps int,
  weight numeric,
  duration_minutes int,
  notes text,
  points_awarded int default 0,
  mission_id uuid,
  created_at timestamptz default now()
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters(id) on delete cascade,
  category text not null check (category in ('intelligence','wisdom','charisma','constitution')),
  title text not null,
  description text,
  target_frequency text,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.goal_logs (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  completed_at timestamptz default now(),
  notes text,
  points_awarded int default 0
);

-- ============================================================
-- MISSIONS & SESSIONS
-- ============================================================

create table if not exists public.missions (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds(id) on delete cascade,
  title text not null,
  description text,
  type text default 'contract',
  attribute_focus text,
  status text default 'active' check (status in ('draft','active','completed','failed')),
  start_date date,
  end_date date,
  created_by uuid references public.users(id),
  created_at timestamptz default now()
);

create table if not exists public.objectives (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions(id) on delete cascade,
  title text not null,
  description text,
  target_value int,
  current_value int default 0,
  unit text,
  is_complete boolean default false,
  assigned_to uuid references public.characters(id)
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds(id) on delete cascade,
  squad_id uuid references public.squads(id),
  title text not null,
  adventure_month int,
  part int check (part in (1,2)),
  scheduled_at timestamptz,
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.session_attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  checked_in_at timestamptz default now(),
  loot_share boolean default true,
  unique(session_id, character_id)
);

create table if not exists public.session_notes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  character_id uuid references public.characters(id),
  content text not null,
  created_at timestamptz default now()
);

-- ============================================================
-- SUPPORTING
-- ============================================================

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid references public.guilds(id) on delete cascade,
  title text not null,
  body text not null,
  posted_by uuid references public.users(id),
  pinned boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  icon_url text,
  criteria jsonb,
  points_reward int default 0
);

create table if not exists public.character_achievements (
  character_id uuid references public.characters(id) on delete cascade,
  achievement_id uuid references public.achievements(id) on delete cascade,
  earned_at timestamptz default now(),
  primary key (character_id, achievement_id)
);

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid references public.guilds(id) on delete cascade,
  title text not null,
  description text,
  start_time timestamptz,
  end_time timestamptz,
  type text,
  created_by uuid references public.users(id)
);

-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists idx_characters_user on public.characters(user_id);
create index if not exists idx_characters_guild on public.characters(guild_id);
create index if not exists idx_characters_squad on public.characters(squad_id);
create index if not exists idx_workout_logs_character_date on public.workout_logs(character_id, date);
create index if not exists idx_attribute_ledger_character on public.attribute_point_ledger(character_id, created_at);
create index if not exists idx_missions_guild_status on public.missions(guild_id, status);
create index if not exists idx_session_attendance_session on public.session_attendance(session_id);
create index if not exists idx_goals_character_active on public.goals(character_id, is_active);

-- ============================================================
-- RLS
-- ============================================================

alter table public.users enable row level security;
alter table public.characters enable row level security;
alter table public.workout_logs enable row level security;
alter table public.goals enable row level security;
alter table public.goal_logs enable row level security;
alter table public.missions enable row level security;
alter table public.sessions enable row level security;
alter table public.session_attendance enable row level security;
alter table public.session_notes enable row level security;
alter table public.announcements enable row level security;

create policy "Users view own profile" on public.users for select using (auth.uid() = id);

create policy "Owners manage own character" on public.characters for all using (auth.uid() = user_id);

create policy "Guild members view characters" on public.characters for select using (
  guild_id in (select guild_id from public.guild_memberships where user_id = auth.uid())
);

create policy "Owners manage workout logs" on public.workout_logs for all using (
  character_id in (select id from public.characters where user_id = auth.uid())
);

create policy "Owners manage goals" on public.goals for all using (
  character_id in (select id from public.characters where user_id = auth.uid())
);

create policy "Owners manage goal logs" on public.goal_logs for all using (
  character_id in (select id from public.characters where user_id = auth.uid())
);

create policy "Guild members view missions" on public.missions for select using (
  guild_id in (select guild_id from public.guild_memberships where user_id = auth.uid())
);

create policy "Guild members view sessions" on public.sessions for select using (
  guild_id in (select guild_id from public.guild_memberships where user_id = auth.uid())
);

create policy "Players manage own attendance" on public.session_attendance for all using (
  character_id in (select id from public.characters where user_id = auth.uid())
);

create policy "Guild members view and add session notes" on public.session_notes for all using (
  session_id in (
    select id from public.sessions where guild_id in (
      select guild_id from public.guild_memberships where user_id = auth.uid()
    )
  )
);

-- ============================================================
-- FUNCTIONS
-- ============================================================

create or replace function public.award_attribute_points(
  p_character_id uuid,
  p_points int,
  p_source text,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Locked rule: never take progress away as a penalty.
  if p_points < 0 then
    raise exception 'Points cannot be taken away';
  end if;

  insert into public.attribute_point_ledger (character_id, source, points_awarded, reason)
  values (p_character_id, p_source, p_points, p_reason);

  update public.characters
  set attribute_points = attribute_points + p_points
  where id = p_character_id;
end;
$$;

revoke all on function public.award_attribute_points(uuid, integer, text, text) from public;
grant execute on function public.award_attribute_points(uuid, integer, text, text) to authenticated;

-- characters.user_id references public.users, not auth.users. Without this
-- trigger, create_character fails the foreign key for a brand-new account.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'user_name'
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke all on function public.handle_new_user() from public;
