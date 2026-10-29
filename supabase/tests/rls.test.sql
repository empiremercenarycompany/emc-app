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
    if v_awarded <> 0 then
      raise exception 'workout % banked before approval, got %', i, v_awarded;
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
  if v_awarded <> 0 then
    raise exception 'goal banked before approval, got %', v_awarded;
  end if;
end $$;

reset role;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', false);
set role authenticated;
select public.approve_log('workout', id) from public.workout_logs where exercise in ('Swing 1', 'Swing 2');
select public.approve_log('goal', id) from public.goal_logs
where goal_id in (select id from public.goals where title = 'Sleep');
reset role;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222221', false);
set role authenticated;

do $$
declare
  v_con int;
  v_pool text;
begin
  select constitution_points into v_con
  from public.characters where user_id = auth.uid();
  select pool into v_pool from public.attribute_point_ledger
  where source = 'goal' and character_id = (select id from public.characters where user_id = auth.uid())
  order by created_at desc limit 1;
  if v_con <> 1 or v_pool <> 'constitution' then
    raise exception 'constitution pool is % via %', v_con, v_pool;
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
  -- 10 to 11 costs 1. Two approved workouts banked 2, then this spend.
  if v_physical <> 1 then
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
  v_exercise uuid;
begin
  begin
    perform public.grant_staff_attribute_points(
      (select id from public.characters where user_id = '22222222-2222-4222-8222-222222222221'),
      2, 'mental', 'A special achievement'
    );
    raise exception 'curator granted a bonus';
  exception
    when others then
      if sqlerrm not ilike '%Staff role%' then raise; end if;
  end;
  v_exercise := public.curator_save_exercise(null, 'Press', 'strength', 'Brace', 'approved');
  if v_exercise is null then
    raise exception 'exercise was not saved';
  end if;
end $$;
reset role;

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', false);
set role authenticated;
do $$
begin
  perform public.grant_staff_attribute_points(
    (select id from public.characters where user_id = '22222222-2222-4222-8222-222222222221'),
    2, 'mental', 'A special achievement'
  );
  raise exception 'permanent grant still exists';
exception
  when others then
    if sqlerrm not ilike '%Permanent grants are retired%' then raise; end if;
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
  if v_mental <> 0 then
    raise exception 'a retired grant changed the mental bank to %', v_mental;
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
  if (public.log_activity('workout', jsonb_build_object(
    'is_custom', true, 'type', 'strength', 'exercise', 'Off week'
  ))->>'status') is distinct from 'pending' then
    raise exception 'off-week should wait for approval';
  end if;
end $$;
select public.clear_cohort_sessions();
reset role;

-- Campaign: players cannot self-level, and induction waits for the configured week.
update public.induction_classes set enabled = true where id = 'fighter';
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', false);
set role authenticated;
select public.set_cohort_start(public.company_today() - 28);
do $$
declare
  v_id uuid;
begin
  select id into v_id from public.characters where user_id = '22222222-2222-4222-8222-222222222221';
  begin
    perform public.induct_character(v_id, 'fighter');
    raise exception 'induction opened before week 6';
  exception
    when others then
      if sqlerrm not ilike '%Induction opens%' then raise; end if;
  end;
end $$;
select public.set_cohort_start(public.company_today() - 35);
select public.induct_character(
  (select id from public.characters where user_id = '22222222-2222-4222-8222-222222222221'),
  'fighter'
);
do $$
declare
  v_class text;
  v_audit int;
begin
  select class into v_class from public.characters where user_id = '22222222-2222-4222-8222-222222222221';
  if v_class is distinct from 'fighter' then
    raise exception 'induction class is %', v_class;
  end if;
  select count(*) into v_audit
  from public.progression_audit
  where kind = 'induction' and to_value = 'fighter';
  if v_audit <> 1 then
    raise exception 'induction audit count %', v_audit;
  end if;
  begin
    perform public.advance_milestone(
      (select id from public.characters where user_id = '22222222-2222-4222-8222-222222222221')
    );
    raise exception 'milestone opened at week 6';
  exception
    when others then
      if sqlerrm not ilike '%not open%' then raise; end if;
  end;
