-- Role and rules checks. Failures raise. Run only against a disposable database.

insert into auth.users (id, email) values
  ('22222222-2222-4222-8222-222222222221', 'player@example.com'),
  ('22222222-2222-4222-8222-222222222222', 'dm@example.com'),
  ('22222222-2222-4222-8222-222222222223', 'admin@example.com'),
  ('22222222-2222-4222-8222-222222222224', 'curator@example.com'),
  ('22222222-2222-4222-8222-222222222225', 'outsider@example.com');

select set_config('emc.profile_admin', 'on', false);
update public.profiles set app_role = 'dm' where email = 'dm@example.com';
update public.profiles set app_role = 'admin' where email = 'admin@example.com';
update public.profiles set app_role = 'curator' where email = 'curator@example.com';
select set_config('emc.profile_admin', 'off', false);

do $$
declare
  missing text;
begin
  select string_agg(c.relname, ', ' order by c.relname) into missing
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
  if missing is not null then
    raise exception 'RLS disabled on %', missing;
  end if;

  select string_agg(c.relname, ', ' order by c.relname) into missing
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
    and not exists (select 1 from pg_policy p where p.polrelid = c.oid);
  if missing is not null then
    raise exception 'No policies on %', missing;
  end if;

  if has_function_privilege(
    'authenticated',
    'public.award_attribute_points(uuid,text,uuid,date,text)',
    'execute'
  ) then
    raise exception 'authenticated can execute award_attribute_points';
  end if;

  if not has_function_privilege('authenticated', 'public.log_activity(text,jsonb)', 'execute') then
    raise exception 'authenticated cannot execute log_activity';
  end if;

  if has_table_privilege('authenticated', 'public.attribute_point_ledger', 'insert') then
    raise exception 'authenticated can insert the ledger';
  end if;

  if has_column_privilege('authenticated', 'public.characters', 'strength', 'update') then
    raise exception 'authenticated can update strength directly';
  end if;
end $$;

-- Signed out.
select set_config('request.jwt.claim.sub', '', false);
set role anon;
do $$
begin
  perform 1 from public.characters;
  raise exception 'anon read characters';
exception
  when insufficient_privilege then null;
end $$;
do $$
begin
  perform public.create_character('A', 'word', 'Smith', 'smith', 'athletics', 'human', 10, 9, 8, 8, 8, 8);
  raise exception 'anon created a character';
exception
  when insufficient_privilege then null;
end $$;
reset role;

-- Characters.
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222221', false);
set role authenticated;
do $$
begin
  perform public.create_character('Nope', 'Ash', 'Smith', 'smith', 'athletics', 'human', 15, 15, 15, 8, 8, 8);
  raise exception 'invalid array was accepted';
exception
  when others then
    if sqlerrm not ilike '%Invalid starting array%' then raise; end if;
end $$;
do $$
begin
  perform public.create_character('Mara', 'Ash', 'Smith', 'smith', 'athletics', 'human', 10, 9, 8, 8, 8, 8);
end $$;
do $$
begin
  perform public.create_character('Mara', 'Ash', 'Smith', 'smith', 'athletics', 'human', 10, 9, 8, 8, 8, 8);
  raise exception 'second character was accepted';
exception
  when others then
    if sqlerrm not ilike '%already exists%' then raise; end if;
end $$;
do $$
begin
  update public.characters set strength = 18 where user_id = auth.uid();
  raise exception 'direct score write succeeded';
exception
  when insufficient_privilege then null;
  when others then
    if sqlerrm not ilike '%company functions%' then raise; end if;
end $$;
do $$
begin
  insert into public.attribute_point_ledger (character_id, source, points_awarded, pool)
  select id, 'workout', 9, 'physical' from public.characters where user_id = auth.uid();
  raise exception 'direct ledger insert succeeded';
exception
  when insufficient_privilege then null;
end $$;
do $$
begin
  perform public.award_attribute_points(
    (select id from public.characters where user_id = auth.uid()),
    'workout',
    gen_random_uuid(),
    current_date,
    'cheat'
  );
  raise exception 'direct award succeeded';
exception
  when insufficient_privilege then null;
  when others then
    if sqlerrm not ilike '%company functions%' then raise; end if;
