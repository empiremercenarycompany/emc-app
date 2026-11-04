-- Not applied. Future awards only. Existing ledger rows and banks are not updated.
-- Numbers match src/lib/pacing-config.ts: week cap 2, pool cap 1, session grant 1.
-- From week 8, a total below floor(27 * week / 16) raises the week cap to 3 and the pool cap to 2.
-- Attendance stays outside those caps. Intelligence and Wisdom goals still require CMART before a log is stored.

create or replace function public.award_attribute_points(
  p_character_id uuid,
  p_source text,
  p_source_id uuid,
  p_event_date date,
  p_reason text
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cfg public.scoring_config%rowtype;
  v_today date;
  v_pool text;
  v_unit int;
  v_exempt boolean := false;
  v_week_start date;
  v_week_num int := 0;
  v_week_used int := 0;
  v_pool_used int := 0;
  v_awarded_total int := 0;
  v_award int := 0;
  v_weekly_cap int := 2;
  v_pool_cap int := 1;
  v_log_character uuid;
  v_bank text;
  v_category text;
  v_goal_character uuid;
  v_completed date;
  v_bonus uuid;
begin
  if current_setting('emc.internal_award', true) is distinct from 'on' then
    raise exception 'Point awards are made by company functions';
  end if;
  if p_source not in ('workout', 'goal', 'attendance') then
    raise exception 'Unknown point source';
  end if;

  select * into v_cfg from public.scoring_config where id = 1;
  if v_cfg.id is null or v_cfg.cohort_start is null then
    raise exception 'Progression config is invalid';
  end if;

  perform 1 from public.characters where id = p_character_id for update;
  if not found then
    raise exception 'Character not found';
  end if;

  if p_source_id is not null and exists (
    select 1 from public.attribute_point_ledger
    where source = p_source and source_id = p_source_id and points_awarded > 0
  ) then
    return 0;
  end if;

  v_today := public.company_today();

  if p_source = 'workout' then
    select character_id, bank_pool into v_log_character, v_bank
    from public.workout_logs where id = p_source_id for update;
    if not found or v_log_character <> p_character_id then
      raise exception 'Workout log not found';
    end if;
    v_pool := case when v_bank = 'constitution' then 'constitution' else 'physical' end;
    v_unit := v_cfg.points_per_prescribed_workout;
    if p_event_date > v_today then
      raise exception 'Future workout dates are rejected';
    end if;
    if p_event_date < v_today - v_cfg.backfill_days then
      update public.workout_logs set points_awarded = 0, status = 'none' where id = p_source_id;
      return 0;
    end if;
  elsif p_source = 'goal' then
    select g.character_id, g.category, gl.completed_on
      into v_goal_character, v_category, v_completed
    from public.goal_logs gl
    join public.goals g on g.id = gl.goal_id
    where gl.id = p_source_id
    for update of gl;
    if not found or v_goal_character <> p_character_id then
      raise exception 'Goal log not found';
    end if;
    v_pool := case v_category
      when 'constitution' then 'constitution'
      when 'charisma' then 'social'
      else 'mental'
    end;
    v_unit := v_cfg.points_per_goal;
    p_event_date := v_completed;
    if p_event_date > v_today then
      raise exception 'Future workout dates are rejected';
    end if;
    if p_event_date < v_today - v_cfg.goal_backfill_days then
      update public.goal_logs set points_awarded = 0, status = 'none' where id = p_source_id;
      return 0;
    end if;
  else
    v_pool := 'free';
    v_unit := 1;
    v_exempt := true;
  end if;

  if p_event_date < v_cfg.cohort_start then
    v_week_start := v_cfg.cohort_start;
    v_week_num := 0;
  else
    v_week_num := ((p_event_date - v_cfg.cohort_start) / 7) + 1;
    v_week_start := v_cfg.cohort_start + ((v_week_num - 1) * 7);
  end if;

  select coalesce(sum(points_awarded), 0)::int into v_awarded_total
  from public.attribute_point_ledger
  where character_id = p_character_id and points_awarded > 0;

  if v_awarded_total >= v_cfg.point_buy_budget then
    select id into v_bonus
    from public.post_cap_bonuses
    where enabled
      and (pool = v_pool or pool = 'any')
      and (v_pool <> 'constitution' or con_tied or pool = 'constitution')
    order by case when pool = v_pool then 0 else 1 end, name
    limit 1;
    if v_bonus is not null and p_source_id is not null and not exists (
      select 1 from public.character_bonuses where source = p_source and source_id = p_source_id
    ) then
      insert into public.character_bonuses (character_id, bonus_id, source, source_id)
      values (p_character_id, v_bonus, p_source, p_source_id);
      perform public.write_award_audit(p_character_id, 'bonus', v_pool, 0, p_reason);
    end if;
    perform set_config('emc.progression_write', 'on', true);
    if p_source = 'workout' then
      update public.workout_logs set points_awarded = 0, status = 'bonus' where id = p_source_id;
    elsif p_source = 'goal' then
      update public.goal_logs set points_awarded = 0, status = 'bonus' where id = p_source_id;
    elsif p_source = 'attendance' then
      update public.session_attendance set award_status = 'bonus' where id = p_source_id;
    end if;
    perform set_config('emc.progression_write', 'off', true);
    return 0;
  end if;

  if v_week_num >= 8 and v_awarded_total < floor(27 * v_week_num / 16.0)::int then
    v_weekly_cap := 3;
    v_pool_cap := 2;
  end if;
  if not v_exempt then
    select coalesce(sum(points_awarded), 0)::int into v_week_used
    from public.attribute_point_ledger
    where character_id = p_character_id
      and points_awarded > 0
      and source in ('workout', 'goal')
      and week_start = v_week_start;
    select coalesce(sum(points_awarded), 0)::int into v_pool_used
    from public.attribute_point_ledger
    where character_id = p_character_id
      and points_awarded > 0
      and source in ('workout', 'goal')
      and pool = v_pool
      and week_start = v_week_start;
    v_award := least(v_unit, v_weekly_cap - v_week_used, v_pool_cap - v_pool_used, v_cfg.point_buy_budget - v_awarded_total);
  else
    v_award := least(v_unit, v_cfg.point_buy_budget - v_awarded_total);
  end if;

  if v_award is null or v_award <= 0 then
    perform set_config('emc.progression_write', 'on', true);
    if p_source = 'workout' then
      update public.workout_logs set points_awarded = 0, status = 'none' where id = p_source_id;
    elsif p_source = 'goal' then
      update public.goal_logs set points_awarded = 0, status = 'none' where id = p_source_id;
    else
      update public.session_attendance set award_status = 'none' where id = p_source_id;
    end if;
    perform set_config('emc.progression_write', 'off', true);
    return 0;
  end if;

  perform set_config('emc.progression_write', 'on', true);
  if v_pool = 'physical' then
    update public.characters set physical_points = physical_points + v_award where id = p_character_id;
  elsif v_pool = 'constitution' then
    update public.characters set constitution_points = constitution_points + v_award where id = p_character_id;
  elsif v_pool = 'mental' then
    update public.characters set mental_points = mental_points + v_award where id = p_character_id;
  elsif v_pool = 'social' then
    update public.characters set social_points = social_points + v_award where id = p_character_id;
  else
    update public.characters set free_points = free_points + v_award where id = p_character_id;
  end if;

  insert into public.attribute_point_ledger (
    character_id, source, source_id, points_awarded, attribute_target, pool, reason, status, week_start, session_start
  ) values (
    p_character_id, p_source, p_source_id, v_award, v_pool, v_pool, p_reason, 'awarded', v_week_start, v_week_start
  );

  if p_source = 'workout' then
    update public.workout_logs set points_awarded = v_award, status = 'awarded' where id = p_source_id;
  elsif p_source = 'goal' then
    update public.goal_logs set points_awarded = v_award, status = 'awarded' where id = p_source_id;
  else
    update public.session_attendance set award_status = 'awarded' where id = p_source_id;
  end if;
  perform public.write_award_audit(p_character_id, p_source, v_pool, v_award, p_reason);
  perform set_config('emc.progression_write', 'off', true);
  return v_award;
end;
$$;