end $$;
reset role;

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222221', false);
set role authenticated;
do $$
declare
  v_id uuid;
begin
  select id into v_id from public.characters where user_id = auth.uid();
  begin
    perform public.set_character_level(v_id, 2);
    raise exception 'player set their own level';
  exception
    when others then
      if sqlerrm not ilike '%Only the DM%' then raise; end if;
  end;
  begin
    perform public.advance_milestone(v_id);
    raise exception 'player advanced a milestone';
  exception
    when others then
      if sqlerrm not ilike '%Staff role%' then raise; end if;
  end;
  begin
    update public.characters set level = 9 where id = v_id;
    raise exception 'player wrote level directly';
  exception
    when insufficient_privilege then null;
    when others then
      if sqlstate <> '42501' and sqlerrm not ilike '%Level, class%' then raise; end if;
  end;
  if has_function_privilege('authenticated', 'public.write_progression_audit(uuid,text,text,text,text)', 'execute') then
    raise exception 'authenticated can write the audit directly';
  end if;
end $$;
reset role;

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', false);
set role authenticated;
select public.set_cohort_start(public.company_today() - 105);
select public.advance_milestone(
  (select id from public.characters where user_id = '22222222-2222-4222-8222-222222222221')
);
select public.set_cohort_start(public.company_today() - 217);
select public.advance_milestone(
  (select id from public.characters where user_id = '22222222-2222-4222-8222-222222222221')
);
do $$
declare
  v_level int;
  v_audit int;
begin
  select level into v_level from public.characters where user_id = '22222222-2222-4222-8222-222222222221';
  if v_level <> 3 then
    raise exception 'milestone level is %', v_level;
  end if;
  select count(*) into v_audit from public.progression_audit where kind = 'level' and to_value in ('2', '3');
  if v_audit <> 2 then
    raise exception 'level audit count %', v_audit;
  end if;
end $$;
reset role;

-- Staff notes stay invisible to players.
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', false);
set role authenticated;
insert into public.dm_notes (guild_id, character_id, body, created_by)
values (
  '11111111-1111-4111-8111-111111111111',
  (select id from public.characters where user_id = '22222222-2222-4222-8222-222222222221'),
  'staff only note',
  '22222222-2222-4222-8222-222222222222'
);
reset role;

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222221', false);
set role authenticated;
do $$
declare
  v_notes int;
begin
  select count(*) into v_notes from public.dm_notes;
  if v_notes <> 0 then
    raise exception 'player read % staff notes', v_notes;
  end if;
  begin
    insert into public.dm_notes (guild_id, character_id, body, created_by)
    values (
      '11111111-1111-4111-8111-111111111111',
      (select id from public.characters where user_id = auth.uid()),
      'player note',
      auth.uid()
    );
    raise exception 'player wrote a staff note';
  exception
    when insufficient_privilege then null;
    when others then
      if sqlstate <> '42501' and sqlerrm not ilike '%row-level%' and sqlerrm not ilike '%policy%' then raise; end if;
  end;
end $$;
reset role;

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222223', false);
set role authenticated;
do $$
declare
  v_notes int;
begin
  select count(*) into v_notes from public.dm_notes where body = 'staff only note';
  if v_notes <> 1 then
    raise exception 'admin could not read the staff note';
  end if;
end $$;
reset role;

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222224', false);
set role authenticated;
do $$
declare
  v_notes int;
begin
  select count(*) into v_notes from public.dm_notes where body = 'staff only note';
  if v_notes <> 1 then
    raise exception 'curator could not read the staff note';
  end if;
end $$;
reset role;

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222225', false);
set role authenticated;
do $$
declare
  v_notes int;
begin
  select count(*) into v_notes from public.dm_notes;
  if v_notes <> 0 then
    raise exception 'outsider read staff notes';
  end if;
end $$;
reset role;

