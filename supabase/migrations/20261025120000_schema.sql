-- Empire Mercenary Company — schema
-- Fresh migration for the Next.js app. Scores, pools, level, class, and the
-- point ledger cannot be written by a signed-in player. Every public table
-- has row level security enabled. Numbers live in scoring_config.

create schema if not exists public;

-- daterange exclusion on cohort_sessions needs this extension.
create extension if not exists btree_gist;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin nosuperuser;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin nosuperuser;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin nosuperuser bypassrls;
  end if;
end $$;

grant usage on schema public to anon, authenticated, service_role;

-- ============================================================
-- IDENTITY
-- ============================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique,
  display_name text,
  avatar_url text,
  app_role text not null default 'player' check (app_role in ('player', 'dm', 'admin', 'curator')),
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

comment on column public.profiles.app_role is
  'Company permission. player, dm, admin, or curator. In-fiction rank lives on guild_memberships.rank and characters.rank. TODO(John): confirm whether a Captain is a rank only.';

create table public.guilds (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  banner_url text,
  commander_id uuid references public.profiles (id),
  settings jsonb not null default '{}'::jsonb,
  founded_at timestamptz not null default now()
);

create table public.guild_memberships (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  character_id uuid,
  rank text not null default 'Recruit',
  joined_at timestamptz not null default now(),
  unique (guild_id, user_id)
);

comment on column public.guild_memberships.rank is
  'In-fiction rank. TODO(John): how a rank is earned. Recruit, Sergeant, and Captain are placeholders in rank_catalog.';

create table public.squads (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds (id) on delete cascade,
  name text not null,
  max_size int not null default 6 check (max_size between 1 and 12),
  created_at timestamptz not null default now()
);

comment on column public.squads.max_size is
  'Per-squad cap. The company cap is scoring_config.squad_max_size (default 6). TODO(John): 5 or 6. The column allows up to 12 so the config can move without a migration.';

create table public.characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  guild_id uuid references public.guilds (id),
  squad_id uuid references public.squads (id) on delete set null,
  name text not null,
  species text,
  profession text,
  profession_tool text,
  profession_skill text,
  origin_word text,
  background_bonus jsonb,
  class text,
  level int not null default 1 check (level between 1 and 20),
  rank text not null default 'Recruit',
  strength int not null default 8 check (strength between 8 and 20),
  dexterity int not null default 8 check (dexterity between 8 and 20),
  constitution int not null default 8 check (constitution between 8 and 20),
  intelligence int not null default 8 check (intelligence between 8 and 20),
  wisdom int not null default 8 check (wisdom between 8 and 20),
  charisma int not null default 8 check (charisma between 8 and 20),
  physical_points int not null default 0 check (physical_points >= 0),
  constitution_points int not null default 0 check (constitution_points >= 0),
  mental_points int not null default 0 check (mental_points >= 0),
  inducted_at timestamptz,
  portrait_url text,
  notes text,
  created_at timestamptz not null default now()
);

comment on column public.characters.class is
  'Null until a DM records induction. The sheet says Not yet inducted. TODO(John): which martial classes are open.';
comment on column public.characters.physical_points is
  'Unspent Physical points. Workouts during the first adventure earn them. Strength and Dexterity spend them.';
comment on column public.characters.constitution_points is
  'Unspent Constitution points. Constitution goals earn them. Constitution spends them.';
comment on column public.characters.mental_points is
  'Unspent Mental points. Intelligence, Wisdom, and Charisma goals earn them.';
comment on column public.characters.background_bonus is
  'Which starting bonuses were placed. The 10 from +2 is already on the point-buy table, so 10 to 11 costs 1. TODO(John): confirm that reading.';

alter table public.guild_memberships
  add constraint guild_memberships_character_fk
  foreign key (character_id) references public.characters (id) on delete set null;

-- ============================================================
-- CONFIG (authoritative numbers)
-- ============================================================

