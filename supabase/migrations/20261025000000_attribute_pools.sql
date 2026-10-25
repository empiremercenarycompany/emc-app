-- Split the single attribute_points pool into three source pools.
--
-- Physical (STR/DEX) comes from workouts.
-- Constitution comes from nutrition and sleep.
-- Mental (INT/WIS/CHA) comes from SMART goals.
--
-- Scores and pool balances can change only through spend_attribute_points
-- and award_attribute_points. Direct updates of those columns are rejected.
--
-- Workout award numbers are placeholders for John. They live in
-- workout_award_config() and must match WorkoutAwardRule in
-- lib/core/utils/workout_awards.dart:
--   1 Physical point per awarded log.
--   5 awarded logs per week. The week is Monday–Sunday in America/Denver.
--   The 3rd awarded log of that week also earns 1 bonus point.
--   A log dated within the previous 14 Denver calendar days still earns points.
--   Older logs are saved and earn 0. Future dates are rejected.
--   The award uses the week of the workout's date, not the week it was entered.
--   The same log id cannot be awarded twice. Two logs on one date both count.
--   Once that week's cap is full, later logs for that week earn 0.
--   A full cap never reduces points already given.
--   The week id is the Monday of the workout's Denver calendar date.
--   The zone name is config, so another gym can switch zones without new rules.

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

comment on column public.characters.physical_points is 'Unspent Physical points. Workouts earn them. Strength and Dexterity spend them.';
comment on column public.characters.constitution_points is 'Unspent Constitution points. Nutrition and sleep earn them. Constitution spends them.';
comment on column public.characters.mental_points is 'Unspent Mental points. SMART goals earn them. Intelligence, Wisdom, and Charisma spend them.';

-- ============================================================
-- LEDGER
-- ============================================================

alter table public.attribute_point_ledger
  add column pool text,
  add column award_week date;

comment on column public.attribute_point_ledger.award_week is
  'Monday (UTC calendar) of the ISO week a workout award belongs to. Null for sources that are not weekly.';

alter table public.attribute_point_ledger
  add constraint attribute_point_ledger_pool_check
    check (pool is null or pool in ('physical', 'constitution', 'mental')),
  add constraint attribute_point_ledger_points_nonnegative
    check (points_awarded >= 0);

-- One award per source row (a workout log, a goal, and so on).
create unique index attribute_point_ledger_source_once
  on public.attribute_point_ledger (source, source_id)
  where source_id is not null;

-- Supports the weekly cap count. The cap itself is enforced in
-- award_attribute_points, because it is a count rather than a single row.
create index attribute_point_ledger_workout_week
  on public.attribute_point_ledger (character_id, award_week)
  where source = 'workout' and points_awarded > 0;

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
-- WORKOUT AWARD CONFIG AND WEEK BOUNDARY
-- ============================================================

-- Placeholders for John. Keep every column aligned with WorkoutAwardRule.
create or replace function public.workout_award_config()
returns table (
  points_per_log int,
  weekly_cap int,
  weekly_target int,
  weekly_target_bonus int,
  time_zone text,
  backfill_days int
)
language sql
immutable
as $$
  select 1, 5, 3, 1, 'America/Denver'::text, 14
$$;

comment on function public.workout_award_config() is
  'Placeholder workout award config. points_per_log, weekly_cap (awarded logs), weekly_target, weekly_target_bonus, time_zone (IANA), backfill_days. Mirror of WorkoutAwardRule.';

revoke all on function public.workout_award_config() from public;
grant execute on function public.workout_award_config() to authenticated;

-- Monday of the civil week for a company-zone calendar date.
-- The date is already a calendar day in the configured zone, so this
-- truncation does not depend on the session TimeZone. DST does not move
-- the Monday: the week is seven calendar dates, not 168 hours.
create or replace function public.workout_week_start(p_day date)
returns date
language sql
immutable
strict
as $$
  select date_trunc('week', p_day::timestamp)::date
$$;

comment on function public.workout_week_start(date) is
  'Monday of the week containing p_day. p_day is a calendar date in the company time zone.';

