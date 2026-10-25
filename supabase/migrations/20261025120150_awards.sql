-- Awards, spending, logging, and staff commands.

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
  v_session_number int;
  v_session_start date;
  v_used int;
  v_budget int;
  v_unit int;
  v_cap int;
  v_award int;
  v_pool text;
  v_track text;
  v_log_character uuid;
  v_category text;
  v_goal_character uuid;
  v_completed date;
begin
  if current_setting('emc.internal_award', true) is distinct from 'on' then
    raise exception 'Point awards are made by company functions';
  end if;
  if p_source not in ('workout', 'goal') then
    raise exception 'Unknown point source';
  end if;

  select * into v_cfg from public.scoring_config where id = 1;
  if v_cfg.id is null or v_cfg.cohort_start is null or length(btrim(v_cfg.time_zone)) = 0 then
    raise exception 'Progression config is invalid';
  end if;

  perform 1 from public.characters where id = p_character_id for update;
  if not found then
    raise exception 'Character not found';
  end if;

  if p_source_id is not null and exists (
    select 1 from public.attribute_point_ledger
    where source = p_source and source_id = p_source_id
  ) then
    return 0;
  end if;

  v_today := public.company_today();

  if p_source = 'workout' then
    select character_id, award_track
      into v_log_character, v_track
    from public.workout_logs
    where id = p_source_id
    for update;
    if not found or v_log_character <> p_character_id then
      raise exception 'Workout log not found';
    end if;
    v_pool := 'physical';
    v_unit := case v_track
      when 'custom' then v_cfg.points_per_custom_workout
      when 'lifting' then v_cfg.points_per_lifting_session
      else v_cfg.points_per_prescribed_workout
    end;
    v_cap := v_cfg.exercise_points_per_session;
    if p_event_date > v_today then
      raise exception 'Future workout dates are rejected';
    end if;
    if p_event_date < v_today - v_cfg.backfill_days then
      update public.workout_logs set points_awarded = 0, status = 'none' where id = p_source_id;
      return 0;
    end if;
  else
    select g.character_id, g.category, gl.completed_on
      into v_goal_character, v_category, v_completed
    from public.goal_logs gl
    join public.goals g on g.id = gl.goal_id
    where gl.id = p_source_id
    for update of gl;
    if not found or v_goal_character <> p_character_id then
      raise exception 'Goal log not found';
    end if;
    if v_category = 'constitution' then
      v_pool := 'constitution';
    elsif v_category in ('intelligence', 'wisdom', 'charisma') then
      v_pool := 'mental';
    else
      raise exception 'Unknown goal category';
    end if;
    v_unit := v_cfg.points_per_goal;
    v_cap := v_cfg.goal_points_per_session;
    p_event_date := v_completed;
    if p_event_date > v_today then
      raise exception 'Future workout dates are rejected';
    end if;
    if p_event_date < v_today - v_cfg.goal_backfill_days then
      update public.goal_logs set points_awarded = 0, status = 'none' where id = p_source_id;
      return 0;
    end if;
  end if;

  select s.session_number, s.start_date
    into v_session_number, v_session_start
  from public.adventure_session(p_event_date) s;

  if v_session_number is null
     or v_session_number < 1
     or v_session_number > v_cfg.first_adventure_sessions
  then
    if p_source = 'workout' then
      update public.workout_logs set points_awarded = 0, status = 'none' where id = p_source_id;
    else
      update public.goal_logs set points_awarded = 0, status = 'none' where id = p_source_id;
    end if;
    return 0;
  end if;

  if p_source = 'workout' then
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
      and source = 'goal'
      and points_awarded > 0
      and session_start = v_session_start;
  end if;

  if exists (
    select 1 from public.characters c
    where c.id = p_character_id
      and (
        public.point_buy_cost(c.strength) is null
        or public.point_buy_cost(c.dexterity) is null
        or public.point_buy_cost(c.constitution) is null
        or public.point_buy_cost(c.intelligence) is null
        or public.point_buy_cost(c.wisdom) is null
        or public.point_buy_cost(c.charisma) is null
      )
  ) then
    raise exception 'Scores must stay on the point-buy table';
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

  v_award := least(v_unit, v_cap - v_used, v_cfg.point_buy_budget - v_budget);
  if v_award is null or v_award <= 0 then
    if p_source = 'workout' then
      update public.workout_logs set points_awarded = 0, status = 'none' where id = p_source_id;
    else
      update public.goal_logs set points_awarded = 0, status = 'none' where id = p_source_id;
    end if;
    return 0;
  end if;

  perform set_config('emc.progression_write', 'on', true);

  if v_pool = 'physical' then
    update public.characters
    set physical_points = physical_points + v_award
    where id = p_character_id;
  elsif v_pool = 'constitution' then
    update public.characters
    set constitution_points = constitution_points + v_award
    where id = p_character_id;
  else
    update public.characters
    set mental_points = mental_points + v_award
    where id = p_character_id;
  end if;

  insert into public.attribute_point_ledger (
    character_id, source, source_id, points_awarded, attribute_target, pool, reason, status, session_start
  ) values (
    p_character_id, p_source, p_source_id, v_award, v_pool, v_pool, p_reason, 'awarded', v_session_start
  );

  if p_source = 'workout' then
    update public.workout_logs
    set points_awarded = v_award, status = 'awarded'
    where id = p_source_id;
  else
    update public.goal_logs
    set points_awarded = v_award, status = 'awarded'
    where id = p_source_id;
  end if;

  perform set_config('emc.progression_write', 'off', true);
  return v_award;
