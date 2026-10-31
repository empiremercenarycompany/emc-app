-- Placements stay provisional until a DM or trainer finalizes them in person.
-- A finalized placement locks when the next session starts.
-- Provisional placements never lock. Unplaced banks never lock.

alter table public.build_placements
  add column status text not null default 'provisional'
    check (status in ('provisional', 'finalized')),
  add column finalized_at timestamptz,
  add column finalized_by uuid;

alter table public.award_audit drop constraint if exists award_audit_kind_check;
alter table public.award_audit add constraint award_audit_kind_check
  check (kind in (
    'grant', 'approval', 'spend', 'muster', 'attendance', 'workout', 'goal', 'bonus', 'checkin', 'finalize'
  ));

drop policy if exists build_placements_select on public.build_placements;
create policy build_placements_select on public.build_placements
  for select to authenticated
  using (
    public.owns_character(character_id)
    or exists (
      select 1 from public.characters c
      where c.id = character_id
        and public.is_member(c.guild_id)
        and public.is_log_approver()
    )
  );

create index idx_build_placements_open
  on public.build_placements (character_id, status)
  where remaining > 0;

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
  v_today date;
  v_open date;
  v_names text[] := array['strength','dexterity','constitution','intelligence','wisdom','charisma'];
  v_pools text[] := array['physical','physical','constitution','mental','mental','social'];
  v_old int[];
  v_new int[];
  v_ability text;
  v_pool text;
  v_need int;
  v_take int;
  v_from_pool int;
  v_from_free int;
  v_place public.build_placements%rowtype;
  i int;