revoke all on function public.workout_week_start(date) from public;
grant execute on function public.workout_week_start(date) to authenticated;

-- Calendar date of an instant in the configured zone. DST-aware.
-- Matches WorkoutAwardRule.calendarDate for the same IANA name.
create or replace function public.company_calendar_date(p_at timestamptz)
returns date
language sql
stable
strict
as $$
  select (timezone(
    (select time_zone from public.workout_award_config()),
    p_at
  ))::date
$$;

comment on function public.company_calendar_date(timestamptz) is
  'Calendar date of an instant in workout_award_config().time_zone.';

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
  v_log_date date;
  v_log_character uuid;
  v_awarded_this_week int;
  v_award int;
  v_week date;
  v_points_per_log int;
  v_weekly_cap int;
  v_weekly_target int;
  v_weekly_bonus int;
  v_zone text;
  v_backfill int;
  v_today date;
begin
  if p_points < 0 then
    raise exception 'Points cannot be taken away';
  end if;

  if p_pool not in ('physical', 'constitution', 'mental') then
    raise exception 'Unknown point pool';
  end if;

  if p_source = 'workout' and p_pool <> 'physical' then
    raise exception 'Workouts award Physical points';
  elsif p_source in ('nutrition', 'sleep') and p_pool <> 'constitution' then
    raise exception 'Nutrition and sleep award Constitution points';
  elsif p_source = 'goal' and p_pool <> 'mental' then
    raise exception 'SMART goals award Mental points';
  elsif p_source not in ('workout', 'nutrition', 'sleep', 'goal') then
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

  if p_source = 'workout' then
    if p_source_id is null then
      raise exception 'Workout awards require a log id';
    end if;
    select points_per_log, weekly_cap, weekly_target, weekly_target_bonus,
           time_zone, backfill_days
      into v_points_per_log, v_weekly_cap, v_weekly_target, v_weekly_bonus,
           v_zone, v_backfill
    from public.workout_award_config();

    if v_points_per_log < 1
       or v_weekly_cap < 1
       or v_weekly_target < 1
       or v_weekly_target > v_weekly_cap
       or v_weekly_bonus < 0
       or v_backfill < 0
       or v_zone is null
       or length(btrim(v_zone)) = 0
    then
      raise exception 'Workout award config is invalid';
    end if;

    if p_points <> v_points_per_log then
      raise exception 'A workout award must use the configured points per log';
    end if;

    select character_id, date into v_log_character, v_log_date
    from public.workout_logs
    where id = p_source_id
    for update;

    if not found or v_log_character <> p_character_id then
      raise exception 'Workout log not found';
    end if;

    v_today := public.company_today();

    if v_log_date > v_today then
      raise exception 'Future workout dates are rejected';
    end if;

    -- Outside the backfill window the log stays in the journal and earns 0.
    -- Points already granted to other logs are left alone.
    if v_log_date < v_today - v_backfill then
      update public.workout_logs
      set points_awarded = 0
      where id = p_source_id;
      return 0;
    end if;

    v_week := public.workout_week_start(v_log_date);

    select count(*) into v_awarded_this_week
    from public.attribute_point_ledger
    where character_id = p_character_id
      and source = 'workout'
      and points_awarded > 0
      and award_week = v_week;

    if v_awarded_this_week >= v_weekly_cap then
      update public.workout_logs
      set points_awarded = 0
      where id = p_source_id;
      return 0;
    end if;

    v_award := v_points_per_log;
    if v_awarded_this_week + 1 = v_weekly_target then
      v_award := v_award + v_weekly_bonus;
    end if;
  else
    if p_points = 0 then
      return 0;
    end if;
    v_award := p_points;
    v_log_date := null;
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
    character_id, source, source_id, points_awarded, attribute_target, pool, award_week, reason
  ) values (
    p_character_id, p_source, p_source_id, v_award, p_pool, p_pool,
    case when p_source = 'workout' then v_week else null end,
    p_reason
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
    (select points_per_log from public.workout_award_config()),
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