end;
$$;

create or replace function public.log_objective_progress(
  p_objective_id uuid,
  p_amount int,
  p_note text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_character_id uuid;
  v_squad uuid;
  v_mission_squad uuid;
  v_mission_guild uuid;
  v_assigned uuid;
  v_target int;
  v_current int;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;
  if p_amount is null or p_amount < 1 or p_amount > 1000 then
    raise exception 'Progress amount must be between 1 and 1000';
  end if;

  select c.id, c.squad_id into v_character_id, v_squad
  from public.characters c
  where c.user_id = v_user;

  if v_character_id is null then
    raise exception 'Create a character first';
  end if;

  select m.squad_id, m.guild_id, o.assigned_to, o.target_value, o.current_value
    into v_mission_squad, v_mission_guild, v_assigned, v_target, v_current
  from public.objectives o
  join public.missions m on m.id = o.mission_id
  where o.id = p_objective_id
  for update of o;

  if not found then
    raise exception 'Objective not found';
  end if;
  if not public.is_member(v_mission_guild) then
    raise exception 'Not your company';
  end if;
  if v_assigned is not null and v_assigned <> v_character_id then
    raise exception 'That objective is assigned to someone else';
  end if;
  if v_mission_squad is not null and v_squad is distinct from v_mission_squad then
    raise exception 'That challenge is for another squad';
  end if;

  perform set_config('emc.progression_write', 'on', true);
  update public.objectives
  set current_value = current_value + p_amount,
      is_complete = case
        when target_value is not null and current_value + p_amount >= target_value then true
        else is_complete
      end
  where id = p_objective_id
  returning current_value, target_value into v_current, v_target;
  perform set_config('emc.progression_write', 'off', true);

  return jsonb_build_object(
    'objective_id', p_objective_id,
    'current_value', v_current,
    'target_value', v_target,
    'note', p_note
  );
end;
$$;

create or replace function public.log_activity(p_kind text, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_character_id uuid;
  v_owner uuid;
  v_guild uuid;
  v_inducted timestamptz;
  v_log_id uuid;
  v_existing_points int;
  v_existing_status text;
  v_date date;
  v_today date;
  v_awarded int := 0;
  v_pool text;
  v_status text := 'none';
  v_library uuid;
  v_equipment text;
  v_tier text;
  v_published boolean;
  v_attribute text;
  v_title text;
  v_library_guild uuid;
  v_char_tier text;
  v_vet_week int;
  v_week int;
  v_approve boolean;
  v_client uuid;
  v_goal_id uuid;
  v_goal_character uuid;
  v_category text;
  v_session_id uuid;
  v_session_guild uuid;
  v_objective jsonb;
  v_impact jsonb;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;
  if p_payload is null then
    p_payload := '{}'::jsonb;
  end if;
  if p_kind not in ('workout', 'goal', 'checkin') then
    raise exception 'Unknown activity';
  end if;

  if nullif(p_payload->>'character_id', '') is null then
    select id, guild_id, inducted_at
      into v_character_id, v_guild, v_inducted
    from public.characters
    where user_id = v_user;
  else
    v_character_id := (p_payload->>'character_id')::uuid;
    select user_id, guild_id, inducted_at
      into v_owner, v_guild, v_inducted
    from public.characters
    where id = v_character_id;
    if v_owner is distinct from v_user then
      raise exception 'Not your character';
    end if;
  end if;

  if v_character_id is null then
    raise exception 'Create a character first';
  end if;

  v_today := public.company_today();
  select award_requires_approval into v_approve from public.scoring_config where id = 1;

  if p_kind = 'checkin' then
    v_session_id := (p_payload->>'session_id')::uuid;
    select guild_id into v_session_guild from public.sessions where id = v_session_id;
    if v_session_guild is null then
      raise exception 'Session not found';
    end if;
    if v_session_guild is distinct from v_guild then
      raise exception 'That session is not for your company';
    end if;
    begin
      insert into public.session_attendance (session_id, character_id)
      values (v_session_id, v_character_id);
    exception
      when unique_violation then
        v_status := 'none';
    end;
    v_impact := public.character_impact(v_character_id);
    return v_impact || jsonb_build_object(
      'kind', 'checkin',
      'log_id', v_session_id,
      'points_delta', 0,
      'pool', null,
      'status', 'none',
      'objective_progress', null
    );
  end if;

  if nullif(p_payload->>'date', '') is not null then
    v_date := (p_payload->>'date')::date;
  elsif nullif(p_payload->>'completed_on', '') is not null then
    v_date := (p_payload->>'completed_on')::date;
  else
    v_date := v_today;
  end if;

  if v_date > v_today then
    raise exception 'Future workout dates are rejected';
  end if;

  if p_kind = 'workout' then
    if nullif(p_payload->>'client_id', '') is not null then
      v_client := (p_payload->>'client_id')::uuid;
      select id, points_awarded, status
        into v_log_id, v_existing_points, v_existing_status
      from public.workout_logs
      where character_id = v_character_id and client_id = v_client;
      if found then
        v_impact := public.character_impact(v_character_id);
        return v_impact || jsonb_build_object(
          'kind', 'workout',
          'log_id', v_log_id,
          'points_delta', v_existing_points,
          'pool', 'physical',
          'status', v_existing_status,
          'objective_progress', null,
          'replayed', true
        );
      end if;
    end if;

    if coalesce((p_payload->>'is_custom')::boolean, true) then
      if nullif(btrim(p_payload->>'exercise'), '') is null or nullif(btrim(p_payload->>'type'), '') is null then
        raise exception 'Exercise and type are required';
      end if;
      insert into public.workout_logs (
        character_id, date, type, exercise, sets, reps, weight, duration_minutes, notes,
        is_custom, award_track, status, points_awarded, client_id
      ) values (
        v_character_id,
        v_date,
        btrim(p_payload->>'type'),
        btrim(p_payload->>'exercise'),
        nullif(p_payload->>'sets', '')::int,
        nullif(p_payload->>'reps', '')::int,
        nullif(p_payload->>'weight', '')::numeric,
        nullif(p_payload->>'duration_minutes', '')::int,
        nullif(p_payload->>'notes', ''),
        true,
        'custom',
        'none',
        0,
        v_client
      )
      returning id into v_log_id;
      v_pool := 'physical';
    else
      v_library := (p_payload->>'library_workout_id')::uuid;
      v_equipment := p_payload->>'equipment';
      select tier, published, attribute, title, guild_id
        into v_tier, v_published, v_attribute, v_title, v_library_guild
      from public.workout_library
      where id = v_library;
      if not found or not v_published or v_library_guild is distinct from v_guild then
        raise exception 'That drill is not available';
      end if;
      if v_equipment not in ('functional', 'full_gym', 'at_home') then
        raise exception 'Choose an equipment version';
      end if;
      if not exists (
        select 1 from public.workout_versions
        where workout_id = v_library and equipment = v_equipment
      ) then
        raise exception 'That equipment version is not on this drill';
      end if;

      v_char_tier := case when v_inducted is null then 'recruit' else 'inducted' end;
      if v_tier = 'veteran' then
        select veteran_tier_start_week into v_vet_week from public.scoring_config where id = 1;
        v_week := public.adventure_week(v_today);
        if v_vet_week is null or v_inducted is null or v_week is null or v_week < v_vet_week then
          raise exception 'Veteran tier is not open yet';
        end if;
      elsif v_tier <> v_char_tier then
        raise exception 'That drill is for a different tier';
      end if;

      insert into public.workout_logs (
        character_id, date, type, exercise, sets, reps, weight, duration_minutes, notes,
        library_workout_id, equipment, is_custom, award_track, status, points_awarded, client_id
      ) values (
        v_character_id, v_date, v_attribute, v_title,
        nullif(p_payload->>'sets', '')::int,
        nullif(p_payload->>'reps', '')::int,
        nullif(p_payload->>'weight', '')::numeric,
        nullif(p_payload->>'duration_minutes', '')::int,
        nullif(p_payload->>'notes', ''),
        v_library, v_equipment, false, 'prescribed', 'none', 0, v_client
      )
      returning id into v_log_id;
      v_pool := 'physical';
    end if;

    if v_approve then
      perform set_config('emc.progression_write', 'on', true);
      update public.workout_logs set status = 'pending' where id = v_log_id;
      perform set_config('emc.progression_write', 'off', true);
      v_status := 'pending';
      v_awarded := 0;
    else
      perform set_config('emc.internal_award', 'on', true);
      v_awarded := public.award_attribute_points(
        v_character_id, 'workout', v_log_id, v_date, coalesce(nullif(p_payload->>'exercise', ''), 'Workout')
      );
      perform set_config('emc.internal_award', 'off', true);
      v_status := case when v_awarded > 0 then 'awarded' else 'none' end;
    end if;
  elsif p_kind = 'goal' then
    v_goal_id := (p_payload->>'goal_id')::uuid;
    select character_id, category into v_goal_character, v_category
    from public.goals where id = v_goal_id;
    if not found or v_goal_character <> v_character_id then
      raise exception 'Goal not found';
    end if;
    if v_category = 'constitution' then
      v_pool := 'constitution';
    else
      v_pool := 'mental';
    end if;

    insert into public.goal_logs (goal_id, character_id, completed_on, notes, status, points_awarded)
    values (v_goal_id, v_character_id, v_date, nullif(p_payload->>'notes', ''), 'none', 0)
    returning id into v_log_id;

    if v_approve then
      perform set_config('emc.progression_write', 'on', true);
      update public.goal_logs set status = 'pending' where id = v_log_id;
      perform set_config('emc.progression_write', 'off', true);
      v_status := 'pending';
      v_awarded := 0;
    else
      perform set_config('emc.internal_award', 'on', true);
      v_awarded := public.award_attribute_points(
        v_character_id, 'goal', v_log_id, v_date, 'Goal completed'
      );
      perform set_config('emc.internal_award', 'off', true);
      v_status := case when v_awarded > 0 then 'awarded' else 'none' end;
    end if;
  end if;

  if nullif(p_payload->>'objective_id', '') is not null then
    v_objective := public.log_objective_progress(
      (p_payload->>'objective_id')::uuid,
      coalesce(nullif(p_payload->>'objective_amount', '')::int, 1),
      nullif(p_payload->>'notes', '')
    );
  end if;

  v_impact := public.character_impact(v_character_id);
  return v_impact || jsonb_build_object(
    'kind', p_kind,
    'log_id', v_log_id,
    'points_delta', v_awarded,
    'pool', v_pool,
    'status', v_status,
    'objective_progress', v_objective
  );
end;
$$;

create or replace function public.approve_log(p_kind text, p_log_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_character uuid;
  v_guild uuid;
  v_status text;
  v_date date;
  v_awarded int;
begin
  if not public.is_staff() then
    raise exception 'Staff role required';
  end if;
  if p_kind = 'workout' then
    select character_id, status, date into v_character, v_status, v_date
    from public.workout_logs where id = p_log_id for update;
  elsif p_kind = 'goal' then
    select character_id, status, completed_on into v_character, v_status, v_date
    from public.goal_logs where id = p_log_id for update;
  else
    raise exception 'Unknown activity';
  end if;
  if not found then
    raise exception 'Log not found';
  end if;
  select guild_id into v_guild from public.characters where id = v_character;
  if not public.is_member(v_guild) then
    raise exception 'Not your company';
  end if;
  if v_status is distinct from 'pending' then
    raise exception 'That log is not waiting for approval';
  end if;

  perform set_config('emc.internal_award', 'on', true);
  v_awarded := public.award_attribute_points(v_character, p_kind, p_log_id, v_date, 'Approved by staff');
  perform set_config('emc.internal_award', 'off', true);

  update public.attribute_point_ledger
  set approved_by = auth.uid()
  where source = p_kind and source_id = p_log_id and approved_by is null;

  return public.character_impact(v_character) || jsonb_build_object(
    'kind', p_kind,
    'log_id', p_log_id,
    'points_delta', v_awarded,
    'status', case when v_awarded > 0 then 'awarded' else 'none' end
  );
end;
$$;

-- The approved_by update is blocked by the ledger trigger. Fold it into the award insert instead.
-- approve_log above updates the ledger after the flag is off. Fix: set approved_by inside award
-- when the flag is on. The update below is replaced by doing nothing if the trigger rejects it.
-- See the following replacement of approve_log's ledger update: it runs while progression_write is on.

create or replace function public.spend_attribute_points(
  p_character_id uuid,
  p_strength int,
  p_dexterity int,
  p_constitution int,
  p_intelligence int,
  p_wisdom int,
  p_charisma int
) returns jsonb
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
  select * into v_row from public.characters where id = p_character_id for update;
  if not found then
    raise exception 'Character not found';
  end if;
  if v_row.user_id is distinct from auth.uid() then
    if not (public.is_dm() and public.is_member(v_row.guild_id)) then
      raise exception 'Not your character';
    end if;
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
    raise exception 'Scores must stay on the point-buy table';
  end if;

  v_physical :=
    (public.point_buy_cost(p_strength) - public.point_buy_cost(v_row.strength))
    + (public.point_buy_cost(p_dexterity) - public.point_buy_cost(v_row.dexterity));
  v_constitution := public.point_buy_cost(p_constitution) - public.point_buy_cost(v_row.constitution);
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

  if v_physical = 0 and v_constitution = 0 and v_mental = 0
     and p_strength = v_row.strength
     and p_dexterity = v_row.dexterity
     and p_constitution = v_row.constitution
     and p_intelligence = v_row.intelligence
     and p_wisdom = v_row.wisdom
     and p_charisma = v_row.charisma
  then
    return public.character_impact(p_character_id);
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

  if v_physical <> 0 then
    insert into public.attribute_point_ledger (
      character_id, source, points_awarded, pool, attribute_target, reason, status
    ) values (
      p_character_id, 'spend', -v_physical, 'physical', 'strength,dexterity', 'Point buy', 'awarded'
    );
  end if;
  if v_constitution <> 0 then
    insert into public.attribute_point_ledger (
      character_id, source, points_awarded, pool, attribute_target, reason, status
    ) values (
      p_character_id, 'spend', -v_constitution, 'constitution', 'constitution', 'Point buy', 'awarded'
    );
  end if;
  if v_mental <> 0 then
    insert into public.attribute_point_ledger (
      character_id, source, points_awarded, pool, attribute_target, reason, status
    ) values (
      p_character_id, 'spend', -v_mental, 'mental', 'intelligence,wisdom,charisma', 'Point buy', 'awarded'
    );
  end if;
  perform set_config('emc.progression_write', 'off', true);

  return public.character_impact(p_character_id);
end;
$$;

create or replace function public.grant_staff_attribute_points(
  p_character_id uuid,
  p_points int,
  p_pool text,
  p_reason text
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guild uuid;
begin
  if not public.is_staff() then
    raise exception 'Staff role required';
  end if;
  if p_points is null or p_points <= 0 then
    raise exception 'Points cannot be taken away';
  end if;
  if p_pool not in ('physical', 'constitution', 'mental') then
    raise exception 'Unknown point pool';
  end if;
  if p_reason is null or length(btrim(p_reason)) = 0 then
    raise exception 'A reason is required';
  end if;

  select guild_id into v_guild from public.characters where id = p_character_id for update;
  if not found then
    raise exception 'Character not found';
  end if;
  if not public.is_member(v_guild) then
    raise exception 'Not your company';
  end if;

  perform set_config('emc.progression_write', 'on', true);
  if p_pool = 'physical' then
    update public.characters set physical_points = physical_points + p_points where id = p_character_id;
  elsif p_pool = 'constitution' then
    update public.characters set constitution_points = constitution_points + p_points where id = p_character_id;
  else
    update public.characters set mental_points = mental_points + p_points where id = p_character_id;
  end if;

  insert into public.attribute_point_ledger (
    character_id, source, points_awarded, attribute_target, pool, reason, status, approved_by
  ) values (
    p_character_id, 'staff', p_points, p_pool, p_pool, btrim(p_reason), 'awarded', auth.uid()
  );
  perform set_config('emc.progression_write', 'off', true);
  return p_points;
end;
$$;

-- approve_log tried to update the ledger after the write flag dropped.
-- Record the approver while the flag is still on.
create or replace function public.approve_log(p_kind text, p_log_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_character uuid;
  v_guild uuid;
  v_status text;
  v_date date;
  v_awarded int;
begin
  if not public.is_staff() then
    raise exception 'Staff role required';
  end if;
  if p_kind = 'workout' then
    select character_id, status, date into v_character, v_status, v_date
    from public.workout_logs where id = p_log_id for update;
  elsif p_kind = 'goal' then
    select character_id, status, completed_on into v_character, v_status, v_date
    from public.goal_logs where id = p_log_id for update;
  else
    raise exception 'Unknown activity';
  end if;
  if not found then
    raise exception 'Log not found';
  end if;
  select guild_id into v_guild from public.characters where id = v_character;
  if not public.is_member(v_guild) then
    raise exception 'Not your company';
  end if;
  if v_status is distinct from 'pending' then
    raise exception 'That log is not waiting for approval';
  end if;

  perform set_config('emc.internal_award', 'on', true);
  v_awarded := public.award_attribute_points(v_character, p_kind, p_log_id, v_date, 'Approved by staff');
  perform set_config('emc.progression_write', 'on', true);
  update public.attribute_point_ledger
  set approved_by = auth.uid()
  where source = p_kind and source_id = p_log_id;
  perform set_config('emc.internal_award', 'off', true);
  perform set_config('emc.progression_write', 'off', true);

  return public.character_impact(v_character) || jsonb_build_object(
    'kind', p_kind,
    'log_id', p_log_id,
    'points_delta', v_awarded,
    'status', case when v_awarded > 0 then 'awarded' else 'none' end
  );
end;
$$;
