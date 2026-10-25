-- Split the single attribute_points pool into three source pools.
--
-- Physical (STR/DEX) comes from workouts.
-- Constitution comes from nutrition and sleep.
-- Mental (INT/WIS/CHA) comes from SMART goals.
--
-- Scores and pool balances can change only through spend_attribute_points
-- and award_attribute_points. Direct updates of those columns are rejected.
--
-- Automatic attribute points are earned only during the first adventure.
-- Placeholders live in progression_config(), program_settings.cohort_start,
-- and cohort_sessions. Keep them aligned with ProgressionRules in
-- lib/core/utils/progression.dart.
--   Cohort anchor: 2026-10-05 (Denver calendar date). John must set the real one.
--   With no schedule rows, a session is 14 Denver calendar days from that
--   anchor. Session 1 starts on the anchor. Numbers are 1-based.
--   The first adventure is 8 sessions (16 weeks at that pace).
--   Each session: at most 3 Physical points from workouts, 1 per log.
--   Each session: at most 3 points from goals. Constitution goals pay
--   Constitution. Intelligence, Wisdom, and Charisma goals pay Mental.
--   The point-buy budget is 27, including the 3 points already in the
--   starting array. That total is the binding cap: 4 maxed sessions earn
--   the remaining 24 points. Sessions 5 through 8 are for a slower pace.
--   Automatic awards stop at 27 or outside a first-adventure session.
--   A published cohort_sessions row replaces the cadence. A longer row is
--   a three-parter and keeps one cap. A date in no row is an off-week and
--   earns 0. Later scheduled sessions still award.
--   A log within 14 days can still earn for the session of its own date.
--   Older logs are saved and earn 0. Future dates are rejected.
--   Staff grants are extra, require a reason, and may pass 27.
--   Nothing already earned is removed.

-- ============================================================
-- POOL BALANCES
-- ============================================================

alter table public.characters
  add column physical_points int not null default 0,
  add column constitution_points int not null default 0,
  add column mental_points int not null default 0;

alter table public.characters
  add constraint characters_physical_points_nonnegative check (physical_points >= 0),
  add constraint characters_constitution_points_nonnegative check (constitution_points >= 0),
  add constraint characters_mental_points_nonnegative check (mental_points >= 0);

-- Untyped balances have no source, so they cannot be placed in a pool.
do $$
begin
  if exists (select 1 from public.characters where attribute_points <> 0) then
    raise exception 'Cannot split attribute_points: a character still holds an untyped balance';
  end if;
end $$;

drop function if exists public.award_attribute_points(uuid, integer, text, text);

alter table public.characters drop column attribute_points;

comment on column public.characters.physical_points is 'Unspent Physical points. Workouts during the first adventure earn them. Strength and Dexterity spend them.';
comment on column public.characters.constitution_points is 'Unspent Constitution points. Constitution goals earn them during the first adventure. Constitution spends them.';
comment on column public.characters.mental_points is 'Unspent Mental points. Intelligence, Wisdom, and Charisma goals earn them during the first adventure. Those abilities spend them.';

-- ============================================================
-- LEDGER
-- ============================================================

alter table public.attribute_point_ledger
  add column pool text,
  add column session_start date;

comment on column public.attribute_point_ledger.session_start is
  'First Denver calendar day of the adventure session this automatic award counts against. From cohort_sessions when a schedule is published, otherwise the 14-day cadence. Null for staff grants and for dates in no session.';

alter table public.attribute_point_ledger
  add constraint attribute_point_ledger_pool_check
    check (pool is null or pool in ('physical', 'constitution', 'mental')),
  add constraint attribute_point_ledger_points_nonnegative
    check (points_awarded >= 0);

-- One award per source row (a workout log, a goal, and so on).
create unique index attribute_point_ledger_source_once
  on public.attribute_point_ledger (source, source_id)
  where source_id is not null;

-- Supports the per-session allotment sums.
create index attribute_point_ledger_session
  on public.attribute_point_ledger (character_id, session_start, source)
  where points_awarded > 0;

-- ============================================================
-- COST TABLE
-- ============================================================

create or replace function public.point_buy_cost(p_score int)
returns int
language sql
immutable
as $$
  select case p_score
    when 8 then 0
    when 9 then 1
    when 10 then 2
    when 11 then 3
    when 12 then 4
    when 13 then 5
    when 14 then 7
    when 15 then 9
    else null
  end
