-- Company functions. Point awards are internal: award_attribute_points refuses
-- to run unless log_activity (or approve_log) set emc.internal_award, and the
-- lockdown migration revokes execute from authenticated.

-- ============================================================
-- ROLES
-- ============================================================

create or replace function public.has_app_role(p_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and app_role = p_role
  );
$$;

create or replace function public.is_dm()
returns boolean language sql stable security definer set search_path = public
as $$ select public.has_app_role('dm'); $$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select public.has_app_role('admin'); $$;

create or replace function public.is_curator()
returns boolean language sql stable security definer set search_path = public
as $$ select public.has_app_role('curator'); $$;

create or replace function public.is_member(p_guild_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.guild_memberships
    where user_id = auth.uid() and guild_id = p_guild_id
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    join public.staff_grant_roles r on r.app_role = p.app_role
    where p.id = auth.uid()
  );
$$;

create or replace function public.is_library_editor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    join public.library_editor_roles r on r.app_role = p.app_role
    where p.id = auth.uid()
  );
$$;

create or replace function public.owns_character(p_character_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.characters
    where id = p_character_id and user_id = auth.uid()
  );
$$;

create or replace function public.shares_squad(p_character_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.characters mine
    join public.characters theirs on theirs.squad_id = mine.squad_id
    where mine.user_id = auth.uid()
      and theirs.id = p_character_id
      and mine.squad_id is not null
  );
$$;

