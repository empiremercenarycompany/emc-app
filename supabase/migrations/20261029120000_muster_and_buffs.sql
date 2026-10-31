-- Table Muster, temporary buffs, squad size 6, PHB species names, feat labels.
-- No PHB rules text. Permanent ability grants are retired.

update public.scoring_config set squad_max_size = 6 where id = 1;

insert into public.config_notes (key, note) values
  ('squad_max_size', 'Locked 10/28. squad_max_size is 6.'),
  ('after_27', 'After the 27, the DM awards a temporary buff. Permanent ability grants are retired. Mustering Grant can still fill the 27.'),
  ('species', 'PHB 2024 names are allowed. Summaries here are original. Spell and trait text is not stored.')
on conflict (key) do update set note = excluded.note;

-- Species names. Existing SRD rows keep their source. Aasimar is a name plus an original line.
alter table public.content_species drop constraint content_species_source_check;
alter table public.content_species add constraint content_species_source_check
  check (source in ('srd-5.2', 'homebrew', 'phb-2024'));
alter table public.content_species
  add column summary text,
  add column reference_url text;

select set_config('emc.seed', 'on', false);
update public.content_species set
  summary = case id
    when 'human' then 'A widespread people, with no special lineage in this book.'
    when 'elf' then 'A long-lived people, often keen of sense.'
    when 'dwarf' then 'A sturdy people, at home with stone and craft.'
    when 'halfling' then 'A small people, hard to rattle.'
    when 'dragonborn' then 'A people who carry a dragon''s bearing.'
    when 'gnome' then 'A small people drawn to clever work.'
    when 'goliath' then 'A tall people shaped by high, hard country.'
    when 'orc' then 'A people known for drive and stamina.'
    when 'tiefling' then 'A people who carry an unusual lineage.'
    else summary
  end,
  reference_url = 'https://www.dndbeyond.com/sources/dnd/phb-2024/character-origins'
where source = 'srd-5.2';

insert into public.content_species (id, name, source, attribution, summary, reference_url) values
  (
    'aasimar',
    'Aasimar',
    'phb-2024',
    'Name only. Player''s Handbook (2024). No rules text is stored in this repo.',
    'A people touched by a distant, bright lineage.',
    'https://www.dndbeyond.com/sources/dnd/phb-2024/character-origins'
  )
on conflict (id) do nothing;
select set_config('emc.seed', 'off', false);

alter table public.origin_feats
  add column official_name text,
  add column summary text,
  add column reference_url text;

update public.origin_feats set
  official_name = case id
    when 'brawler' then 'Tavern Brawler'
    when 'tough' then 'Tough'
    when 'skilled' then 'Skilled'
    when 'lucky' then 'Lucky'
    when 'magic_initiate' then 'Magic Initiate'
    else official_name
  end,
  summary = case id
    when 'brawler' then 'The Company calls this Brawler. It is the feat for fighting up close and with whatever is at hand.'
    when 'tough' then 'The Company calls this Tough. It is the feat for someone who can take more punishment.'
    when 'skilled' then 'An extra knack, under the same name.'
    when 'lucky' then 'Fortune leans your way, under the same name.'
    else summary
  end,
  reference_url = 'https://www.dndbeyond.com/sources/dnd/phb-2024/character-origins'
where id in ('brawler', 'tough', 'skilled', 'lucky', 'magic_initiate');

-- Temporary buffs. They never change an ability score.
create table public.buff_catalog (
  id text primary key,
  name text not null,
  summary text not null,
  duration text not null check (duration in ('one_use', 'one_session')),
  enabled boolean not null default true,
  reference_url text
);

create table public.character_buffs (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters (id) on delete cascade,
  buff_id text not null references public.buff_catalog (id),
  session_id uuid references public.sessions (id) on delete set null,
  status text not null default 'active' check (status in ('active', 'used', 'expired')),
  note text,
  awarded_by uuid references public.profiles (id),
  awarded_at timestamptz not null default now()
);