create table public.scoring_config (
  id int primary key check (id = 1),
  time_zone text not null,
  cohort_start date not null,
  backfill_days int not null check (backfill_days >= 0),
  goal_backfill_days int not null check (goal_backfill_days >= 0),
  points_per_prescribed_workout int not null check (points_per_prescribed_workout >= 0),
  points_per_custom_workout int not null check (points_per_custom_workout >= 0),
  points_per_lifting_session int not null check (points_per_lifting_session >= 0),
  points_per_goal int not null check (points_per_goal >= 0),
  exercise_points_per_session int not null check (exercise_points_per_session >= 0),
  goal_points_per_session int not null check (goal_points_per_session >= 0),
  session_length_days int not null check (session_length_days >= 1),
  first_adventure_sessions int not null check (first_adventure_sessions >= 1),
  point_buy_budget int not null check (point_buy_budget >= 1),
  point_buy_min int not null,
  point_buy_max int not null,
  squad_max_size int not null check (squad_max_size between 1 and 12),
  award_requires_approval boolean not null,
  log_visibility text not null check (log_visibility in ('owner', 'staff', 'squad', 'company')),
  induction_week int not null default 6,
  adventure_weeks int not null default 16,
  level_after_adventure_1 int not null default 2,
  level_after_adventure_2 int not null default 3,
  veteran_tier_start_week int,
  single_guild boolean not null default true,
  share_lifting_default boolean not null default true
);

comment on table public.scoring_config is
  'Singleton award and company config. Change it with update_scoring_config. Do not hardcode these numbers in the app.';
comment on column public.scoring_config.cohort_start is
  'TODO(John): placeholder first session for the January 2027 cohort. Denver calendar date. Used only when cohort_sessions is empty.';
comment on column public.scoring_config.points_per_custom_workout is
  'TODO(John): custom workouts currently earn the same unit as prescribed workouts. Change this row if they should not.';
comment on column public.scoring_config.goal_backfill_days is
  'TODO(John): goal completions use the same 14-day backfill as workouts and count toward the session of completed_on.';
comment on column public.scoring_config.point_buy_max is
  'TODO(John): purchases stop at 15 until a higher score has a cost in point_buy_costs.';
comment on column public.scoring_config.squad_max_size is
  'TODO(John): squad size is 5 or 6. Default 6.';
comment on column public.scoring_config.award_requires_approval is
  'TODO(John): false means a log awards immediately (self-report). True holds the log as pending until staff approves it.';
comment on column public.scoring_config.log_visibility is
  'TODO(John): who can read another player''s workout log. owner, staff, squad, or company. Default staff.';
comment on column public.scoring_config.veteran_tier_start_week is
  'TODO(John): null keeps the Veteran workout tier closed.';
comment on column public.scoring_config.points_per_lifting_session is
  'TODO(John): one lifting session earns this many Physical points, still inside the exercise cap. Default 1.';
comment on column public.scoring_config.level_after_adventure_1 is
  'Placeholder milestone. Leveling is not automatic. A DM sets the level.';
comment on column public.scoring_config.single_guild is
  'TODO(John): the signup trigger joins the seeded company. Multiple campaigns are not built.';
comment on column public.scoring_config.share_lifting_default is
  'TODO(John): new lifting sessions default to visible to the squad.';

create table public.point_buy_costs (
  score int primary key check (score between 8 and 20),
  cost int not null check (cost >= 0)
);

create table public.cohort_sessions (
  session_number int primary key check (session_number >= 1),
  start_date date not null,
  end_date date not null,
  constraint cohort_sessions_ordered check (end_date >= start_date),
  constraint cohort_sessions_no_overlap exclude using gist (
    daterange(start_date, end_date, '[]') with &&
  )
);

comment on table public.cohort_sessions is
  'Staff award windows, inclusive Denver dates. Empty falls back to the cadence from scoring_config.cohort_start. A longer row is a three-parter. A date in no row is an off-week and earns 0. TODO(John): confirm a missing session should not fall back to the cadence.';

create table public.staff_grant_roles (
  app_role text primary key check (app_role in ('player', 'dm', 'admin', 'curator'))
);

comment on table public.staff_grant_roles is
  'Roles that may grant points and edit the session schedule. TODO(John): captain is a rank, not a role, and is not included. Confirm the list and that staff must share the character''s guild (the functions require that).';

create table public.library_editor_roles (
  app_role text primary key check (app_role in ('player', 'dm', 'admin', 'curator'))
);

comment on table public.library_editor_roles is
  'Roles that may write the workout library. The DM can unpublish without being an editor. TODO(John): confirm admin and curator.';

create table public.config_notes (
  key text primary key,
  note text not null
);

create table public.skill_labels (
  id text primary key,
  default_name text not null,
  display_name text not null,
  source text not null check (source in ('srd-5.2', 'homebrew')),
  attribution text,
  notes text,
  constraint skill_labels_attribution check (attribution is not null)
);

comment on column public.skill_labels.display_name is
  'Player-facing label. TODO(John): Religion stays Religion until you rename it. Do not hardcode labels in the UI.';