$$;

revoke all on function public.point_buy_cost(integer) from public;

-- ============================================================
-- BLOCK DIRECT SCORE AND POOL WRITES
-- ============================================================

create or replace function public.protect_character_progression()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_setting('emc.progression_write', true) = 'on' then
    return new;
  end if;

  if new.strength is distinct from old.strength
     or new.dexterity is distinct from old.dexterity
     or new.constitution is distinct from old.constitution
     or new.intelligence is distinct from old.intelligence
     or new.wisdom is distinct from old.wisdom
     or new.charisma is distinct from old.charisma
     or new.physical_points is distinct from old.physical_points
     or new.constitution_points is distinct from old.constitution_points
     or new.mental_points is distinct from old.mental_points
  then
    raise exception 'Ability scores and point pools can only change through company functions';
  end if;

  return new;
end;
$$;

drop trigger if exists characters_protect_progression on public.characters;
create trigger characters_protect_progression
  before update on public.characters
  for each row execute function public.protect_character_progression();

revoke all on function public.protect_character_progression() from public;

-- The ledger is written only by award_attribute_points. Owners may read it.
alter table public.attribute_point_ledger enable row level security;

create policy "Owners read own point ledger"
  on public.attribute_point_ledger for select
  using (
    character_id in (select id from public.characters where user_id = auth.uid())
  );

create or replace function public.protect_workout_points()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.date > public.company_today() then
    raise exception 'Future workout dates are rejected';
  end if;

  if current_setting('emc.progression_write', true) = 'on' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.points_awarded is distinct from 0 then
      raise exception 'Workout points are awarded by the company';
    end if;
    return new;
  end if;

  if new.points_awarded is distinct from old.points_awarded then
    raise exception 'Workout points are awarded by the company';
  end if;

  return new;
end;
$$;

drop trigger if exists workout_logs_protect_points on public.workout_logs;
create trigger workout_logs_protect_points
  before insert or update on public.workout_logs
  for each row execute function public.protect_workout_points();

revoke all on function public.protect_workout_points() from public;

-- ============================================================
-- FIRST ADVENTURE CONFIG
-- ============================================================

-- The cohort anchor is data, so it can change without editing the function.
-- 2026-10-05 is a placeholder. With no schedule rows, session 1 is that
-- Denver date through the next 13 dates. A fallback session is 14 calendar
-- dates, so DST does not add or drop a day.
create table public.program_settings (
  id int primary key check (id = 1),
  cohort_start date not null
);

insert into public.program_settings (id, cohort_start)
values (1, date '2026-10-05');

comment on table public.program_settings is
  'Singleton program clock. cohort_start is the first day of session 1 when cohort_sessions is empty. It is a Denver calendar date. A published schedule does not use it to place dates.';

-- Staff-editable award windows. Empty means the 14-day cadence.
-- A three-parter is one row whose inclusive end is later than the usual
-- 13 days after start. That whole span shares one session cap.
-- An off-week is not a row. It is any date no row covers, and it earns 0.
-- Once any row exists, dates the table does not cover do not fall back to
-- the cadence. Delete the rows to restore it.
-- Session numbers above first_adventure_sessions may be stored and do not
-- award automatic points. Numbers start at 1.
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
  'Staff schedule of award windows, inclusive Denver dates. Empty falls back to the 14-day cadence from program_settings.cohort_start. A longer row is a three-parter. A gap is an off-week and belongs to no session.';

alter table public.cohort_sessions enable row level security;

create policy "Authenticated read cohort sessions"
  on public.cohort_sessions for select
  to authenticated
  using (true);

revoke all on table public.cohort_sessions from public;
grant select on table public.cohort_sessions to authenticated;

alter table public.program_settings enable row level security;

create policy "Authenticated read program settings"
  on public.program_settings for select
  to authenticated
  using (true);

-- Placeholders for John. Keep every column aligned with ProgressionRules.
create or replace function public.progression_config()
returns table (
  time_zone text,
  backfill_days int,
  points_per_workout int,
  points_per_goal int,
  exercise_points_per_session int,
  goal_points_per_session int,
  session_length_days int,
  first_adventure_sessions int,
  point_buy_budget int,
  cohort_start date
)
language sql
stable
as $$
  select
    'America/Denver'::text,
    14,
    1,
    1,
    3,
    3,
    14,
    8,
    27,
    (select cohort_start from public.program_settings where id = 1)