alter table public.buff_catalog enable row level security;
alter table public.character_buffs enable row level security;

create policy buff_catalog_select on public.buff_catalog
  for select to authenticated using (true);
create policy buff_catalog_write on public.buff_catalog
  for all to authenticated
  using (public.is_dm() or public.is_admin())
  with check (public.is_dm() or public.is_admin());

create policy character_buffs_select on public.character_buffs
  for select to authenticated
  using (
    public.owns_character(character_id)
    or exists (
      select 1 from public.characters c
      where c.id = character_id and public.is_member(c.guild_id) and public.is_staff()
    )
  );

create index idx_character_buffs_character on public.character_buffs (character_id);
create index idx_character_buffs_session on public.character_buffs (session_id);
create index idx_character_buffs_awarded_by on public.character_buffs (awarded_by);

insert into public.buff_catalog (id, name, summary, duration, reference_url) values
  (
    'heroic_inspiration',
    'Heroic inspiration',
    'A single surge of resolve. Spend it once, then it is gone.',
    'one_use',
    'https://www.dndbeyond.com/sources/dnd/phb-2024/playing-the-game'
  ),
  (
    'damage_plus_two',
    '+2 damage on one attack',
    'The next single attack you land hits harder. Then this ends.',
    'one_use',
    null
  ),
  (
    'advantage_one_check',
    'Advantage on one check',
    'You have an edge on one check during this session. It ends when the session does.',
    'one_session',
    null
  );

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
begin
  if not (public.is_dm() or public.is_admin()) then
    raise exception 'Staff role required';
  end if;
  raise exception 'Permanent grants are retired. Award a buff.';
end;
$$;

