-- Campaign phase. Week gates, attendance loot, staff notes, and the calendar
-- stay in config. Nothing here removes points a player already earned.

alter table public.scoring_config
  add column attendance_loot text not null default 'unset',
  add column group_goal_payout text not null default 'unset',
  add column level_two_week int not null default 16 check (level_two_week >= 1),
  add column level_three_week int not null default 32 check (level_three_week >= 1);

comment on column public.scoring_config.attendance_loot is
  'TODO(John): what attendance pays. Check-in copies this text and grants nothing.';
comment on column public.scoring_config.group_goal_payout is
  'TODO(John): what a group goal pays. Progress still does not award attribute points.';
comment on column public.scoring_config.level_two_week is
  'TODO(John): placeholder week when staff may record level 2. Week 1 starts on cohort_start. Confirm whether this is the first day of that week or the day after it ends.';
comment on column public.scoring_config.level_three_week is
  'TODO(John): placeholder week when staff may record level 3. Default 32, two adventures of 16.';

-- Week numbers keep climbing past one adventure so week 32 is reachable.
create or replace function public.adventure_week(p_day date)
returns int
language sql
stable
set search_path = public
as $$
  select case
    when p_day is null or p_day < c.cohort_start then null
    else ((p_day - c.cohort_start) / 7) + 1
  end
  from public.scoring_config c
  where c.id = 1;
$$;

alter table public.sessions
  add column session_date date,
  add column cohort_session_number int,
  add column off_week boolean not null default false;

comment on column public.sessions.cohort_session_number is
  'Award window that contains session_date. Null on an off-week. Not a foreign key, so clearing the calendar does not delete the table session.';
comment on column public.sessions.off_week is
  'True when session_date sits in a gap. The row is still a real table. It earns no award-window points by itself.';

alter table public.session_attendance
  add column loot_placeholder text not null default 'unset';

comment on column public.session_attendance.loot_placeholder is
  'Copy of scoring_config.attendance_loot at check-in. It does not grant points.';

alter table public.announcements
  add column squad_id uuid references public.squads (id) on delete cascade;

comment on column public.announcements.squad_id is
  'Null is the whole company. A squad id is readable by that squad and by staff.';