create table public.profession_tools (
  id text primary key,
  name text not null,
  source text not null check (source in ('srd-5.2', 'homebrew')),
  attribution text not null
);

create table public.content_species (
  id text primary key,
  name text not null,
  source text not null check (source in ('srd-5.2', 'homebrew')),
  attribution text not null
);

create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source text not null check (source in ('srd-5.2', 'homebrew')),
  attribution text not null,
  payload jsonb not null default '{}'::jsonb
);

create table public.content_spells (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source text not null check (source in ('srd-5.2', 'homebrew')),
  attribution text not null,
  payload jsonb not null default '{}'::jsonb
);

comment on table public.content_spells is
  'Empty until an SRD seed that stores names separately from homebrew. No rules text is copied into this repo.';

create table public.induction_classes (
  id text primary key,
  name text not null,
  enabled boolean not null default false,
  notes text
);

comment on table public.induction_classes is
  'TODO(John): martial classes at induction. Every row ships disabled. Enabling a row is the decision.';

create table public.rank_catalog (
  id text primary key,
  name text not null,
  sort_order int not null,
  notes text
);

-- ============================================================
-- PROGRESSION
-- ============================================================

create table public.attribute_point_ledger (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters (id) on delete cascade,
  source text not null check (source in (
    'workout', 'goal', 'session', 'squad_goal', 'admin', 'spend', 'staff', 'nutrition', 'sleep'
  )),
  source_id uuid,
  points_awarded int not null,
  attribute_target text,
  pool text check (pool is null or pool in ('physical', 'constitution', 'mental')),
  reason text,
  status text not null default 'awarded' check (status in ('awarded', 'pending')),
  approved_by uuid references public.profiles (id),
  session_start date,
  created_at timestamptz not null default now(),
  constraint attribute_point_ledger_sign check (
    source = 'spend' or points_awarded >= 0
  )
);

comment on table public.attribute_point_ledger is
  'Append-only. Inserts happen inside company functions. Spends may be negative. Nothing deletes a row.';

create unique index attribute_point_ledger_source_once
  on public.attribute_point_ledger (source, source_id)
  where source_id is not null and source <> 'spend';

create index attribute_point_ledger_session
  on public.attribute_point_ledger (character_id, session_start, source)
  where points_awarded > 0;

create table public.workout_library (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds (id) on delete cascade,
  title text not null,
  attribute text not null check (attribute in ('str', 'dex', 'con', 'int', 'wis', 'cha')),
  tier text not null check (tier in ('recruit', 'inducted', 'veteran')),
  components text[] not null default '{}',
  published boolean not null default false,
  author_id uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.workout_versions (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workout_library (id) on delete cascade,
  equipment text not null check (equipment in ('functional', 'full_gym', 'at_home')),
  instructions text not null,
  exercises jsonb not null default '[]'::jsonb,
  unique (workout_id, equipment)
);

create table public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters (id) on delete cascade,
  date date not null,
  type text not null,
  exercise text,
  sets int,
  reps int,
  weight numeric,
  duration_minutes int,
  notes text,
  library_workout_id uuid references public.workout_library (id),
  equipment text check (equipment is null or equipment in ('functional', 'full_gym', 'at_home')),
  is_custom boolean not null default true,
  award_track text not null default 'custom' check (award_track in ('prescribed', 'custom', 'lifting')),
  status text not null default 'none' check (status in ('pending', 'awarded', 'none')),
  points_awarded int not null default 0 check (points_awarded >= 0),
  mission_id uuid,
  client_id uuid,
  created_at timestamptz not null default now()
);

create unique index workout_logs_client_once
  on public.workout_logs (character_id, client_id)
  where client_id is not null;

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters (id) on delete cascade,
  category text not null check (category in ('intelligence', 'wisdom', 'charisma', 'constitution')),
  title text not null,
  description text,
  target_frequency text,
  is_active boolean not null default true,
  is_long_term boolean not null default false,
  period_start date,
  period_end date,
  created_at timestamptz not null default now(),
  constraint goals_monthly_period check (
    (period_start is null and period_end is null)
    or (
      period_start is not null
      and period_end is not null
      and period_end >= period_start
      and date_trunc('month', period_start::timestamp)::date
        = date_trunc('month', period_end::timestamp)::date
    )
  )
);

create table public.goal_logs (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals (id) on delete cascade,
  character_id uuid not null references public.characters (id) on delete cascade,
  completed_on date not null,
  notes text,
  status text not null default 'none' check (status in ('pending', 'awarded', 'none')),
  points_awarded int not null default 0 check (points_awarded >= 0),
  created_at timestamptz not null default now()
);