end $$;
update public.characters set notes = 'oath' where user_id = auth.uid();
reset role;

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', false);
set role authenticated;
select public.create_character('John', 'Oak', 'Cartographer', 'cartographer', 'perception', 'human', 8, 8, 8, 9, 9, 9);
reset role;

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222223', false);
set role authenticated;
select public.create_character('Ada', 'Elm', 'Cook', 'cook', 'insight', 'dwarf', 9, 8, 8, 8, 8, 10);
reset role;

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222224', false);
set role authenticated;
select public.create_character('Ned', 'Yew', 'Mason', 'mason', 'athletics', 'orc', 8, 10, 9, 8, 8, 8);
reset role;

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222225', false);
set role authenticated;
select public.create_character('Out', 'Ivy', 'Weaver', 'weaver', 'stealth', 'elf', 8, 8, 9, 9, 8, 9);
reset role;

-- Move the placeholder cohort onto today so the award tests have a session.
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', false);
set role authenticated;
select public.set_cohort_start(public.company_today());
reset role;

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222221', false);
set role authenticated;

do $$
declare
  v_awarded int;
  v_id uuid;
  i int;
begin
  for i in 1..4 loop
    v_awarded := (public.log_activity('workout', jsonb_build_object(
      'is_custom', true,
      'type', 'strength',
      'exercise', 'Swing ' || i,
      'sets', 3,
      'reps', 5,
      'client_id', gen_random_uuid()
    ))->>'points_delta')::int;
    if i <= 3 and v_awarded <> 1 then
      raise exception 'workout % awarded %', i, v_awarded;
    end if;
    if i = 4 and v_awarded <> 0 then
      raise exception 'fourth workout should earn 0, got %', v_awarded;
    end if;
  end loop;

  v_id := gen_random_uuid();
  v_awarded := (public.log_activity('workout', jsonb_build_object(
    'is_custom', true, 'type', 'strength', 'exercise', 'Replay', 'client_id', v_id
  ))->>'points_delta')::int;
  if v_awarded <> 0 then
    raise exception 'session was already full';
  end if;
  if (public.log_activity('workout', jsonb_build_object(
    'is_custom', true, 'type', 'strength', 'exercise', 'Replay', 'client_id', v_id
  ))->>'replayed')::boolean is not true then
    raise exception 'client id was not idempotent';
  end if;

  v_awarded := (public.log_activity('workout', jsonb_build_object(
    'is_custom', true,
    'type', 'strength',
    'exercise', 'Old',
    'date', (public.company_today() - 15)::text
  ))->>'points_delta')::int;
  if v_awarded <> 0 then
    raise exception 'old log awarded %', v_awarded;
  end if;
  if not exists (
    select 1 from public.workout_logs
    where exercise = 'Old' and points_awarded = 0
  ) then
    raise exception 'old log was not saved';
  end if;

  begin
    perform public.log_activity('workout', jsonb_build_object(
      'is_custom', true,
      'type', 'strength',
      'exercise', 'Tomorrow',
      'date', (public.company_today() + 1)::text
    ));
    raise exception 'future log was saved';
  exception
    when others then
      if sqlerrm not ilike '%Future%' then raise; end if;
  end;
end $$;

do $$
declare
  v_goal uuid;
  v_awarded int;
  v_pool text;
begin
  insert into public.goals (character_id, category, title, target_frequency)
  select id, 'constitution', 'Sleep', 'nightly'
  from public.characters where user_id = auth.uid()
  returning id into v_goal;

  v_awarded := (public.log_activity('goal', jsonb_build_object('goal_id', v_goal))->>'points_delta')::int;
  v_pool := (
    select pool from public.attribute_point_ledger
    where source = 'goal' and character_id = (select id from public.characters where user_id = auth.uid())
    order by created_at desc
    limit 1
  );
  if v_awarded <> 1 or v_pool <> 'constitution' then
    raise exception 'goal awarded % into %', v_awarded, v_pool;
  end if;
end $$;

do $$
declare
  v_con int;
begin
  select constitution_points into v_con
  from public.characters where user_id = auth.uid();
  if v_con <> 1 then
    raise exception 'constitution pool is %', v_con;
  end if;
end $$;

do $$
declare
  v_id uuid;
  v_physical int;
begin
  select id into v_id from public.characters where user_id = auth.uid();
  perform public.spend_attribute_points(v_id, 11, 9, 8, 8, 8, 8);
  select physical_points into v_physical from public.characters where id = v_id;
  -- 10 to 11 costs 1. Three workout points minus that cost, and the fourth+old earned 0.
  if v_physical <> 2 then
    raise exception 'physical pool after spend is %', v_physical;
  end if;
  begin
    perform public.spend_attribute_points(v_id, 11, 9, 9, 8, 8, 8);
    raise exception 'physical points bought constitution';
  exception
    when others then
      if sqlerrm not ilike '%Constitution%' then raise; end if;
  end;
end $$;

do $$
begin
  perform public.grant_staff_attribute_points(
    (select id from public.characters where user_id = auth.uid()),
    1, 'mental', 'not staff'
  );
  raise exception 'player granted points';