create table public.progression_audit (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters (id) on delete cascade,
  kind text not null check (kind in ('induction', 'level', 'attendance')),
  from_value text,
  to_value text,
  reason text,
  actor_id uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

comment on table public.progression_audit is
  'Staff changes to induction, level, and attendance. Players can read their own rows. Nothing here deletes points.';

create table public.dm_notes (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds (id) on delete cascade,
  session_id uuid references public.sessions (id) on delete cascade,
  character_id uuid references public.characters (id) on delete cascade,
  squad_id uuid references public.squads (id) on delete cascade,
  body text not null,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dm_notes_has_subject check (
    session_id is not null or character_id is not null or squad_id is not null
  )
);

comment on table public.dm_notes is
  'Staff-only notes about a session, a player, or a squad. Players have no select policy.';

create index progression_audit_character on public.progression_audit (character_id, created_at desc);
create index dm_notes_guild on public.dm_notes (guild_id, created_at desc);
create index sessions_date on public.sessions (guild_id, session_date);

alter table public.progression_audit enable row level security;
alter table public.dm_notes enable row level security;

create policy progression_audit_select on public.progression_audit
  for select to authenticated
  using (
    public.owns_character(character_id)
    or exists (
      select 1 from public.characters c
      where c.id = character_id
        and public.is_member(c.guild_id)
        and public.is_staff()
    )
  );

create policy dm_notes_select on public.dm_notes
  for select to authenticated
  using (public.is_staff() and public.is_member(guild_id));

create policy dm_notes_insert on public.dm_notes
  for insert to authenticated
  with check (
    public.is_staff()
    and public.is_member(guild_id)
    and created_by = auth.uid()
  );

create policy dm_notes_update on public.dm_notes
  for update to authenticated
  using (public.is_staff() and public.is_member(guild_id))
  with check (public.is_staff() and public.is_member(guild_id));

create policy dm_notes_delete on public.dm_notes
  for delete to authenticated
  using (public.is_staff() and public.is_member(guild_id));

drop policy if exists announcements_select on public.announcements;
create policy announcements_select on public.announcements
  for select to authenticated
  using (
    public.is_member(guild_id)
    and (
      squad_id is null
      or public.is_staff()
      or exists (
        select 1 from public.characters c
        where c.user_id = auth.uid() and c.squad_id = announcements.squad_id
      )
    )
  );

drop policy if exists announcements_write on public.announcements;
create policy announcements_write on public.announcements
  for all to authenticated
  using (public.is_staff() and public.is_member(guild_id))
  with check (
    public.is_staff()
    and public.is_member(guild_id)
    and (
      squad_id is null
      or exists (
        select 1 from public.squads s
        where s.id = squad_id and s.guild_id = announcements.guild_id
      )
    )
  );

drop policy if exists sessions_write on public.sessions;
create policy sessions_write on public.sessions
  for all to authenticated
  using (public.is_staff() and public.is_member(guild_id))
  with check (public.is_staff() and public.is_member(guild_id));

drop policy if exists calendar_write on public.calendar_events;
create policy calendar_write on public.calendar_events
  for all to authenticated
  using (public.is_staff() and public.is_member(guild_id))
  with check (public.is_staff() and public.is_member(guild_id));

create or replace function public.stamp_attendance_loot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    select attendance_loot into new.loot_placeholder
    from public.scoring_config
    where id = 1;
  end if;
  return new;
end;
$$;

drop trigger if exists session_attendance_stamp_loot on public.session_attendance;
create trigger session_attendance_stamp_loot
  before insert on public.session_attendance
  for each row execute function public.stamp_attendance_loot();

create or replace function public.write_progression_audit(
  p_character_id uuid,
  p_kind text,
  p_from text,
  p_to text,
  p_reason text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.progression_audit (character_id, kind, from_value, to_value, reason, actor_id)
  values (p_character_id, p_kind, p_from, p_to, p_reason, auth.uid());
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
  v_week int;
  v_need int;
  v_old_class text;
  v_old_at timestamptz;
begin
  if not public.is_dm() then
    raise exception 'Only the DM records induction';
  end if;
  select guild_id, class, inducted_at
    into v_guild, v_old_class, v_old_at
  from public.characters
  where id = p_character_id
  for update;
  if not found or not public.is_member(v_guild) then
    raise exception 'Character not found';
  end if;

  select public.adventure_week(public.company_today()), induction_week
    into v_week, v_need
  from public.scoring_config
  where id = 1;
  if v_week is null or v_week < v_need then
    raise exception 'Induction opens at week %', v_need;
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

  perform public.write_progression_audit(
    p_character_id,
    'induction',
    coalesce(v_old_class, 'none'),
    coalesce(p_class, 'none'),
    'Week ' || v_week::text
  );
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
  v_old int;
begin
  if not public.is_dm() then
    raise exception 'Only the DM sets level';
  end if;
  if p_level is null or p_level < 1 or p_level > 20 then
    raise exception 'Level must be between 1 and 20';
  end if;
  select guild_id, level into v_guild, v_old
  from public.characters
  where id = p_character_id
  for update;
  if not found or not public.is_member(v_guild) then
    raise exception 'Character not found';
  end if;
  if p_level = v_old then
    return;
  end if;

  perform set_config('emc.staff_write', 'on', true);
  update public.characters set level = p_level where id = p_character_id;
  perform set_config('emc.staff_write', 'off', true);
  perform public.write_progression_audit(
    p_character_id, 'level', v_old::text, p_level::text, 'DM correction'
  );
end;
$$;

create or replace function public.advance_milestone(p_character_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guild uuid;
  v_level int;
  v_week int;
  v_two_week int;
  v_three_week int;
  v_two int;
  v_three int;
  v_next int;
begin
  if not public.is_staff() then
    raise exception 'Staff role required';
  end if;
  select guild_id, level into v_guild, v_level
  from public.characters
  where id = p_character_id
  for update;
  if not found or not public.is_member(v_guild) then
    raise exception 'Character not found';
  end if;

  select public.adventure_week(public.company_today()),
         level_two_week, level_three_week,
         level_after_adventure_1, level_after_adventure_2
    into v_week, v_two_week, v_three_week, v_two, v_three
  from public.scoring_config
  where id = 1;

  if v_level < v_two and v_week is not null and v_week >= v_two_week then
    v_next := v_two;
  elsif v_level >= v_two and v_level < v_three and v_week is not null and v_week >= v_three_week then
    v_next := v_three;
  else
    raise exception 'That milestone is not open yet';
  end if;
  if v_next < v_level then
    raise exception 'Leveling does not remove progress';
  end if;

  perform set_config('emc.staff_write', 'on', true);
  update public.characters set level = v_next where id = p_character_id;
  perform set_config('emc.staff_write', 'off', true);
  perform public.write_progression_audit(
    p_character_id,
    'level',
    v_level::text,
    v_next::text,
    'Milestone at week ' || v_week::text
  );
  return v_next;
end;
$$;

create or replace function public.save_table_session(
  p_id uuid,
  p_title text,
  p_session_date date,
  p_squad_id uuid,
  p_notes text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guild uuid;
  v_number int;
  v_off boolean;
  v_id uuid;
begin
  if not public.is_staff() then
    raise exception 'Staff role required';
  end if;
  if p_title is null or length(btrim(p_title)) = 0 then
    raise exception 'Session title is required';
  end if;
  if p_session_date is null then
    raise exception 'Session date is required';
  end if;
  select guild_id into v_guild
  from public.guild_memberships
  where user_id = auth.uid()
  limit 1;
  if v_guild is null then
    raise exception 'Not your company';
  end if;
  if p_squad_id is not null and not exists (
    select 1 from public.squads where id = p_squad_id and guild_id = v_guild
  ) then
    raise exception 'Squad not found';
  end if;

  select s.session_number into v_number
  from public.adventure_session(p_session_date) s;
  v_off := v_number is null;

  if p_id is null then
    insert into public.sessions (
      guild_id, squad_id, title, session_date, cohort_session_number, off_week, notes, scheduled_at
    ) values (
      v_guild, p_squad_id, btrim(p_title), p_session_date, v_number, v_off,
      nullif(p_notes, ''), p_session_date::timestamp
    )
    returning id into v_id;
  else
    update public.sessions
    set title = btrim(p_title),
        squad_id = p_squad_id,
        session_date = p_session_date,
        cohort_session_number = v_number,
        off_week = v_off,
        notes = nullif(p_notes, ''),
        scheduled_at = p_session_date::timestamp
    where id = p_id and guild_id = v_guild
    returning id into v_id;
    if v_id is null then
      raise exception 'Session not found';
    end if;
  end if;
  return v_id;
end;
$$;

create or replace function public.correct_attendance(
  p_session_id uuid,
  p_character_id uuid,
  p_present boolean,
  p_loot_share boolean
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guild uuid;
  v_character_guild uuid;
begin
  if not public.is_dm() then
    raise exception 'Only the DM corrects attendance';
  end if;
  select guild_id into v_guild from public.sessions where id = p_session_id;
  select guild_id into v_character_guild from public.characters where id = p_character_id;
  if v_guild is null or v_guild is distinct from v_character_guild or not public.is_member(v_guild) then
    raise exception 'Session not found';
  end if;

  if coalesce(p_present, false) then
    insert into public.session_attendance (session_id, character_id, loot_share)
    values (p_session_id, p_character_id, coalesce(p_loot_share, true))
    on conflict (session_id, character_id) do update
      set loot_share = excluded.loot_share;
  else
    delete from public.session_attendance
    where session_id = p_session_id and character_id = p_character_id;
  end if;

  perform public.write_progression_audit(
    p_character_id,
    'attendance',
    null,
    case when coalesce(p_present, false) then 'present' else 'absent' end,
    'Attendance correction'
  );
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
    'attendance_loot', 'group_goal_payout', 'level_two_week', 'level_three_week'
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
    level_three_week = case when p_patch ? 'level_three_week' then (p_patch->>'level_three_week')::int else level_three_week end
  where id = 1;

  if p_patch ? 'cohort_start' then
    update public.adventures set start_date = (p_patch->>'cohort_start')::date where number = 1;
  end if;

  return (select to_jsonb(s) from public.scoring_config s where id = 1);
end;
$$;

insert into public.config_notes (key, note) values
  ('attendance_loot', 'TODO(John): attendance_loot is the text unset. Check-in stores it and grants nothing.'),
  ('group_goal_payout', 'TODO(John): group_goal_payout is the text unset. Objective progress still awards no attribute points.'),
  ('level_two_week', 'TODO(John): staff may record level 2 from company week 16. Confirm the exact day.'),
  ('level_three_week', 'TODO(John): staff may record level 3 from company week 32. Confirm the exact day.'),
  ('martial_classes', 'TODO(John): fighter, barbarian, monk, and rogue stay disabled until you enable the rows you want at week 6.'),
  ('award_approval', 'TODO(John): award_requires_approval is false, so a log awards immediately. Set it if staff must approve points.')
on conflict (key) do nothing;

revoke all on public.dm_notes from public, anon, authenticated;
revoke all on public.progression_audit from public, anon, authenticated;
grant select, insert, update, delete on public.dm_notes to authenticated;
grant select on public.progression_audit to authenticated;

revoke all on function public.stamp_attendance_loot() from public, anon, authenticated;
revoke all on function public.write_progression_audit(uuid, text, text, text, text) from public, anon, authenticated;
revoke all on function public.advance_milestone(uuid) from public, anon, authenticated;
revoke all on function public.save_table_session(uuid, text, date, uuid, text) from public, anon, authenticated;
revoke all on function public.correct_attendance(uuid, uuid, boolean, boolean) from public, anon, authenticated;

grant execute on function public.write_progression_audit(uuid, text, text, text, text) to current_user;
grant execute on function public.stamp_attendance_loot() to current_user;
grant execute on function public.stamp_attendance_loot() to authenticated;
grant execute on function public.advance_milestone(uuid) to authenticated;
grant execute on function public.save_table_session(uuid, text, date, uuid, text) to authenticated;
grant execute on function public.correct_attendance(uuid, uuid, boolean, boolean) to authenticated;