-- ============================================================
-- CAMPAIGN
-- ============================================================

create table public.adventures (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds (id) on delete cascade,
  number int not null,
  title text not null,
  start_date date,
  weeks int not null default 16,
  status text not null default 'upcoming' check (status in ('upcoming', 'active', 'closed')),
  unique (guild_id, number)
);

create table public.missions (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds (id) on delete cascade,
  squad_id uuid references public.squads (id) on delete cascade,
  title text not null,
  description text,
  type text not null default 'contract' check (type in ('contract', 'campaign', 'barracks')),
  attribute_focus text,
  status text not null default 'active' check (status in ('draft', 'active', 'completed', 'failed')),
  start_date date,
  end_date date,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.objectives (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions (id) on delete cascade,
  title text not null,
  description text,
  target_value int,
  current_value int not null default 0,
  unit text,
  is_complete boolean not null default false,
  assigned_to uuid references public.characters (id)
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds (id) on delete cascade,
  adventure_id uuid references public.adventures (id) on delete set null,
  squad_id uuid references public.squads (id) on delete set null,
  act int check (act between 1 and 4),
  part int check (part in (1, 2)),
  title text not null,
  scheduled_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create table public.session_attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  character_id uuid not null references public.characters (id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  loot_share boolean not null default true,
  unique (session_id, character_id)
);

comment on column public.session_attendance.loot_share is
  'TODO(John): what loot share means is not decided. The column records the flag and grants nothing else.';

create table public.session_notes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  character_id uuid references public.characters (id) on delete set null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.campaign_notes (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds (id) on delete cascade,
  adventure_id uuid references public.adventures (id) on delete set null,
  title text not null,
  body text not null,
  visibility text not null check (visibility in ('dm', 'admins', 'members')),
  tags text[] not null default '{}',
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.world_state (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds (id) on delete cascade,
  adventure_id uuid references public.adventures (id) on delete set null,
  month date,
  summary text not null,
  squad_results jsonb not null default '{}'::jsonb,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.world_state is
  'TODO(John): how squad results become a monthly change. Players only see published rows. Do not invent a place description here.';

-- ============================================================
-- SUPPORT
-- ============================================================

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds (id) on delete cascade,
  title text not null,
  body text not null,
  posted_by uuid references public.profiles (id),
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds (id) on delete cascade,
  title text not null,
  description text,
  start_time timestamptz,
  end_time timestamptz,
  type text check (type is null or type in ('session', 'training', 'meeting', 'milestone')),
  created_by uuid references public.profiles (id)
);

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  icon_url text,
  criteria jsonb,
  points_reward int not null default 0
);

create table public.character_achievements (
  character_id uuid not null references public.characters (id) on delete cascade,
  achievement_id uuid not null references public.achievements (id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (character_id, achievement_id)
);

create table public.dice_rolls (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters (id) on delete cascade,
  expression text not null,
  result int not null,
  detail jsonb not null default '{}'::jsonb,
  session_id uuid references public.sessions (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.character_items (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters (id) on delete cascade,
  item_id uuid not null references public.content_items (id),
  quantity int not null default 1 check (quantity >= 0),
  equipped boolean not null default false,
  notes text,
  unique (character_id, item_id)
);

create table public.character_spells (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters (id) on delete cascade,
  spell_id uuid not null references public.content_spells (id),
  prepared boolean not null default false,
  notes text,
  unique (character_id, spell_id)
);

-- ============================================================
-- INDEXES
-- ============================================================

create index idx_characters_user on public.characters (user_id);
create index idx_characters_guild on public.characters (guild_id);
create index idx_characters_squad on public.characters (squad_id);
create index idx_workout_logs_character_date on public.workout_logs (character_id, date);
create index idx_goals_character_active on public.goals (character_id, is_active);
create index idx_goal_logs_goal on public.goal_logs (goal_id, completed_on);
create index idx_missions_guild_status on public.missions (guild_id, status);
create index idx_session_attendance_session on public.session_attendance (session_id);
create index idx_announcements_guild_pinned on public.announcements (guild_id, pinned, created_at desc);

-- ============================================================
-- ROW LEVEL SECURITY (policies arrive in the next migration)
-- ============================================================

do $$
declare
  r record;
begin
  for r in
    select tablename from pg_tables
    where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', r.tablename);
  end loop;
end $$;