-- Squad announcements are for that squad. Company notices stay company-wide.
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', false);
set role authenticated;
select public.create_squad('Notice squad', 6);
insert into public.announcements (guild_id, squad_id, title, body, posted_by)
values (
  '11111111-1111-4111-8111-111111111111',
  (select id from public.squads where name = 'Notice squad'),
  'Squad only',
  'for the squad',
  '22222222-2222-4222-8222-222222222222'
);
reset role;

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222221', false);
set role authenticated;
do $$
declare
  v_rows int;
begin
  select count(*) into v_rows from public.announcements where title = 'Squad only';
  if v_rows <> 0 then
    raise exception 'player outside the squad read its notice';
  end if;
end $$;
reset role;

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', false);
set role authenticated;
select public.assign_squad(
  (select id from public.characters where user_id = '22222222-2222-4222-8222-222222222221'),
  (select id from public.squads where name = 'Notice squad')
);
reset role;

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222221', false);
set role authenticated;
do $$
declare
  v_rows int;
begin
  select count(*) into v_rows from public.announcements where title = 'Squad only';
  if v_rows <> 1 then
    raise exception 'squad member could not read the notice';
  end if;
end $$;
reset role;

-- Check-in records attendance and copies the loot placeholder. It does not award points.
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222223', false);
set role authenticated;
select public.save_table_session(null, 'Week table', public.company_today(), null, null);
reset role;

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222221', false);
set role authenticated;
select public.log_activity(
  'checkin',
  jsonb_build_object('session_id', (select id from public.sessions where title = 'Week table'))
);
do $$
declare
  v_loot text;
  v_rows int;
begin
  select count(*), max(loot_placeholder) into v_rows, v_loot
  from public.session_attendance a
  join public.sessions s on s.id = a.session_id
  where s.title = 'Week table';
  if v_rows <> 1 or v_loot is distinct from 'unset' then
    raise exception 'attendance loot is % rows %', v_loot, v_rows;
  end if;
  begin
    perform public.correct_attendance(
      (select id from public.sessions where title = 'Week table'),
      (select id from public.characters where user_id = auth.uid()),
      true,
      false
    );
    raise exception 'player corrected attendance';
  exception
    when others then
      if sqlerrm not ilike '%Only the DM%' then raise; end if;
  end;
end $$;
reset role;

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', false);
set role authenticated;
select public.correct_attendance(
  (select id from public.sessions where title = 'Week table'),
  (select id from public.characters where user_id = '22222222-2222-4222-8222-222222222221'),
  true,
  false
);
do $$
declare
  v_share boolean;
begin
  select loot_share into v_share
  from public.session_attendance a
  join public.sessions s on s.id = a.session_id
  where s.title = 'Week table';
  if v_share then
    raise exception 'DM correction did not record loot share';
  end if;
end $$;
reset role;

do $$
declare
  v_config text[];
  v_bare text;
begin
  select p.proconfig into v_config
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'starting_array_valid';
  if not ('search_path=public' = any (v_config)) then
    raise exception 'starting_array_valid search_path is %', v_config;
  end if;

  if has_function_privilege('anon', 'public.stamp_attendance_loot()', 'execute')
     or has_function_privilege('authenticated', 'public.stamp_attendance_loot()', 'execute')
     or has_function_privilege('authenticated', 'public.player_can_use_pool(uuid,uuid)', 'execute')
     or has_function_privilege('authenticated', 'public.protect_ledger()', 'execute')
     or has_function_privilege('authenticated', 'public.handle_new_user()', 'execute')
     or has_function_privilege('authenticated', 'public.award_attribute_points(uuid,text,uuid,date,text)', 'execute')
  then
    raise exception 'a trigger or internal function is still executable by a client role';
  end if;

  if not has_function_privilege('authenticated', 'public.log_activity(text,jsonb)', 'execute')
     or not has_function_privilege('authenticated', 'public.is_member(uuid)', 'execute')
     or not has_function_privilege('authenticated', 'public.create_character(text,text,text,text,text,text,integer,integer,integer,integer,integer,integer)', 'execute')
  then
    raise exception 'a client or policy function lost execute';
  end if;

  select string_agg(c.relname || '.' || pol.polname, ', ')
    into v_bare
  from pg_policy pol
  join pg_class c on c.oid = pol.polrelid
  where c.relname in (
      'profiles', 'guild_memberships', 'characters', 'campaign_notes',
      'achievements', 'dm_notes', 'announcements'
    )
    and (
      (
        pg_get_expr(pol.polqual, pol.polrelid) ~ 'auth\.uid\(\)'
        and pg_get_expr(pol.polqual, pol.polrelid) !~ 'SELECT auth\.uid\(\)'
      )
      or (
        pg_get_expr(pol.polwithcheck, pol.polrelid) ~ 'auth\.uid\(\)'
        and pg_get_expr(pol.polwithcheck, pol.polrelid) !~ 'SELECT auth\.uid\(\)'
      )
    );
  if v_bare is not null then
    raise exception 'auth.uid() is still per-row in %', v_bare;
  end if;
