-- Staff commands: schedule, scoring numbers, squads, induction, roles.

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
  update public.scoring_config set cohort_start = p_start where id = 1;
  update public.adventures set start_date = p_start where number = 1;
  return p_start;
end;
$$;

create or replace function public.set_cohort_session(
  p_session_number int,
  p_start date,
  p_end date
) returns void
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
  if p_start is null or p_end is null or p_end < p_start then
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
  delete from public.cohort_sessions where session_number = p_session_number;
  if not found then
    raise exception 'Session not found';
  end if;
end;
$$;

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

create or replace function public.update_scoring_config(p_patch jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text;
  v_allowed text[] := array[
    'time_zone', 'cohort_start', 'backfill_days', 'goal_backfill_days',
    'points_per_prescribed_workout', 'points_per_custom_workout', 'points_per_lifting_session',
    'points_per_goal', 'exercise_points_per_session', 'goal_points_per_session',
    'session_length_days', 'first_adventure_sessions', 'point_buy_budget', 'point_buy_max',
    'squad_max_size', 'award_requires_approval', 'log_visibility', 'share_lifting_default',
    'veteran_tier_start_week', 'induction_week'
  ];
begin
  if not public.is_staff() then
    raise exception 'Staff role required';
  end if;
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'Config patch must be an object';
  end if;

  for v_key in select jsonb_object_keys(p_patch) loop
    if not (v_key = any (v_allowed)) then
      raise exception 'Unknown config key %', v_key;
    end if;
  end loop;

  update public.scoring_config
  set
    time_zone = case when p_patch ? 'time_zone' then p_patch->>'time_zone' else time_zone end,
    cohort_start = case when p_patch ? 'cohort_start' then (p_patch->>'cohort_start')::date else cohort_start end,
    backfill_days = case when p_patch ? 'backfill_days' then (p_patch->>'backfill_days')::int else backfill_days end,
    goal_backfill_days = case when p_patch ? 'goal_backfill_days' then (p_patch->>'goal_backfill_days')::int else goal_backfill_days end,
    points_per_prescribed_workout = case when p_patch ? 'points_per_prescribed_workout' then (p_patch->>'points_per_prescribed_workout')::int else points_per_prescribed_workout end,
    points_per_custom_workout = case when p_patch ? 'points_per_custom_workout' then (p_patch->>'points_per_custom_workout')::int else points_per_custom_workout end,
    points_per_lifting_session = case when p_patch ? 'points_per_lifting_session' then (p_patch->>'points_per_lifting_session')::int else points_per_lifting_session end,
    points_per_goal = case when p_patch ? 'points_per_goal' then (p_patch->>'points_per_goal')::int else points_per_goal end,
    exercise_points_per_session = case when p_patch ? 'exercise_points_per_session' then (p_patch->>'exercise_points_per_session')::int else exercise_points_per_session end,
    goal_points_per_session = case when p_patch ? 'goal_points_per_session' then (p_patch->>'goal_points_per_session')::int else goal_points_per_session end,
    session_length_days = case when p_patch ? 'session_length_days' then (p_patch->>'session_length_days')::int else session_length_days end,
    first_adventure_sessions = case when p_patch ? 'first_adventure_sessions' then (p_patch->>'first_adventure_sessions')::int else first_adventure_sessions end,
    point_buy_budget = case when p_patch ? 'point_buy_budget' then (p_patch->>'point_buy_budget')::int else point_buy_budget end,
    point_buy_max = case when p_patch ? 'point_buy_max' then (p_patch->>'point_buy_max')::int else point_buy_max end,
    squad_max_size = case when p_patch ? 'squad_max_size' then (p_patch->>'squad_max_size')::int else squad_max_size end,
    award_requires_approval = case when p_patch ? 'award_requires_approval' then (p_patch->>'award_requires_approval')::boolean else award_requires_approval end,
    log_visibility = case when p_patch ? 'log_visibility' then p_patch->>'log_visibility' else log_visibility end,
    share_lifting_default = case when p_patch ? 'share_lifting_default' then (p_patch->>'share_lifting_default')::boolean else share_lifting_default end,
    veteran_tier_start_week = case
      when p_patch ? 'veteran_tier_start_week' and nullif(p_patch->>'veteran_tier_start_week', '') is null then null
      when p_patch ? 'veteran_tier_start_week' then (p_patch->>'veteran_tier_start_week')::int
      else veteran_tier_start_week
    end,
    induction_week = case when p_patch ? 'induction_week' then (p_patch->>'induction_week')::int else induction_week end
  where id = 1;

  if p_patch ? 'cohort_start' then
    update public.adventures set start_date = (p_patch->>'cohort_start')::date where number = 1;
  end if;

  return (select to_jsonb(s) from public.scoring_config s where id = 1);
end;
$$;

create or replace function public.create_squad(p_name text, p_max int default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guild uuid;
  v_cap int;
  v_max int;
  v_id uuid;
begin
  if not (public.is_dm() or public.is_admin()) then
    raise exception 'A DM or admin creates squads';
  end if;
  if p_name is null or length(btrim(p_name)) = 0 then
    raise exception 'Squad name is required';
  end if;
  select guild_id into v_guild
  from public.guild_memberships
  where user_id = auth.uid()
  limit 1;
  if v_guild is null then
    raise exception 'Not your company';
  end if;
  select squad_max_size into v_cap from public.scoring_config where id = 1;
  v_max := coalesce(p_max, v_cap);
  if v_max < 1 or v_max > v_cap then
    raise exception 'Squad size cannot pass the company cap';
  end if;
  insert into public.squads (guild_id, name, max_size)
  values (v_guild, btrim(p_name), v_max)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.assign_squad(p_character_id uuid, p_squad_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guild uuid;
  v_squad_guild uuid;
begin
  if not (public.is_dm() or public.is_admin()) then
    raise exception 'A DM or admin assigns squads';
  end if;
  select guild_id into v_guild from public.characters where id = p_character_id for update;
  if not found then
    raise exception 'Character not found';
  end if;
  if not public.is_member(v_guild) then
    raise exception 'Not your company';
  end if;
  if p_squad_id is not null then
    select guild_id into v_squad_guild from public.squads where id = p_squad_id;
    if v_squad_guild is distinct from v_guild then
      raise exception 'That squad is in another company';
    end if;
  end if;
  perform set_config('emc.staff_write', 'on', true);
  update public.characters set squad_id = p_squad_id where id = p_character_id;
  perform set_config('emc.staff_write', 'off', true);
end;
$$;

create or replace function public.post_squad_challenge(
  p_squad_id uuid,
  p_title text,
  p_description text,
  p_objectives jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guild uuid;
  v_mission uuid;
  v_item jsonb;
begin
  if not (public.is_dm() or public.is_admin()) then
    raise exception 'A DM or admin posts a squad challenge';
  end if;
  if p_title is null or length(btrim(p_title)) = 0 then
    raise exception 'Title is required';
  end if;
  if p_squad_id is null then
    select guild_id into v_guild from public.guild_memberships where user_id = auth.uid() limit 1;
  else
    select guild_id into v_guild from public.squads where id = p_squad_id;
  end if;
  if v_guild is null or not public.is_member(v_guild) then
    raise exception 'Not your company';
  end if;

  insert into public.missions (guild_id, squad_id, title, description, type, status, created_by)
  values (v_guild, p_squad_id, btrim(p_title), nullif(p_description, ''), 'barracks', 'active', auth.uid())
  returning id into v_mission;

  if p_objectives is not null and jsonb_typeof(p_objectives) = 'array' then
    for v_item in select * from jsonb_array_elements(p_objectives) loop
      insert into public.objectives (mission_id, title, target_value, unit)
      values (
        v_mission,
        coalesce(nullif(v_item->>'title', ''), 'Objective'),
        nullif(v_item->>'target_value', '')::int,
        nullif(v_item->>'unit', '')
      );
    end loop;
  end if;
  return v_mission;
end;
$$;

create or replace function public.induct_character(p_character_id uuid, p_class text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guild uuid;
begin
  if not public.is_dm() then
    raise exception 'Only the DM records induction';
  end if;
  select guild_id into v_guild from public.characters where id = p_character_id for update;
  if not found or not public.is_member(v_guild) then
    raise exception 'Character not found';
  end if;
  if p_class is not null and length(btrim(p_class)) > 0 then
    if not exists (
      select 1 from public.induction_classes
      where id = p_class and enabled
    ) then
      raise exception 'That class is not open';
    end if;
  else
    p_class := null;
  end if;
  perform set_config('emc.staff_write', 'on', true);
  update public.characters
  set inducted_at = coalesce(inducted_at, now()),
      class = p_class
  where id = p_character_id;
  perform set_config('emc.staff_write', 'off', true);
end;
$$;

create or replace function public.set_character_level(p_character_id uuid, p_level int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guild uuid;
begin
  if not public.is_dm() then
    raise exception 'Only the DM sets level';
  end if;
  if p_level is null or p_level < 1 or p_level > 20 then
    raise exception 'Level must be between 1 and 20';
  end if;
  select guild_id into v_guild from public.characters where id = p_character_id for update;
  if not found or not public.is_member(v_guild) then
    raise exception 'Character not found';
  end if;
  perform set_config('emc.staff_write', 'on', true);
  update public.characters set level = p_level where id = p_character_id;
  perform set_config('emc.staff_write', 'off', true);
end;
$$;

create or replace function public.set_character_rank(p_character_id uuid, p_rank text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guild uuid;
  v_user uuid;
  v_name text;
begin
  if not public.is_dm() then
    raise exception 'Only the DM sets rank';
  end if;
  select name into v_name from public.rank_catalog where id = p_rank or name = p_rank;
  if v_name is null then
    raise exception 'Unknown rank';
  end if;
  select guild_id, user_id into v_guild, v_user
  from public.characters where id = p_character_id for update;
  if not found or not public.is_member(v_guild) then
    raise exception 'Character not found';
  end if;
  perform set_config('emc.staff_write', 'on', true);
  update public.characters set rank = v_name where id = p_character_id;
  update public.guild_memberships set rank = v_name where user_id = v_user and guild_id = v_guild;
  perform set_config('emc.staff_write', 'off', true);
end;
$$;

create or replace function public.set_app_role(p_user_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current text;
  v_dm_count int;
begin
  if not public.is_dm() then
    raise exception 'Only the DM assigns roles';
  end if;
  if p_role not in ('player', 'dm', 'admin', 'curator') then
    raise exception 'Unknown role';
  end if;
  select app_role into v_current from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'Profile not found';
  end if;
  if not exists (
    select 1 from public.guild_memberships mine
    join public.guild_memberships theirs on theirs.guild_id = mine.guild_id
    where mine.user_id = auth.uid() and theirs.user_id = p_user_id
  ) then
    raise exception 'Not your company';
  end if;
  if v_current = 'dm' and p_role <> 'dm' then
    select count(*) into v_dm_count from public.profiles where app_role = 'dm';
    if v_dm_count <= 1 then
      raise exception 'The company keeps one DM';
    end if;
  end if;
  perform set_config('emc.profile_admin', 'on', true);
  update public.profiles set app_role = p_role where id = p_user_id;
  perform set_config('emc.profile_admin', 'off', true);
end;
$$;
