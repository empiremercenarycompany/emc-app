-- Not applied. Replaces the two writers that still set adventures.number = 1.
-- The cohort adventure is the lowest number in each guild that is upcoming or active
-- and already has a start_date. Adventure 2 is active with a null start, so Adventure 3
-- is the row today. Closed rows are left alone.

create or replace function public.set_cohort_adventure_start(p_start date)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_start is null then
    raise exception 'Cohort start is required';
  end if;
  update public.adventures as adventure
  set start_date = p_start
  where adventure.id in (
    select distinct on (guild_id) id
    from public.adventures
    where status in ('upcoming', 'active')
      and start_date is not null
    order by guild_id, number
  );
end;
$$;

revoke all on function public.set_cohort_adventure_start(date) from public, anon, authenticated;

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
  perform public.set_cohort_adventure_start(p_start);
  return p_start;
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
    'veteran_tier_start_week', 'induction_week',
    'attendance_loot', 'group_goal_payout', 'level_two_week', 'level_three_week',
    'level_four_steps_required'
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
    induction_week = case when p_patch ? 'induction_week' then (p_patch->>'induction_week')::int else induction_week end,
    attendance_loot = case when p_patch ? 'attendance_loot' then p_patch->>'attendance_loot' else attendance_loot end,
    group_goal_payout = case when p_patch ? 'group_goal_payout' then p_patch->>'group_goal_payout' else group_goal_payout end,
    level_two_week = case when p_patch ? 'level_two_week' then (p_patch->>'level_two_week')::int else level_two_week end,
    level_three_week = case when p_patch ? 'level_three_week' then (p_patch->>'level_three_week')::int else level_three_week end,
    level_four_steps_required = case when p_patch ? 'level_four_steps_required' then (p_patch->>'level_four_steps_required')::int else level_four_steps_required end
  where id = 1;

  if p_patch ? 'cohort_start' then
    perform public.set_cohort_adventure_start((p_patch->>'cohort_start')::date);
  end if;

  return (select to_jsonb(s) from public.scoring_config s where id = 1);
end;
$$;