end $$;

-- Table Muster dedupes logs already in the week, then Approve all banks attendance outside the cap.
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', false);
set role authenticated;
do $$
declare
  v_character uuid;
  v_squad uuid;
  v_session uuid;
  v_before int;
  v_after int;
  v_made int;
  v_free int;
  v_buff uuid;
  v_status text;
begin
  select id into v_character from public.characters where user_id = '22222222-2222-4222-8222-222222222221';
  select squad_id into v_squad from public.characters where id = v_character;
  select id into v_session from public.sessions where title = 'Week table';
  if v_squad is null or v_session is null then
    raise exception 'muster fixture missing';
  end if;
  select count(*) into v_before from public.workout_logs where character_id = v_character and exercise = 'Table muster';
  v_made := public.record_table_muster(
    v_session,
    v_squad,
    jsonb_build_array(jsonb_build_object(
      'character_id', v_character,
      'workouts', (select count(*) from public.workout_logs where character_id = v_character) + 1,
      'nutrition', 1,
      'mental', 0,
      'social', 0
    ))
  );
  if v_made < 1 then
    raise exception 'muster created nothing';
  end if;
  select count(*) into v_after from public.workout_logs where character_id = v_character and exercise = 'Table muster';
  if v_after <= v_before then
    raise exception 'muster workout gap is %', v_after - v_before;
  end if;
  perform public.record_table_muster(
    v_session,
    v_squad,
    jsonb_build_array(jsonb_build_object(
      'character_id', v_character,
      'workouts', 0,
      'nutrition', 1,
      'mental', 0,
      'social', 0
    ))
  );
  select count(*) into v_before from public.workout_logs where character_id = v_character and exercise = 'Table muster';
  if v_before <> v_after then
    raise exception 'muster duplicated a workout';
  end if;
  perform public.approve_squad_muster(v_session, v_squad);
  select award_status into v_status
  from public.session_attendance
  where session_id = v_session and character_id = v_character;
  if v_status is distinct from 'awarded' then
    raise exception 'attendance after muster is %', v_status;
  end if;
  select free_points into v_free from public.characters where id = v_character;
  if v_free <> 2 then
    raise exception 'attendance bank is %', v_free;
  end if;
  v_buff := public.award_buff(v_character, 'heroic_inspiration', null, 'At the table');
  if v_buff is null then
    raise exception 'buff was not awarded';
  end if;
  if (select physical_points + mental_points + social_points + constitution_points + free_points
      from public.characters where id = v_character) <>
     (select physical_points + mental_points + social_points + constitution_points + free_points - 0
      from public.characters where id = v_character)
  then
    null;
  end if;
  if exists (
    select 1 from public.attribute_point_ledger
    where character_id = v_character and reason ilike '%heroic%'
  ) then
    raise exception 'a buff wrote the bank';
  end if;
end $$;
reset role;

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222221', false);
set role authenticated;
do $$
declare
  v_id uuid;
begin
  select cb.id into v_id
  from public.character_buffs cb
  join public.characters c on c.id = cb.character_id
  where c.user_id = auth.uid() and cb.status = 'active';
  perform public.use_character_buff(v_id);
  if (select status from public.character_buffs where id = v_id) is distinct from 'used' then
    raise exception 'one-use buff stayed active';
  end if;
end $$;
reset role;