create or replace function public.can_read_logs(p_character_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_mode text;
  v_guild uuid;
begin
  if public.owns_character(p_character_id) then
    return true;
  end if;
  select guild_id into v_guild from public.characters where id = p_character_id;
  if v_guild is null or not public.is_member(v_guild) then
    return false;
  end if;
  select log_visibility into v_mode from public.scoring_config where id = 1;
  if v_mode = 'company' then
    return true;
  elsif v_mode = 'squad' then
    return public.shares_squad(p_character_id);
  elsif v_mode = 'staff' then
    return public.is_dm() or public.is_admin() or public.is_curator();
  end if;
  return false;
end;
$$;

-- ============================================================
-- CLOCK AND COSTS
-- ============================================================

create or replace function public.point_buy_cost(p_score int)
returns int
language sql
stable
set search_path = public
as $$
  select cost from public.point_buy_costs where score = p_score;
$$;

create or replace function public.company_calendar_date(p_at timestamptz)
returns date
language sql
stable
set search_path = public
as $$
  select (timezone((select time_zone from public.scoring_config where id = 1), p_at))::date;
$$;

create or replace function public.company_today()
returns date
language sql
stable
set search_path = public
as $$
  select public.company_calendar_date(now());
$$;

create or replace function public.adventure_session(p_day date)
returns table (session_number int, start_date date, end_date date)
language plpgsql
stable
set search_path = public
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
  from public.scoring_config c
  where c.id = 1;

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

create or replace function public.adventure_week(p_day date)
returns int
language sql
stable
set search_path = public
as $$
  select case
    when p_day is null or p_day < c.cohort_start then null
    else least(c.adventure_weeks, ((p_day - c.cohort_start) / 7) + 1)
  end
  from public.scoring_config c
  where c.id = 1;
$$;

-- ============================================================
-- GUARDS
-- ============================================================

create or replace function public.protect_profile_write()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_setting('emc.profile_admin', true) = 'on' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if current_setting('emc.profile_insert', true) is distinct from 'on' then
      raise exception 'Profiles are created at signup';
    end if;
    return new;
  end if;
  if new.app_role is distinct from old.app_role
     or new.id is distinct from old.id
     or new.email is distinct from old.email
  then
    raise exception 'Role and identity are changed by company functions';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_write on public.profiles;
create trigger profiles_protect_write
  before insert or update on public.profiles
  for each row execute function public.protect_profile_write();

create or replace function public.protect_character_write()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if current_setting('emc.character_create', true) is distinct from 'on' then
      raise exception 'Characters are created with create_character';
    end if;
    return new;
  end if;

  if new.user_id is distinct from old.user_id then
    raise exception 'Character owner cannot change';
  end if;

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

  if current_setting('emc.staff_write', true) = 'on' then
    return new;
  end if;

  if new.guild_id is distinct from old.guild_id
     or new.squad_id is distinct from old.squad_id
     or new.class is distinct from old.class
     or new.level is distinct from old.level
     or new.rank is distinct from old.rank
     or new.inducted_at is distinct from old.inducted_at
  then
    raise exception 'Level, class, rank, and squad change through company functions';
  end if;

  return new;
end;
$$;

drop trigger if exists characters_protect_write on public.characters;
create trigger characters_protect_write
  before insert or update on public.characters
  for each row execute function public.protect_character_write();

create or replace function public.enforce_squad_size()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_squad_guild uuid;
  v_max int;
  v_cap int;
  v_count int;
begin
  if new.squad_id is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.squad_id is not distinct from old.squad_id then
    return new;
  end if;

  select guild_id, max_size into v_squad_guild, v_max
  from public.squads where id = new.squad_id;
  if v_squad_guild is distinct from new.guild_id then
    raise exception 'That squad is in another company';
  end if;

  select squad_max_size into v_cap from public.scoring_config where id = 1;
  v_max := least(v_max, v_cap);

  select count(*) into v_count
  from public.characters
  where squad_id = new.squad_id and id <> new.id;

  if v_count >= v_max then
    raise exception 'Squad is full';
  end if;
  return new;
end;
$$;

drop trigger if exists characters_enforce_squad_size on public.characters;
create trigger characters_enforce_squad_size
  before insert or update of squad_id on public.characters
  for each row execute function public.enforce_squad_size();

create or replace function public.protect_ledger()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and current_setting('emc.progression_write', true) = 'on' then
    return new;
  end if;
  if tg_op = 'UPDATE'
     and current_setting('emc.progression_write', true) = 'on'
     and new.character_id is not distinct from old.character_id
     and new.source is not distinct from old.source
     and new.source_id is not distinct from old.source_id
     and new.points_awarded is not distinct from old.points_awarded
     and new.pool is not distinct from old.pool
     and new.session_start is not distinct from old.session_start
  then
    return new;
  end if;
  raise exception 'The point ledger is written by company functions';
end;
$$;

drop trigger if exists ledger_protect on public.attribute_point_ledger;
create trigger ledger_protect
  before insert or update or delete on public.attribute_point_ledger
  for each row execute function public.protect_ledger();

create or replace function public.protect_workout_log()
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
    if coalesce(new.points_awarded, 0) <> 0 or new.status is distinct from 'none' then
      raise exception 'Workout points are awarded by the company';
    end if;
    return new;
  end if;
  if new.points_awarded is distinct from old.points_awarded
     or new.status is distinct from old.status
     or new.character_id is distinct from old.character_id
     or new.date is distinct from old.date
     or new.award_track is distinct from old.award_track
     or new.is_custom is distinct from old.is_custom
     or new.client_id is distinct from old.client_id
  then
    raise exception 'Workout points are awarded by the company';
  end if;
  return new;
end;
$$;

drop trigger if exists workout_logs_protect on public.workout_logs;
create trigger workout_logs_protect
  before insert or update on public.workout_logs
  for each row execute function public.protect_workout_log();

create or replace function public.protect_goal_log()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.completed_on > public.company_today() then
    raise exception 'Future workout dates are rejected';
  end if;
  if current_setting('emc.progression_write', true) = 'on' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if coalesce(new.points_awarded, 0) <> 0 or new.status is distinct from 'none' then
      raise exception 'Goal points are awarded by the company';
    end if;
    return new;
  end if;
  if new.points_awarded is distinct from old.points_awarded
     or new.status is distinct from old.status
     or new.character_id is distinct from old.character_id
     or new.goal_id is distinct from old.goal_id
     or new.completed_on is distinct from old.completed_on
  then
    raise exception 'Goal points are awarded by the company';
  end if;
  return new;
end;
$$;

drop trigger if exists goal_logs_protect on public.goal_logs;
create trigger goal_logs_protect
  before insert or update on public.goal_logs
  for each row execute function public.protect_goal_log();

create or replace function public.protect_objective_progress()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if coalesce(new.current_value, 0) <> 0 then
      raise exception 'Objective progress is recorded by the company';
    end if;
    return new;
  end if;
  if new.current_value is distinct from old.current_value
     and current_setting('emc.progression_write', true) is distinct from 'on'
  then
    raise exception 'Objective progress is recorded by the company';
  end if;
  return new;
end;
$$;

drop trigger if exists objectives_protect_progress on public.objectives;
create trigger objectives_protect_progress
  before insert or update on public.objectives
  for each row execute function public.protect_objective_progress();

create or replace function public.protect_srd_content()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_source text;
begin
  if tg_op = 'DELETE' then
    if old.source = 'srd-5.2' and current_setting('emc.seed', true) is distinct from 'on' then
      raise exception 'SRD rows are not deleted from the app';
    end if;
    return old;
  end if;
  if tg_op = 'UPDATE' and old.source = 'srd-5.2' and current_setting('emc.seed', true) is distinct from 'on' then
    raise exception 'SRD rows are not edited from the app';
  end if;
  if tg_op = 'INSERT' and new.source = 'srd-5.2' and current_setting('emc.seed', true) is distinct from 'on' then
    raise exception 'SRD rows are loaded by the seed';
  end if;
  if tg_op = 'INSERT' and new.source = 'homebrew' and not public.is_dm() then
    raise exception 'Only the DM adds homebrew';
  end if;
  return new;
end;
$$;

drop trigger if exists skill_labels_protect_srd on public.skill_labels;
create trigger skill_labels_protect_srd
  before insert or update or delete on public.skill_labels
  for each row execute function public.protect_srd_content();

drop trigger if exists profession_tools_protect_srd on public.profession_tools;
create trigger profession_tools_protect_srd
  before insert or update or delete on public.profession_tools
  for each row execute function public.protect_srd_content();

drop trigger if exists content_species_protect_srd on public.content_species;
create trigger content_species_protect_srd
  before insert or update or delete on public.content_species
  for each row execute function public.protect_srd_content();

drop trigger if exists content_items_protect_srd on public.content_items;
create trigger content_items_protect_srd
  before insert or update or delete on public.content_items
  for each row execute function public.protect_srd_content();

drop trigger if exists content_spells_protect_srd on public.content_spells;
create trigger content_spells_protect_srd
  before insert or update or delete on public.content_spells
  for each row execute function public.protect_srd_content();

create or replace function public.enforce_workout_publish()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_versions int;
begin
  if tg_op = 'DELETE' then
    if not public.is_library_editor() and current_setting('emc.library_write', true) is distinct from 'on' then
      raise exception 'Library editors delete drills';
    end if;
    return old;
  end if;

  if not public.is_library_editor() and current_setting('emc.library_write', true) is distinct from 'on' then
    if tg_op = 'UPDATE' and public.is_dm() and old.published and not new.published
       and new.title is not distinct from old.title
       and new.attribute is not distinct from old.attribute
       and new.tier is not distinct from old.tier
       and new.components is not distinct from old.components
       and new.guild_id is not distinct from old.guild_id
    then
      return new;
    end if;
    raise exception 'Library editors change a drill. The DM can unpublish it.';
  end if;

  if new.published then
    select count(distinct equipment) into v_versions
    from public.workout_versions where workout_id = new.id;
    if v_versions < 3 then
      raise exception 'Publishing requires a functional, full gym, and at-home version';
    end if;
    if new.attribute = 'str' and not (
      new.components @> array['overhead_press', 'carry', 'horizontal_push', 'horizontal_pull', 'leg']::text[]
    ) then
      raise exception 'A STR workout needs overhead press, carry, horizontal push, horizontal pull, and a leg movement';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists workout_library_publish on public.workout_library;
create trigger workout_library_publish
  before insert or update or delete on public.workout_library
  for each row execute function public.enforce_workout_publish();

create or replace function public.enforce_workout_version()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_published boolean;
  v_remaining int;
begin
  if not public.is_library_editor() and current_setting('emc.library_write', true) is distinct from 'on' then
    raise exception 'Library editors edit versions';
  end if;
  if tg_op = 'DELETE' then
    select published into v_published from public.workout_library where id = old.workout_id;
    if v_published then
      select count(*) into v_remaining
      from public.workout_versions
      where workout_id = old.workout_id and id <> old.id;
      if v_remaining < 3 then
        raise exception 'A published drill keeps all three versions';
      end if;
    end if;
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists workout_versions_edit on public.workout_versions;
create trigger workout_versions_edit
  before insert or update or delete on public.workout_versions
  for each row execute function public.enforce_workout_version();

-- ============================================================
-- SIGNUP
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  perform set_config('emc.profile_insert', 'on', true);
  v_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    nullif(split_part(coalesce(new.email, ''), '@', 1), '')
  );
  insert into public.profiles (id, email, display_name, avatar_url)
  values (new.id, new.email, v_name, new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;

  insert into public.guild_memberships (guild_id, user_id, rank)
  select g.id, new.id, 'Recruit'
  from public.guilds g
  where g.slug = 'emc'
  on conflict (guild_id, user_id) do nothing;

  perform set_config('emc.profile_insert', 'off', true);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- CHARACTER
-- ============================================================

create or replace function public.starting_array_valid(
  p_strength int,
  p_dexterity int,
  p_constitution int,
  p_intelligence int,
  p_wisdom int,
  p_charisma int
) returns boolean
language sql
immutable
as $$
  with scores as (
    select unnest(array[
      p_strength, p_dexterity, p_constitution, p_intelligence, p_wisdom, p_charisma
    ]) as score
  ),
  counts as (
    select
      count(*) filter (where score = 8) as eights,
      count(*) filter (where score = 9) as nines,
      count(*) filter (where score = 10) as tens,
      count(*) filter (where score not in (8, 9, 10)) as others
    from scores
  )
  select (others = 0 and eights = 4 and nines = 1 and tens = 1)
      or (others = 0 and eights = 3 and nines = 3 and tens = 0)
  from counts;
$$;

create or replace function public.create_character(
  p_name text,
  p_origin_word text,
  p_profession text,
  p_profession_tool text,
  p_profession_skill text,
  p_species text,
  p_strength int,
  p_dexterity int,
  p_constitution int,
  p_intelligence int,
  p_wisdom int,
  p_charisma int
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_character_id uuid;
  v_guild uuid;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;
  if exists (select 1 from public.characters where user_id = v_user) then
    raise exception 'Character already exists';
  end if;
  if p_name is null or length(btrim(p_name)) = 0 or length(btrim(p_name)) > 80 then
    raise exception 'Name is required';
  end if;
  if p_origin_word is null or length(btrim(p_origin_word)) = 0 or length(btrim(p_origin_word)) > 40 then
    raise exception 'Origin word is required';
  end if;
  if p_profession is null or length(btrim(p_profession)) = 0 or length(btrim(p_profession)) > 80 then
    raise exception 'Profession is required';
  end if;
  if not exists (select 1 from public.content_species where id = p_species) then
    raise exception 'Choose a species from the list';
  end if;
  if not exists (select 1 from public.profession_tools where id = p_profession_tool) then
    raise exception 'Choose a tool from the list';
  end if;
  if not exists (select 1 from public.skill_labels where id = p_profession_skill) then
    raise exception 'Choose a skill from the list';
  end if;
  if not public.starting_array_valid(
    p_strength, p_dexterity, p_constitution, p_intelligence, p_wisdom, p_charisma
  ) then
    raise exception 'Invalid starting array';
  end if;

  select guild_id into v_guild
  from public.guild_memberships
  where user_id = v_user
  order by joined_at
  limit 1;

  if v_guild is null then
    raise exception 'Join the company before creating a character';
  end if;

  perform set_config('emc.character_create', 'on', true);
  insert into public.characters (
    user_id, guild_id, name, species, profession, profession_tool, profession_skill,
    origin_word, background_bonus,
    strength, dexterity, constitution, intelligence, wisdom, charisma,
    level, rank
  ) values (
    v_user, v_guild, btrim(p_name), p_species, btrim(p_profession), p_profession_tool, p_profession_skill,
    btrim(p_origin_word),
    jsonb_build_object(
      'strength', p_strength - 8,
      'dexterity', p_dexterity - 8,
      'constitution', p_constitution - 8,
      'intelligence', p_intelligence - 8,
      'wisdom', p_wisdom - 8,
      'charisma', p_charisma - 8
    ),
    p_strength, p_dexterity, p_constitution, p_intelligence, p_wisdom, p_charisma,
    1, 'Recruit'
  )
  returning id into v_character_id;
  perform set_config('emc.character_create', 'off', true);

  update public.guild_memberships
  set character_id = v_character_id
  where user_id = v_user and guild_id = v_guild;

  return v_character_id;
end;
$$;

-- ============================================================
-- IMPACT
-- ============================================================

create or replace function public.character_impact(p_character_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.characters%rowtype;
  v_names text[] := array['strength','dexterity','constitution','intelligence','wisdom','charisma'];
  v_pools text[] := array['physical','physical','constitution','mental','mental','mental'];
  v_scores int[];
  v_balances int[];
  v_list jsonb := '[]'::jsonb;
  v_cost int;
  v_build int;
  i int;
begin
  select * into v_row from public.characters where id = p_character_id;
  if not found then
    raise exception 'Character not found';
  end if;
  if v_row.user_id is distinct from auth.uid()
     and not (public.is_dm() or public.is_admin())
  then
    raise exception 'Not allowed';
  end if;
  if (public.is_dm() or public.is_admin())
     and v_row.user_id is distinct from auth.uid()
     and not public.is_member(v_row.guild_id)
  then
    raise exception 'Not allowed';
  end if;

  v_scores := array[
    v_row.strength, v_row.dexterity, v_row.constitution,
    v_row.intelligence, v_row.wisdom, v_row.charisma
  ];
  v_balances := array[
    v_row.physical_points, v_row.physical_points, v_row.constitution_points,
    v_row.mental_points, v_row.mental_points, v_row.mental_points
  ];
  v_build :=
    public.point_buy_cost(v_row.strength)
    + public.point_buy_cost(v_row.dexterity)
    + public.point_buy_cost(v_row.constitution)
    + public.point_buy_cost(v_row.intelligence)
    + public.point_buy_cost(v_row.wisdom)
    + public.point_buy_cost(v_row.charisma)
    + v_row.physical_points + v_row.constitution_points + v_row.mental_points;

  for i in 1..6 loop
    if public.point_buy_cost(v_scores[i]) is null then
      continue;
    end if;
    if public.point_buy_cost(v_scores[i] + 1) is null then
      continue;
    end if;
    v_cost := public.point_buy_cost(v_scores[i] + 1) - public.point_buy_cost(v_scores[i]);
    if v_balances[i] >= v_cost then
      v_list := v_list || jsonb_build_array(jsonb_build_object(
        'ability', v_names[i],
        'from', v_scores[i],
        'to', v_scores[i] + 1,
        'cost', v_cost,
        'pool', v_pools[i]
      ));
    end if;
  end loop;

  return jsonb_build_object(
    'character_id', v_row.id,
    'unspent_after', jsonb_build_object(
      'physical', v_row.physical_points,
      'constitution', v_row.constitution_points,
      'mental', v_row.mental_points
    ),
    'build_total', v_build,
    'affordable_increases', v_list,
    'scores', jsonb_build_object(
      'strength', v_row.strength,
      'dexterity', v_row.dexterity,
      'constitution', v_row.constitution,
      'intelligence', v_row.intelligence,
      'wisdom', v_row.wisdom,
      'charisma', v_row.charisma
    )
  );
end;
$$;