create or replace function public.award_buff(
  p_character_id uuid,
  p_buff_id text,
  p_session_id uuid,
  p_note text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guild uuid;
  v_duration text;
  v_id uuid;
begin
  if not (public.is_dm() or public.is_admin()) then
    raise exception 'Staff role required';
  end if;
  if not exists (select 1 from public.buff_catalog where id = p_buff_id and enabled) then
    raise exception 'That buff is not on the menu';
  end if;
  select duration into v_duration from public.buff_catalog where id = p_buff_id;
  select guild_id into v_guild from public.characters where id = p_character_id;
  if v_guild is null or not public.is_member(v_guild) then
    raise exception 'Not your company';
  end if;
  if v_duration = 'one_session' and p_session_id is null then
    raise exception 'A session buff needs a session';
  end if;
  insert into public.character_buffs (character_id, buff_id, session_id, note, awarded_by)
  values (p_character_id, p_buff_id, p_session_id, nullif(btrim(coalesce(p_note, '')), ''), auth.uid())
  returning id into v_id;
  perform public.write_award_audit(p_character_id, 'bonus', null, 0, 'Buff ' || p_buff_id);
  return v_id;
end;
$$;

create or replace function public.use_character_buff(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_duration text;
begin
  select c.user_id, b.duration into v_owner, v_duration
  from public.character_buffs cb
  join public.characters c on c.id = cb.character_id
  join public.buff_catalog b on b.id = cb.buff_id
  where cb.id = p_id and cb.status = 'active';
  if v_owner is null then
    raise exception 'That buff is not active';
  end if;
  if v_owner is distinct from auth.uid() then
    raise exception 'Only the recruit marks a buff used';
  end if;
  if v_duration is distinct from 'one_use' then
    raise exception 'Session buffs end with the session';
  end if;
  update public.character_buffs set status = 'used' where id = p_id;
end;
$$;

create or replace function public.expire_session_buffs(p_session_id uuid)
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
  update public.character_buffs
  set status = 'expired'
  where session_id = p_session_id and status = 'active';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Table Muster. Pending logs only for the gap between the DM's count and logs already in the week.
create table public.table_muster (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  squad_id uuid not null references public.squads (id) on delete cascade,
  character_id uuid not null references public.characters (id) on delete cascade,
  workouts int not null check (workouts >= 0),
  nutrition int not null check (nutrition >= 0),
  mental int not null check (mental >= 0),
  social int not null check (social >= 0),
  recorded_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (session_id, character_id)
);

alter table public.table_muster enable row level security;
create policy table_muster_select on public.table_muster
  for select to authenticated
  using (public.is_staff() and exists (
    select 1 from public.sessions s
    where s.id = session_id and public.is_member(s.guild_id)
  ));

create index idx_table_muster_session on public.table_muster (session_id);
create index idx_table_muster_squad on public.table_muster (squad_id);
create index idx_table_muster_character on public.table_muster (character_id);
create index idx_table_muster_recorded_by on public.table_muster (recorded_by);

create or replace function public.muster_goal(p_character_id uuid, p_category text, p_title text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  select id into v_id
  from public.goals
  where character_id = p_character_id and category = p_category and title = p_title
  limit 1;
  if v_id is null then
    insert into public.goals (character_id, category, title, description)
    values (p_character_id, p_category, p_title, 'Recorded at Table Muster.')
    returning id into v_id;
  end if;
  return v_id;
end;
$$;

create or replace function public.record_table_muster(
  p_session_id uuid,
  p_squad_id uuid,
  p_lines jsonb
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_line jsonb;
  v_character uuid;
  v_guild uuid;
  v_session_guild uuid;
  v_day date;
  v_anchor date;
  v_week date;
  v_end date;
  v_log_date date;
  v_have int;
  v_need int;
  v_goal uuid;
  v_log uuid;
  v_attendance uuid;
  v_score int;
  v_made int := 0;
  i int;
begin
  if not public.is_staff() then
    raise exception 'Staff role required';
  end if;
  select guild_id, coalesce(session_date, public.company_today())
    into v_session_guild, v_day
  from public.sessions where id = p_session_id;
  if v_session_guild is null or not public.is_member(v_session_guild) then
    raise exception 'Session not found';
  end if;
  if not exists (
    select 1 from public.squads where id = p_squad_id and guild_id = v_session_guild
  ) then
    raise exception 'Squad not found';
  end if;

  select cohort_start into v_anchor from public.scoring_config where id = 1;
  if v_day < v_anchor then
    v_week := v_anchor;
  else
    v_week := v_anchor + (((v_day - v_anchor) / 7) * 7);
  end if;
  v_end := v_week + 6;
  v_log_date := least(public.company_today(), v_end);
  if v_log_date < v_week then
    v_log_date := v_week;
  end if;
  if v_log_date > public.company_today() then
    raise exception 'That week has not started';
  end if;

  for v_line in select * from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb)) loop
    v_character := (v_line->>'character_id')::uuid;
    select guild_id into v_guild from public.characters
    where id = v_character and squad_id = p_squad_id;
    if v_guild is distinct from v_session_guild then
      raise exception 'That recruit is not on this squad';
    end if;

    insert into public.table_muster (
      session_id, squad_id, character_id, workouts, nutrition, mental, social, recorded_by
    ) values (
      p_session_id, p_squad_id, v_character,
      coalesce((v_line->>'workouts')::int, 0),
      coalesce((v_line->>'nutrition')::int, 0),
      coalesce((v_line->>'mental')::int, 0),
      coalesce((v_line->>'social')::int, 0),
      auth.uid()
    )
    on conflict (session_id, character_id) do update set
      workouts = excluded.workouts,
      nutrition = excluded.nutrition,
      mental = excluded.mental,
      social = excluded.social,
      recorded_by = excluded.recorded_by;

    select count(*) into v_have from public.workout_logs
    where character_id = v_character and date between v_week and v_end;
    v_need := greatest(coalesce((v_line->>'workouts')::int, 0) - v_have, 0);
    for i in 1..v_need loop
      insert into public.workout_logs (
        character_id, date, type, exercise, is_custom, award_track, status, points_awarded
      ) values (
        v_character, v_log_date, 'muster', 'Table muster', true, 'custom', 'none', 0
      ) returning id into v_log;
      perform set_config('emc.progression_write', 'on', true);
      update public.workout_logs set status = 'pending', bank_pool = 'physical' where id = v_log;
      perform set_config('emc.progression_write', 'off', true);
      v_made := v_made + 1;
    end loop;

    select count(*) into v_have
    from public.goal_logs gl
    join public.goals g on g.id = gl.goal_id
    where gl.character_id = v_character
      and gl.completed_on between v_week and v_end
      and g.category = 'constitution';
    v_need := greatest(coalesce((v_line->>'nutrition')::int, 0) - v_have, 0);
    if v_need > 0 then
      v_goal := public.muster_goal(v_character, 'constitution', 'Nutrition and sleep');
      for i in 1..v_need loop
        insert into public.goal_logs (goal_id, character_id, completed_on, notes, status, points_awarded)
        values (v_goal, v_character, v_log_date, 'Table muster', 'none', 0)
        returning id into v_log;
        perform set_config('emc.progression_write', 'on', true);
        update public.goal_logs set status = 'pending' where id = v_log;
        perform set_config('emc.progression_write', 'off', true);
        v_made := v_made + 1;
      end loop;
    end if;

    select count(*) into v_have
    from public.goal_logs gl
    join public.goals g on g.id = gl.goal_id
    where gl.character_id = v_character
      and gl.completed_on between v_week and v_end
      and g.category in ('intelligence', 'wisdom');
    v_need := greatest(coalesce((v_line->>'mental')::int, 0) - v_have, 0);
    if v_need > 0 then
      v_goal := public.muster_goal(v_character, 'wisdom', 'Mental');
      for i in 1..v_need loop
        insert into public.goal_logs (goal_id, character_id, completed_on, notes, status, points_awarded)
        values (v_goal, v_character, v_log_date, 'Table muster', 'none', 0)
        returning id into v_log;
        perform set_config('emc.progression_write', 'on', true);
        update public.goal_logs set status = 'pending' where id = v_log;
        perform set_config('emc.progression_write', 'off', true);
        v_made := v_made + 1;
      end loop;
    end if;

    select count(*) into v_have
    from public.goal_logs gl
    join public.goals g on g.id = gl.goal_id
    where gl.character_id = v_character
      and gl.completed_on between v_week and v_end
      and g.category = 'charisma';
    v_need := greatest(coalesce((v_line->>'social')::int, 0) - v_have, 0);
    if v_need > 0 then
      v_goal := public.muster_goal(v_character, 'charisma', 'Social');
      for i in 1..v_need loop
        insert into public.goal_logs (goal_id, character_id, completed_on, notes, status, points_awarded)
        values (v_goal, v_character, v_log_date, 'Table muster', 'none', 0)
        returning id into v_log;
        perform set_config('emc.progression_write', 'on', true);
        update public.goal_logs set status = 'pending' where id = v_log;
        perform set_config('emc.progression_write', 'off', true);
        v_made := v_made + 1;
      end loop;
    end if;

    v_attendance := null;
    insert into public.session_attendance (session_id, character_id, award_status)
    values (p_session_id, v_character, 'pending')
    on conflict (session_id, character_id) do nothing
    returning id into v_attendance;
    if v_attendance is not null then
      perform public.write_award_audit(v_character, 'attendance', 'free', 0, 'Table muster attendance');
    end if;

    v_score := public.checkin_score(
      coalesce((v_line->>'workouts')::int, 0),
      coalesce((v_line->>'mental')::int, 0) >= 1,
      coalesce((v_line->>'mental')::int, 0) >= 2,
      coalesce((v_line->>'social')::int, 0) >= 1
    );
    insert into public.weekly_checkins (
      guild_id, character_id, squad_id, week_start, workouts, wis, int_mark, cha, note, score
    ) values (
      v_guild, v_character, p_squad_id, v_week,
      coalesce((v_line->>'workouts')::int, 0),
      coalesce((v_line->>'mental')::int, 0) >= 1,
      coalesce((v_line->>'mental')::int, 0) >= 2,
      coalesce((v_line->>'social')::int, 0) >= 1,
      'Table muster. Nutrition and sleep ' || coalesce(v_line->>'nutrition', '0'),
      v_score
    )
    on conflict (character_id, week_start) do update set
      squad_id = excluded.squad_id,
      workouts = excluded.workouts,
      wis = excluded.wis,
      int_mark = excluded.int_mark,
      cha = excluded.cha,
      note = excluded.note,
      score = excluded.score;
    perform public.write_award_audit(v_character, 'checkin', null, v_score, 'Table muster');
  end loop;

  return v_made;
end;
$$;

create or replace function public.approve_squad_muster(p_session_id uuid, p_squad_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_day date;
  v_anchor date;
  v_week date;
  v_end date;
  v_count int := 0;
begin
  if not public.is_log_approver() then
    raise exception 'Staff role required';
  end if;
  select coalesce(session_date, public.company_today()) into v_day
  from public.sessions where id = p_session_id;
  select cohort_start into v_anchor from public.scoring_config where id = 1;
  if v_day < v_anchor then
    v_week := v_anchor;
  else
    v_week := v_anchor + (((v_day - v_anchor) / 7) * 7);
  end if;
  v_end := v_week + 6;

  for v_id in
    select w.id
    from public.workout_logs w
    join public.characters c on c.id = w.character_id
    where c.squad_id = p_squad_id and w.status = 'pending' and w.date between v_week and v_end
  loop
    perform public.approve_log('workout', v_id);
    v_count := v_count + 1;
  end loop;

  for v_id in
    select gl.id
    from public.goal_logs gl
    join public.characters c on c.id = gl.character_id
    where c.squad_id = p_squad_id and gl.status = 'pending' and gl.completed_on between v_week and v_end
  loop
    perform public.approve_log('goal', v_id);
    v_count := v_count + 1;
  end loop;

  for v_id in
    select a.id
    from public.session_attendance a
    join public.characters c on c.id = a.character_id
    where a.session_id = p_session_id and c.squad_id = p_squad_id and a.award_status = 'pending'
  loop
    perform public.approve_log('checkin', v_id);
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.grant_staff_attribute_points(uuid, int, text, text) from public;
revoke all on function public.award_buff(uuid, text, uuid, text) from public, anon;
revoke all on function public.use_character_buff(uuid) from public, anon;
revoke all on function public.expire_session_buffs(uuid) from public, anon;
revoke all on function public.muster_goal(uuid, text, text) from public, anon, authenticated;
revoke all on function public.record_table_muster(uuid, uuid, jsonb) from public, anon;
revoke all on function public.approve_squad_muster(uuid, uuid) from public, anon;

grant execute on function public.grant_staff_attribute_points(uuid, int, text, text) to authenticated;
grant execute on function public.award_buff(uuid, text, uuid, text) to authenticated;
grant execute on function public.use_character_buff(uuid) to authenticated;
grant execute on function public.expire_session_buffs(uuid) to authenticated;
grant execute on function public.record_table_muster(uuid, uuid, jsonb) to authenticated;
grant execute on function public.approve_squad_muster(uuid, uuid) to authenticated;

revoke all on public.buff_catalog from public, anon;
revoke all on public.character_buffs from public, anon;
revoke all on public.table_muster from public, anon;
grant select, insert, update, delete on public.buff_catalog to authenticated;
grant select on public.character_buffs to authenticated;
grant select on public.table_muster to authenticated;