begin
  select * into v_row from public.characters where id = p_character_id for update;
  if not found then
    raise exception 'Character not found';
  end if;
  if v_row.user_id is distinct from auth.uid() then
    raise exception 'The recruit places their own Build';
  end if;

  v_old := array[v_row.strength, v_row.dexterity, v_row.constitution, v_row.intelligence, v_row.wisdom, v_row.charisma];
  v_new := array[p_strength, p_dexterity, p_constitution, p_intelligence, p_wisdom, p_charisma];
  for i in 1..6 loop
    if public.point_buy_cost(v_old[i]) is null or public.point_buy_cost(v_new[i]) is null then
      raise exception 'Scores must stay on the point-buy table';
    end if;
  end loop;

  v_today := public.company_today();
  v_open := public.open_window_start(v_today);
  perform set_config('emc.progression_write', 'on', true);

  -- Refund provisional rows first, then finalized rows that have not locked.
  for i in 1..6 loop
    v_need := public.point_buy_cost(v_old[i]) - public.point_buy_cost(v_new[i]);
    if v_need <= 0 then
      continue;
    end if;
    v_ability := v_names[i];
    for v_place in
      select * from public.build_placements
      where character_id = p_character_id and ability = v_ability and remaining > 0
        and (
          status = 'provisional'
          or (status = 'finalized' and not public.placement_locked(session_start, v_today))
        )
      order by case when status = 'provisional' then 0 else 1 end, created_at desc
    loop
      exit when v_need <= 0;
      v_take := least(v_place.remaining, v_need);
      update public.build_placements set remaining = remaining - v_take where id = v_place.id;
      if v_place.pool = 'physical' then
        update public.characters set physical_points = physical_points + v_take where id = p_character_id;
      elsif v_place.pool = 'constitution' then
        update public.characters set constitution_points = constitution_points + v_take where id = p_character_id;
      elsif v_place.pool = 'mental' then
        update public.characters set mental_points = mental_points + v_take where id = p_character_id;
      elsif v_place.pool = 'social' then
        update public.characters set social_points = social_points + v_take where id = p_character_id;
      else
        update public.characters set free_points = free_points + v_take where id = p_character_id;
      end if;
      insert into public.attribute_point_ledger (character_id, source, points_awarded, pool, attribute_target, reason, status, session_start)
      values (p_character_id, 'spend', v_take, v_place.pool, v_ability, 'Refund', 'awarded', v_open);
      perform public.write_award_audit(p_character_id, 'spend', v_place.pool, v_take, 'Refund to ' || v_place.pool);
      v_need := v_need - v_take;
    end loop;
    if v_need > 0 then
      if exists (
        select 1 from public.build_placements
        where character_id = p_character_id and ability = v_ability and remaining > 0
          and status = 'finalized'
          and public.placement_locked(session_start, v_today)
      ) then
        raise exception 'That part of your Build is locked. It set when this session started.';
      end if;
      raise exception 'That came with your background and stays.';
    end if;
  end loop;

  select * into v_row from public.characters where id = p_character_id;

  for i in 1..6 loop
    v_need := public.point_buy_cost(v_new[i]) - public.point_buy_cost(v_old[i]);
    if v_need <= 0 then
      continue;
    end if;
    v_ability := v_names[i];
    v_pool := v_pools[i];
    if v_pool = 'physical' then
      v_from_pool := least(v_need, v_row.physical_points);
    elsif v_pool = 'constitution' then
      v_from_pool := least(v_need, v_row.constitution_points);
    elsif v_pool = 'mental' then
      v_from_pool := least(v_need, v_row.mental_points);
    else
      v_from_pool := least(v_need, v_row.social_points);
    end if;
    v_from_free := v_need - v_from_pool;
    if v_row.free_points < v_from_free then
      raise exception 'Not enough ready to place for that Build';
    end if;
    if v_from_pool > 0 then
      if v_pool = 'physical' then
        update public.characters set physical_points = physical_points - v_from_pool where id = p_character_id;
      elsif v_pool = 'constitution' then
        update public.characters set constitution_points = constitution_points - v_from_pool where id = p_character_id;
      elsif v_pool = 'mental' then
        update public.characters set mental_points = mental_points - v_from_pool where id = p_character_id;
      else
        update public.characters set social_points = social_points - v_from_pool where id = p_character_id;
      end if;
      insert into public.build_placements (character_id, ability, pool, remaining, session_start, status)
      values (p_character_id, v_ability, v_pool, v_from_pool, v_open, 'provisional');
      insert into public.attribute_point_ledger (character_id, source, points_awarded, pool, attribute_target, reason, status, session_start)
      values (p_character_id, 'spend', -v_from_pool, v_pool, v_ability, 'Build', 'awarded', v_open);
      perform public.write_award_audit(p_character_id, 'spend', v_pool, -v_from_pool, 'Placed on ' || v_ability);
    end if;
    if v_from_free > 0 then
      update public.characters set free_points = free_points - v_from_free where id = p_character_id;
      insert into public.build_placements (character_id, ability, pool, remaining, session_start, status)
      values (p_character_id, v_ability, 'free', v_from_free, v_open, 'provisional');
      insert into public.attribute_point_ledger (character_id, source, points_awarded, pool, attribute_target, reason, status, session_start)
      values (p_character_id, 'spend', -v_from_free, 'free', v_ability, 'Build', 'awarded', v_open);
      perform public.write_award_audit(p_character_id, 'spend', 'free', -v_from_free, 'Placed on ' || v_ability);
    end if;
    select * into v_row from public.characters where id = p_character_id;
  end loop;

  update public.characters
  set strength = p_strength,
      dexterity = p_dexterity,
      constitution = p_constitution,
      intelligence = p_intelligence,
      wisdom = p_wisdom,
      charisma = p_charisma
  where id = p_character_id;

  perform set_config('emc.progression_write', 'off', true);
  return public.character_impact(p_character_id);
end;
$$;