$$;

comment on function public.progression_config() is
  'First-adventure award config. Numbers are placeholders. cohort_start comes from program_settings. Mirror of ProgressionRules. first_adventure_sessions is 8. The 27-point budget still stops a maxed build at session 4.';

revoke all on function public.progression_config() from public;
grant execute on function public.progression_config() to authenticated;

-- The session containing p_day. No row when the date is before the cadence
-- anchor, or in a gap of a published schedule.
-- session_number is 1 for the first session. A published schedule wins over
-- the cadence as soon as cohort_sessions has any row.
create or replace function public.adventure_session(p_day date)
returns table (
  session_number int,
  start_date date,
  end_date date
)
language plpgsql
stable
as $$
declare
  v_anchor date;
  v_length int;
  v_index int;
begin
  if p_day is null then
    return;
  end if;

  if exists (select 1 from public.cohort_sessions) then
    return query
      select s.session_number, s.start_date, s.end_date
      from public.cohort_sessions s
      where p_day between s.start_date and s.end_date
      limit 1;
    return;
  end if;

  select c.cohort_start, c.session_length_days
    into v_anchor, v_length
  from public.progression_config() c;

  if v_anchor is null or v_length is null or v_length < 1 or p_day < v_anchor then
    return;
  end if;

  v_index := (p_day - v_anchor) / v_length;
  session_number := v_index + 1;
  start_date := v_anchor + (v_index * v_length);
  end_date := start_date + (v_length - 1);
  return next;
end;
$$;

comment on function public.adventure_session(date) is
  'Award window for a Denver date. Schedule rows win when any exist. Otherwise a 14-day window from the cohort anchor. Session 1 is the first window.';

revoke all on function public.adventure_session(date) from public;
grant execute on function public.adventure_session(date) to authenticated;

-- 1-based session number, or null when the date is in no window.
create or replace function public.adventure_session_index(p_day date)
returns int
language sql
stable
as $$
  select session_number from public.adventure_session(p_day)
$$;

revoke all on function public.adventure_session_index(date) from public;
grant execute on function public.adventure_session_index(date) to authenticated;

create or replace function public.adventure_session_start(p_day date)
returns date
language sql
stable
as $$
  select start_date from public.adventure_session(p_day)
$$;

revoke all on function public.adventure_session_start(date) from public;
grant execute on function public.adventure_session_start(date) to authenticated;

-- Calendar date of an instant in the configured zone. DST-aware.
-- Matches ProgressionRules.calendarDate for the same IANA name.
create or replace function public.company_calendar_date(p_at timestamptz)
returns date
language sql
stable
strict
as $$
  select (timezone(
    (select time_zone from public.progression_config()),
    p_at
  ))::date
$$;

comment on function public.company_calendar_date(timestamptz) is
  'Calendar date of an instant in progression_config().time_zone.';

revoke all on function public.company_calendar_date(timestamptz) from public;
grant execute on function public.company_calendar_date(timestamptz) to authenticated;

create or replace function public.company_today()
returns date
language sql
stable
as $$
  select public.company_calendar_date(now())
$$;

comment on function public.company_today() is
  'Today in the company time zone. Workout logs and the backfill window use this date.';

revoke all on function public.company_today() from public;
grant execute on function public.company_today() to authenticated;

alter table public.workout_logs
  alter column date set default public.company_today();

comment on column public.workout_logs.date is
  'Calendar date the workout happened, in the company time zone (America/Denver unless config changes).';

-- ============================================================
-- AWARD
-- ============================================================