exception
  when others then
    if sqlerrm not ilike '%Staff role%' then raise; end if;
end $$;

do $$
begin
  insert into public.announcements (guild_id, title, body, posted_by)
  values ('11111111-1111-4111-8111-111111111111', 'Secret', 'no', auth.uid());
  raise exception 'player posted an announcement';
exception
  when insufficient_privilege then null;
  when others then
    if sqlerrm ilike '%player posted%' then
      raise;
    end if;
    if sqlerrm not ilike '%row-level%' and sqlerrm not ilike '%permission%' and sqlerrm not ilike '%policy%' and sqlstate <> '42501' then
      raise;
    end if;
end $$;
reset role;

-- Curator grant and exercise. Player cannot write the library.
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222224', false);
set role authenticated;
do $$
declare
  v_points int;
  v_exercise uuid;
begin
  v_points := public.grant_staff_attribute_points(
    (select id from public.characters where user_id = '22222222-2222-4222-8222-222222222221'),
    2, 'mental', 'A special achievement'
  );
  if v_points <> 2 then
    raise exception 'grant returned %', v_points;
  end if;
  v_exercise := public.curator_save_exercise(null, 'Press', 'strength', 'Brace', 'approved');
  if v_exercise is null then
    raise exception 'exercise was not saved';
  end if;
end $$;
reset role;

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222221', false);
set role authenticated;
do $$
begin
  perform public.curator_save_exercise(null, 'Nope', 'strength', null, 'approved');
  raise exception 'player saved an exercise';
exception
  when others then
    if sqlerrm not ilike '%curator%' then raise; end if;
end $$;

do $$
declare
  v_mental int;
begin
  select mental_points into v_mental
  from public.characters where user_id = auth.uid();
  if v_mental <> 2 then
    raise exception 'staff grant did not land, mental is %', v_mental;
  end if;
end $$;
reset role;

-- Library publish rules.
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222223', false);
set role authenticated;
do $$
declare
  v_id uuid;
begin
  insert into public.workout_library (guild_id, title, attribute, tier, components, author_id)
  values (
    '11111111-1111-4111-8111-111111111111',
    'Recruit press',
    'str',
    'recruit',
    array['overhead_press','carry','horizontal_push','horizontal_pull'],
    auth.uid()
  )
  returning id into v_id;

  begin
    update public.workout_library set published = true where id = v_id;
    raise exception 'published without versions or a leg movement';
  exception
    when others then
      if sqlerrm not ilike '%version%' and sqlerrm not ilike '%leg%' then raise; end if;
  end;

  insert into public.workout_versions (workout_id, equipment, instructions)
  values
    (v_id, 'functional', 'Brace and press.'),
    (v_id, 'full_gym', 'Use a bar.'),
    (v_id, 'at_home', 'Use a pack.');

  begin
    update public.workout_library set published = true where id = v_id;
    raise exception 'published a STR drill missing a leg movement';
  exception
    when others then
      if sqlerrm not ilike '%leg%' then raise; end if;
  end;

  update public.workout_library
  set components = array['overhead_press','carry','horizontal_push','horizontal_pull','leg'],
      published = true
  where id = v_id;
end $$;
reset role;

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222221', false);
set role authenticated;
do $$
declare
  v_count int;
  v_hidden int;
begin
  select count(*) into v_count from public.workout_library where published;
  if v_count <> 1 then
    raise exception 'player should see the published drill, saw %', v_count;
  end if;

  insert into public.workout_library (guild_id, title, attribute, tier, author_id, published)
  values ('11111111-1111-4111-8111-111111111111', 'Hidden', 'dex', 'recruit', '22222222-2222-4222-8222-222222222223', false);

  select count(*) into v_hidden from public.workout_library where title = 'Hidden';
  -- The insert is the admin's row, but this session is the player, so the insert itself should fail.
  raise exception 'player inserted a drill';
exception
  when insufficient_privilege then null;
  when others then
    if sqlerrm not ilike '%Library editors%' and sqlerrm not ilike '%row-level%' and sqlerrm not ilike '%policy%' then
      if sqlstate <> '42501' then raise; end if;
    end if;
end $$;
reset role;

-- DM notes stay with the DM. Admin and player cannot read them.
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', false);
set role authenticated;
insert into public.campaign_notes (guild_id, title, body, visibility, created_by)
values (
  '11111111-1111-4111-8111-111111111111',
  'Table only',
  'private',
  'dm',
  '22222222-2222-4222-8222-222222222222'
);
insert into public.campaign_notes (guild_id, title, body, visibility, created_by)
values (
  '11111111-1111-4111-8111-111111111111',
  'Company',
  'shared',
  'members',
  '22222222-2222-4222-8222-222222222222'
);
insert into public.sessions (guild_id, title, scheduled_at)
values (
  '11111111-1111-4111-8111-111111111111',
  'Next table',
  now() + interval '2 days'
);
reset role;

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222221', false);
set role authenticated;
do $$
declare
  v_dm int;
  v_shared int;