create or replace function public.build_mobility(p_character_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_row public.characters%rowtype;
  v_today date := public.company_today();
begin
  select * into v_row from public.characters where id = p_character_id;
  if not found then
    raise exception 'Character not found';
  end if;
  if v_row.user_id is distinct from auth.uid()
     and not (public.is_log_approver() and public.is_member(v_row.guild_id))
  then
    raise exception 'Not allowed';
  end if;
  return jsonb_build_object(
    'provisional', coalesce((
      select jsonb_agg(jsonb_build_object('ability', ability, 'pool', pool, 'amount', amount) order by ability)
      from (
        select ability, pool, sum(remaining)::int as amount
        from public.build_placements
        where character_id = p_character_id and remaining > 0 and status = 'provisional'
        group by ability, pool
      ) q
    ), '[]'::jsonb),
    'ready', coalesce((
      select jsonb_agg(jsonb_build_object('ability', ability, 'pool', pool, 'amount', amount) order by ability)
      from (
        select ability, pool, sum(remaining)::int as amount
        from public.build_placements
        where character_id = p_character_id and remaining > 0
          and status = 'finalized'
          and not public.placement_locked(session_start, v_today)
        group by ability, pool
      ) q
    ), '[]'::jsonb),
    'locked', coalesce((
      select jsonb_agg(jsonb_build_object('ability', ability, 'amount', amount) order by ability)
      from (
        select ability, sum(remaining)::int as amount
        from public.build_placements
        where character_id = p_character_id and remaining > 0
          and status = 'finalized'
          and public.placement_locked(session_start, v_today)
        group by ability
      ) q
    ), '[]'::jsonb),
    'banks', jsonb_build_object(
      'physical', v_row.physical_points,
      'constitution', v_row.constitution_points,
      'mental', v_row.mental_points,
      'social', v_row.social_points,
      'free', v_row.free_points
    )
  );
end;
$$;

create or replace function public.finalize_character_build(p_character_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.characters%rowtype;
  v_place public.build_placements%rowtype;
  v_count int := 0;
  v_lines jsonb := '[]'::jsonb;
begin
  if not public.is_log_approver() then
    raise exception 'A DM or trainer finalizes the Build';
  end if;
  select * into v_row from public.characters where id = p_character_id for update;
  if not found then
    raise exception 'Character not found';
  end if;
  if not public.is_member(v_row.guild_id) then
    raise exception 'A DM or trainer finalizes the Build';
  end if;
  if v_row.user_id is not distinct from auth.uid() then
    raise exception 'You cannot finalize your own Build';
  end if;
  for v_place in
    select * from public.build_placements
    where character_id = p_character_id and status = 'provisional' and remaining > 0
    order by created_at
    for update
  loop
    update public.build_placements
    set status = 'finalized',
        finalized_at = now(),
        finalized_by = auth.uid()
    where id = v_place.id;
    perform public.write_award_audit(
      p_character_id,
      'finalize',
      v_place.pool,
      v_place.remaining,
      'Finalized ' || v_place.ability || ' at check-in'
    );
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'ability', v_place.ability,
      'pool', v_place.pool,
      'amount', v_place.remaining
    ));
    v_count := v_count + 1;
  end loop;
  return jsonb_build_object('finalized', v_count, 'lines', v_lines);
end;
$$;

create or replace function public.finalize_squad_build(p_squad_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guild uuid;
  v_character uuid;
  v_one jsonb;
  v_count int := 0;
begin
  if not public.is_log_approver() then
    raise exception 'A DM or trainer finalizes the Build';
  end if;
  select guild_id into v_guild from public.squads where id = p_squad_id;
  if v_guild is null or not public.is_member(v_guild) then
    raise exception 'A DM or trainer finalizes the Build';
  end if;
  for v_character in
    select id from public.characters
    where squad_id = p_squad_id
      and guild_id = v_guild
      and user_id is distinct from auth.uid()
  loop
    v_one := public.finalize_character_build(v_character);
    v_count := v_count + coalesce((v_one ->> 'finalized')::int, 0);
  end loop;
  return jsonb_build_object('finalized', v_count);
end;
$$;

revoke all on function public.finalize_character_build(uuid) from public, anon;
revoke all on function public.finalize_squad_build(uuid) from public, anon;
grant execute on function public.finalize_character_build(uuid) to authenticated;
grant execute on function public.finalize_squad_build(uuid) to authenticated;