create or replace function public.award_attribute_points(
  p_character_id uuid,
  p_points int,
  p_source text,
  p_pool text,
  p_reason text default null,
  p_source_id uuid default null
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_event_date date;
  v_log_character uuid;
  v_goal_character uuid;
  v_category text;
  v_expected_pool text;
  v_allotment text;
  v_unit int;
  v_cap int;
  v_used int;
  v_award int;
  v_session_index int;
  v_session_start date;
  v_budget int;
  v_backfill int;
  v_today date;
  v_zone text;
  v_length int;
  v_sessions int;
  v_target int;
  v_points_per_workout int;
  v_points_per_goal int;
  v_exercise_cap int;
  v_goal_cap int;
begin
  if p_points <= 0 then
    raise exception 'Points cannot be taken away';
  end if;

  if p_pool not in ('physical', 'constitution', 'mental') then
    raise exception 'Unknown point pool';
  end if;

  if p_source = 'staff' then
    raise exception 'Staff grants use grant_staff_attribute_points';
  elsif p_source not in ('workout', 'goal', 'nutrition', 'sleep') then
    raise exception 'Unknown point source';
  end if;

  select user_id into v_owner
  from public.characters
  where id = p_character_id
  for update;

  if not found then
    raise exception 'Character not found';
  end if;
  if v_owner is distinct from auth.uid() then
    raise exception 'Not your character';
  end if;

  -- Replaying an award for the same source row adds nothing.
  if p_source_id is not null and exists (
    select 1 from public.attribute_point_ledger
    where source = p_source and source_id = p_source_id
  ) then
    return 0;
  end if;

  select time_zone, backfill_days, points_per_workout, points_per_goal,
         exercise_points_per_session, goal_points_per_session,
         session_length_days, first_adventure_sessions, point_buy_budget
    into v_zone, v_backfill, v_points_per_workout, v_points_per_goal,
         v_exercise_cap, v_goal_cap, v_length, v_sessions, v_target
  from public.progression_config();

  if v_points_per_workout < 1
     or v_points_per_goal < 1
     or v_exercise_cap < 1
     or v_goal_cap < 1
     or v_length < 1
     or v_sessions < 1
     or v_target < 1
     or v_backfill < 0
     or v_zone is null
     or length(btrim(v_zone)) = 0
     or (select cohort_start from public.progression_config()) is null
  then
    raise exception 'Progression config is invalid';
  end if;

  v_today := public.company_today();

  if p_source = 'workout' then
    if p_pool <> 'physical' then
      raise exception 'Workouts award Physical points';
    end if;
    if p_source_id is null then
      raise exception 'Workout awards require a log id';
    end if;
    if p_points <> v_points_per_workout then
      raise exception 'A workout award must use the configured points per workout';
    end if;

    select character_id, date into v_log_character, v_event_date
    from public.workout_logs
    where id = p_source_id
    for update;

    if not found or v_log_character <> p_character_id then
      raise exception 'Workout log not found';
    end if;

    v_allotment := 'exercise';
    v_unit := v_points_per_workout;
    v_cap := v_exercise_cap;
  elsif p_source = 'goal' then
    if p_source_id is null then
      raise exception 'Goal awards require a goal id';
    end if;
    if p_points <> v_points_per_goal then
      raise exception 'A goal award must use the configured points per goal';
    end if;

    select character_id, category into v_goal_character, v_category
    from public.goals
    where id = p_source_id;

    if not found or v_goal_character <> p_character_id then
      raise exception 'Goal not found';
    end if;

    if v_category = 'constitution' then
      v_expected_pool := 'constitution';
    elsif v_category in ('intelligence', 'wisdom', 'charisma') then
      v_expected_pool := 'mental';
    else
      raise exception 'Unknown goal category';
    end if;
    if p_pool <> v_expected_pool then
      raise exception 'That goal awards % points', v_expected_pool;
    end if;

    v_event_date := v_today;
    v_allotment := 'goal';
    v_unit := v_points_per_goal;
    v_cap := v_goal_cap;
  else
    if p_pool <> 'constitution' then
      raise exception 'Nutrition and sleep award Constitution points';
    end if;
    if p_source_id is null then
      raise exception 'Nutrition and sleep awards require a source id';
    end if;
    if p_points <> v_points_per_goal then
      raise exception 'A goal award must use the configured points per goal';
    end if;
    v_event_date := v_today;
    v_allotment := 'goal';
    v_unit := v_points_per_goal;
    v_cap := v_goal_cap;
  end if;

  if v_event_date > v_today then
    raise exception 'Future workout dates are rejected';
  end if;

  -- Outside the backfill window a workout stays in the journal and earns 0.
  if p_source = 'workout' and v_event_date < v_today - v_backfill then
    update public.workout_logs
    set points_awarded = 0
    where id = p_source_id;
    return 0;
  end if;

  v_session_index := public.adventure_session_index(v_event_date);
  if v_session_index is null or v_session_index < 1 or v_session_index > v_sessions then
    if p_source = 'workout' then
      update public.workout_logs
      set points_awarded = 0
      where id = p_source_id;
    end if;
    return 0;
  end if;

  v_session_start := public.adventure_session_start(v_event_date);

  if v_allotment = 'exercise' then
    select coalesce(sum(points_awarded), 0)::int into v_used
    from public.attribute_point_ledger
    where character_id = p_character_id
      and source = 'workout'
      and points_awarded > 0
      and session_start = v_session_start;
  else
    select coalesce(sum(points_awarded), 0)::int into v_used
    from public.attribute_point_ledger
    where character_id = p_character_id
      and source in ('goal', 'nutrition', 'sleep')
      and points_awarded > 0
      and session_start = v_session_start;
  end if;

  select
    public.point_buy_cost(strength)
    + public.point_buy_cost(dexterity)
    + public.point_buy_cost(constitution)
    + public.point_buy_cost(intelligence)
    + public.point_buy_cost(wisdom)
    + public.point_buy_cost(charisma)
    + physical_points + constitution_points + mental_points
  into v_budget
  from public.characters
  where id = p_character_id;

  if v_budget is null then
    raise exception 'Scores must stay between 8 and 15';
  end if;

  v_award := least(v_unit, v_cap - v_used, v_target - v_budget);
  if v_award is null or v_award <= 0 then
    if p_source = 'workout' then
      update public.workout_logs
      set points_awarded = 0
      where id = p_source_id;
    end if;
    return 0;
  end if;

  perform set_config('emc.progression_write', 'on', true);

  if p_pool = 'physical' then
    update public.characters
    set physical_points = physical_points + v_award
    where id = p_character_id;
  elsif p_pool = 'constitution' then
    update public.characters
    set constitution_points = constitution_points + v_award
    where id = p_character_id;
  else
    update public.characters
    set mental_points = mental_points + v_award
    where id = p_character_id;
  end if;

  insert into public.attribute_point_ledger (
    character_id, source, source_id, points_awarded, attribute_target, pool, session_start, reason
  ) values (
    p_character_id, p_source, p_source_id, v_award, p_pool, p_pool, v_session_start, p_reason
  );

  if p_source = 'workout' then
    update public.workout_logs
    set points_awarded = v_award
    where id = p_source_id;
  end if;

  perform set_config('emc.progression_write', 'off', true);

  return v_award;
end;
$$;

revoke all on function public.award_attribute_points(uuid, integer, text, text, text, uuid) from public;
grant execute on function public.award_attribute_points(uuid, integer, text, text, text, uuid) to authenticated;

-- ============================================================
-- SPEND
-- ============================================================

create or replace function public.spend_attribute_points(
  p_character_id uuid,
  p_strength int,
  p_dexterity int,
  p_constitution int,
  p_intelligence int,
  p_wisdom int,
  p_charisma int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.characters%rowtype;
  v_physical int;
  v_constitution int;
  v_mental int;
begin
  select * into v_row
  from public.characters
  where id = p_character_id
  for update;

  if not found then
    raise exception 'Character not found';
  end if;
  if v_row.user_id is distinct from auth.uid() then
    raise exception 'Not your character';
  end if;

  if public.point_buy_cost(p_strength) is null
     or public.point_buy_cost(p_dexterity) is null
     or public.point_buy_cost(p_constitution) is null
     or public.point_buy_cost(p_intelligence) is null
     or public.point_buy_cost(p_wisdom) is null
     or public.point_buy_cost(p_charisma) is null
     or public.point_buy_cost(v_row.strength) is null
     or public.point_buy_cost(v_row.dexterity) is null
     or public.point_buy_cost(v_row.constitution) is null
     or public.point_buy_cost(v_row.intelligence) is null
     or public.point_buy_cost(v_row.wisdom) is null
     or public.point_buy_cost(v_row.charisma) is null
  then
    raise exception 'Scores must stay between 8 and 15';
  end if;

  v_physical :=
    (public.point_buy_cost(p_strength) - public.point_buy_cost(v_row.strength))
    + (public.point_buy_cost(p_dexterity) - public.point_buy_cost(v_row.dexterity));
  v_constitution :=
    public.point_buy_cost(p_constitution) - public.point_buy_cost(v_row.constitution);
  v_mental :=
    (public.point_buy_cost(p_intelligence) - public.point_buy_cost(v_row.intelligence))
    + (public.point_buy_cost(p_wisdom) - public.point_buy_cost(v_row.wisdom))
    + (public.point_buy_cost(p_charisma) - public.point_buy_cost(v_row.charisma));

  if v_row.physical_points - v_physical < 0 then
    raise exception 'Not enough Physical points';
  end if;
  if v_row.constitution_points - v_constitution < 0 then
    raise exception 'Not enough Constitution points';
  end if;
  if v_row.mental_points - v_mental < 0 then
    raise exception 'Not enough Mental points';
  end if;

  perform set_config('emc.progression_write', 'on', true);

  update public.characters
  set strength = p_strength,
      dexterity = p_dexterity,
      constitution = p_constitution,
      intelligence = p_intelligence,
      wisdom = p_wisdom,
      charisma = p_charisma,
      physical_points = physical_points - v_physical,
      constitution_points = constitution_points - v_constitution,
      mental_points = mental_points - v_mental
  where id = p_character_id;

  perform set_config('emc.progression_write', 'off', true);
end;
$$;

revoke all on function public.spend_attribute_points(uuid, integer, integer, integer, integer, integer, integer) from public;
grant execute on function public.spend_attribute_points(uuid, integer, integer, integer, integer, integer, integer) to authenticated;

-- ============================================================
-- WORKOUT LOG + AWARD
-- ============================================================

create or replace function public.record_workout(
  p_character_id uuid,
  p_type text,
  p_exercise text,
  p_sets int default null,
  p_reps int default null,
  p_notes text default null,
  p_date date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_log_id uuid;
  v_awarded int;
  v_today date;
begin
  if p_exercise is null or length(btrim(p_exercise)) = 0 then
    raise exception 'Exercise is required';
  end if;
  if p_type is null or length(btrim(p_type)) = 0 then
    raise exception 'Workout type is required';
  end if;

  select user_id into v_owner
  from public.characters
  where id = p_character_id;

  if not found then
    raise exception 'Character not found';
  end if;
  if v_owner is distinct from auth.uid() then
    raise exception 'Not your character';
  end if;

  v_today := public.company_today();
  if p_date is null then
    p_date := v_today;
  end if;
  if p_date > v_today then
    raise exception 'Future workout dates are rejected';
  end if;

  insert into public.workout_logs (
    character_id, date, type, exercise, sets, reps, notes, points_awarded
  ) values (
    p_character_id, p_date, btrim(p_type), btrim(p_exercise), p_sets, p_reps, p_notes, 0
  )
  returning id into v_log_id;

  v_awarded := public.award_attribute_points(
    p_character_id,
    (select points_per_workout from public.progression_config()),
    'workout',
    'physical',
    btrim(p_exercise),
    v_log_id
  );

  return jsonb_build_object(
    'log_id', v_log_id,
    'points_awarded', v_awarded
  );
end;
$$;

revoke all on function public.record_workout(uuid, text, text, integer, integer, text, date) from public;
grant execute on function public.record_workout(uuid, text, text, integer, integer, text, date) to authenticated;

-- ============================================================
-- GOAL COMPLETION
-- ============================================================

-- One award per goal. The pool comes from the goal category, not the client.
create or replace function public.record_goal_completion(
  p_character_id uuid,
  p_goal_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_goal_character uuid;
  v_category text;
  v_pool text;
  v_awarded int;
  v_log_id uuid;
begin
  select user_id into v_owner
  from public.characters
  where id = p_character_id;

  if not found then
    raise exception 'Character not found';
  end if;
  if v_owner is distinct from auth.uid() then
    raise exception 'Not your character';
  end if;

  select character_id, category into v_goal_character, v_category
  from public.goals
  where id = p_goal_id;

  if not found or v_goal_character <> p_character_id then
    raise exception 'Goal not found';
  end if;

  if v_category = 'constitution' then
    v_pool := 'constitution';
  elsif v_category in ('intelligence', 'wisdom', 'charisma') then
    v_pool := 'mental';
  else
    raise exception 'Unknown goal category';
  end if;

  if exists (
    select 1 from public.attribute_point_ledger
    where source = 'goal' and source_id = p_goal_id
  ) then
    return jsonb_build_object('log_id', null, 'points_awarded', 0, 'pool', v_pool);
  end if;

  insert into public.goal_logs (goal_id, character_id, points_awarded)
  values (p_goal_id, p_character_id, 0)
  returning id into v_log_id;

  v_awarded := public.award_attribute_points(
    p_character_id,
    (select points_per_goal from public.progression_config()),
    'goal',
    v_pool,
    'Goal completed',
    p_goal_id
  );

  update public.goal_logs
  set points_awarded = v_awarded
  where id = v_log_id;

  return jsonb_build_object(
    'log_id', v_log_id,
    'points_awarded', v_awarded,
    'pool', v_pool
  );
end;
$$;

revoke all on function public.record_goal_completion(uuid, uuid) from public;
grant execute on function public.record_goal_completion(uuid, uuid) to authenticated;

-- ============================================================
-- STAFF
-- ============================================================

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.guild_memberships
    where user_id = auth.uid()
      and lower(role) in ('admin', 'curator', 'dm', 'captain')
  )
$$;

revoke all on function public.is_staff() from public;
grant execute on function public.is_staff() to authenticated;

-- Extra attribute points for a special achievement. Allowed past the
-- 27-point build. A reason is required. This does not remove points.
create or replace function public.grant_staff_attribute_points(
  p_character_id uuid,
  p_points int,
  p_pool text,
  p_reason text
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_found boolean;
begin
  if not public.is_staff() then
    raise exception 'Staff role required';
  end if;
  if p_points <= 0 then
    raise exception 'Points cannot be taken away';
  end if;
  if p_pool not in ('physical', 'constitution', 'mental') then
    raise exception 'Unknown point pool';
  end if;
  if p_reason is null or length(btrim(p_reason)) = 0 then
    raise exception 'A reason is required';
  end if;

  select true into v_found
  from public.characters
  where id = p_character_id
  for update;

  if not found then
    raise exception 'Character not found';
  end if;

  perform set_config('emc.progression_write', 'on', true);

  if p_pool = 'physical' then
    update public.characters
    set physical_points = physical_points + p_points
    where id = p_character_id;
  elsif p_pool = 'constitution' then
    update public.characters
    set constitution_points = constitution_points + p_points
    where id = p_character_id;
  else
    update public.characters
    set mental_points = mental_points + p_points
    where id = p_character_id;
  end if;

  insert into public.attribute_point_ledger (
    character_id, source, points_awarded, attribute_target, pool, reason
  ) values (
    p_character_id, 'staff', p_points, p_pool, p_pool, btrim(p_reason)
  );

  perform set_config('emc.progression_write', 'off', true);
  return p_points;
end;
$$;

revoke all on function public.grant_staff_attribute_points(uuid, integer, text, text) from public;
grant execute on function public.grant_staff_attribute_points(uuid, integer, text, text) to authenticated;

create or replace function public.set_cohort_start(p_start date)
returns date
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'Staff role required';
  end if;
  if p_start is null then
    raise exception 'Cohort start is required';
  end if;

  update public.program_settings
  set cohort_start = p_start
  where id = 1;

  return p_start;
end;
$$;

revoke all on function public.set_cohort_start(date) from public;
grant execute on function public.set_cohort_start(date) to authenticated;

-- Insert or replace one award window. Dates are inclusive Denver calendar
-- dates. A longer span is a three-parter. Leave a gap for an off-week.
create or replace function public.set_cohort_session(
  p_session_number int,
  p_start date,
  p_end date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'Staff role required';
  end if;
  if p_session_number is null or p_session_number < 1 then
    raise exception 'Session numbers start at 1';
  end if;
  if p_start is null or p_end is null then
    raise exception 'Session dates are required';
  end if;
  if p_end < p_start then
    raise exception 'Session end is before its start';
  end if;

  begin
    insert into public.cohort_sessions (session_number, start_date, end_date)
    values (p_session_number, p_start, p_end)
    on conflict (session_number) do update
      set start_date = excluded.start_date,
          end_date = excluded.end_date;
  exception
    when exclusion_violation then
      raise exception 'Session windows overlap';
  end;
end;
$$;

revoke all on function public.set_cohort_session(integer, date, date) from public;
grant execute on function public.set_cohort_session(integer, date, date) to authenticated;

create or replace function public.delete_cohort_session(p_session_number int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'Staff role required';
  end if;

  delete from public.cohort_sessions
  where session_number = p_session_number;

  if not found then
    raise exception 'Session not found';
  end if;
end;
$$;

revoke all on function public.delete_cohort_session(integer) from public;
grant execute on function public.delete_cohort_session(integer) to authenticated;

-- Removes the published schedule so awards use the 14-day cadence again.
create or replace function public.clear_cohort_sessions()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  if not public.is_staff() then
    raise exception 'Staff role required';
  end if;

  delete from public.cohort_sessions;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.clear_cohort_sessions() from public;
grant execute on function public.clear_cohort_sessions() to authenticated;

-- ============================================================
-- CHARACTER CREATION NO LONGER WRITES attribute_points
-- ============================================================

create or replace function public.create_character(
  p_name text,
  p_origin_word text,
  p_profession text,
  p_race text default null,
  p_strength int default 8,
  p_dexterity int default 8,
  p_constitution int default 8,
  p_intelligence int default 8,
  p_wisdom int default 8,
  p_charisma int default 8
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_character_id uuid;
  v_valid boolean := false;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if exists (select 1 from public.characters where user_id = v_user_id) then
    raise exception 'Character already exists';
  end if;

  if (p_strength, p_dexterity, p_constitution, p_intelligence, p_wisdom, p_charisma) in (
    (10,9,8,8,8,8), (9,10,8,8,8,8), (9,8,10,8,8,8), (9,8,8,10,8,8),
    (9,8,8,8,10,8), (9,8,8,8,8,10), (10,8,9,8,8,8), (10,8,8,9,8,8),
    (10,8,8,8,9,8), (10,8,8,8,8,9), (8,10,9,8,8,8), (8,10,8,9,8,8),
    (8,10,8,8,9,8), (8,10,8,8,8,9), (8,9,10,8,8,8), (8,9,8,10,8,8),
    (8,9,8,8,10,8), (8,9,8,8,8,10), (8,8,10,9,8,8), (8,8,10,8,9,8),
    (8,8,10,8,8,9), (8,8,9,10,8,8), (8,8,9,8,10,8), (8,8,9,8,8,10),
    (8,8,8,10,9,8), (8,8,8,10,8,9), (8,8,8,9,10,8), (8,8,8,9,8,10),
    (8,8,8,8,10,9), (8,8,8,8,9,10),
    (9,9,9,8,8,8), (9,9,8,9,8,8), (9,9,8,8,9,8), (9,9,8,8,8,9),
    (9,8,9,9,8,8), (9,8,9,8,9,8), (9,8,9,8,8,9), (9,8,8,9,9,8),
    (9,8,8,9,8,9), (9,8,8,8,9,9), (8,9,9,9,8,8), (8,9,9,8,9,8),
    (8,9,9,8,8,9), (8,9,8,9,9,8), (8,9,8,9,8,9), (8,9,8,8,9,9),
    (8,8,9,9,9,8), (8,8,9,9,8,9), (8,8,9,8,9,9), (8,8,8,9,9,9)
  ) then
    v_valid := true;
  end if;

  if not v_valid then
    raise exception 'Invalid starting array';
  end if;

  insert into public.characters (
    user_id, name, origin_word, profession, race,
    strength, dexterity, constitution, intelligence, wisdom, charisma,
    level, rank
  ) values (
    v_user_id, p_name, p_origin_word, p_profession, p_race,
    p_strength, p_dexterity, p_constitution, p_intelligence, p_wisdom, p_charisma,
    1, 'Recruit'
  )
  returning id into v_character_id;

  return v_character_id;
end;
$$;

-- ============================================================
-- MONTHLY GOAL PERIOD
-- ============================================================
-- Mental and Constitution awards will attach to a monthly goal later.
-- The client does not write these columns yet. A period, when set, is a
-- start and end inside one calendar month. Both empty is allowed so rows
-- created before that flow still fit.

alter table public.goals
  add column period_start date,
  add column period_end date;

alter table public.goals
  add constraint goals_monthly_period check (
    (period_start is null and period_end is null)
    or (
      period_start is not null
      and period_end is not null
      and period_end >= period_start
      and date_trunc('month', period_start::timestamp)::date
        = date_trunc('month', period_end::timestamp)::date
    )
  );

comment on column public.goals.period_start is
  'Inclusive start of this goal''s month. Must fall in the same calendar month as period_end. Mental and Constitution awards will attach here later.';
comment on column public.goals.period_end is
  'Inclusive end of this goal''s month. For a full calendar month, the last day of that month.';

create index idx_goals_character_period
  on public.goals (character_id, period_start);