begin
  select count(*) into v_dm from public.campaign_notes where visibility = 'dm';
  select count(*) into v_shared from public.campaign_notes where visibility = 'members';
  if v_dm <> 0 then
    raise exception 'player read a DM note';
  end if;
  if v_shared <> 1 then
    raise exception 'player missed the company note';
  end if;
end $$;
select public.log_activity('checkin', jsonb_build_object(
  'session_id', (select id from public.sessions where title = 'Next table')
));
do $$
declare
  v_count int;
begin
  select count(*) into v_count from public.session_attendance;
  if v_count <> 1 then
    raise exception 'check-in was not recorded';
  end if;
end $$;
reset role;

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222223', false);
set role authenticated;
do $$
declare
  v_dm int;
begin
  select count(*) into v_dm from public.campaign_notes where visibility = 'dm';
  if v_dm <> 0 then
    raise exception 'admin read a DM note';
  end if;
end $$;
reset role;

-- Squad cap comes from config.
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', false);
set role authenticated;
select public.update_scoring_config('{"squad_max_size": 1}'::jsonb);
select public.create_squad('First', 1);
select public.assign_squad(
  (select id from public.characters where user_id = '22222222-2222-4222-8222-222222222221'),
  (select id from public.squads where name = 'First')
);
do $$
begin
  perform public.assign_squad(
    (select id from public.characters where user_id = '22222222-2222-4222-8222-222222222222'),
    (select id from public.squads where name = 'First')
  );
  raise exception 'squad accepted a second member';
exception
  when others then
    if sqlerrm not ilike '%full%' then raise; end if;
end $$;
select public.post_squad_challenge(
  (select id from public.squads where name = 'First'),
  'Carry',
  'A squad challenge',
  '[{"title":"Loads","target_value":4,"unit":"loads"}]'::jsonb
);
select public.update_scoring_config('{"squad_max_size": 6}'::jsonb);
reset role;

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222221', false);
set role authenticated;
select public.log_objective_progress(
  (select o.id from public.objectives o join public.missions m on m.id = o.mission_id where m.title = 'Carry'),
  1,
  null
);
do $$
declare
  v_current int;
begin
  select current_value into v_current
  from public.objectives o
  join public.missions m on m.id = o.mission_id
  where m.title = 'Carry';
  if v_current <> 1 then
    raise exception 'squad progress is %', v_current;
  end if;
  begin
    update public.objectives set current_value = 99
    where id = (
      select o.id from public.objectives o
      join public.missions m on m.id = o.mission_id
      where m.title = 'Carry'
    );
    raise exception 'player wrote objective progress directly';
  exception
    when insufficient_privilege then null;
    when others then
      if sqlerrm not ilike '%Objective progress%' and sqlstate <> '42501' then raise; end if;
  end;
end $$;
reset role;

-- Outsider loses the company and cannot read another character.
delete from public.guild_memberships where user_id = '22222222-2222-4222-8222-222222222225';
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222225', false);
set role authenticated;
do $$
declare
  v_others int;
begin
  select count(*) into v_others
  from public.characters
  where user_id <> auth.uid();
  if v_others <> 0 then
    raise exception 'outsider read % other characters', v_others;
  end if;
end $$;
reset role;

-- Fellow members can read display names. The player can see the DM.
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222221', false);
set role authenticated;
do $$
declare
  v_name text;
begin
  select display_name into v_name from public.profiles where email = 'dm@example.com';
  if v_name is null then
    raise exception 'squad roster cannot see a fellow profile';
  end if;
end $$;
reset role;

-- Off-week: a published window that excludes today earns 0, and a later window still can.
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', false);
set role authenticated;
select public.set_cohort_session(1, public.company_today() - 10, public.company_today() - 1);
do $$
declare
  v_awarded int;
begin
  -- Use the curator's character so the player's full session cap is not the reason.
  perform set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222224', false);
  v_awarded := (public.log_activity('workout', jsonb_build_object(
    'is_custom', true, 'type', 'strength', 'exercise', 'Off week'
  ))->>'points_delta')::int;
  if v_awarded <> 0 then
    raise exception 'off-week awarded %', v_awarded;
  end if;
end $$;
select public.clear_cohort_sessions();
reset role;
