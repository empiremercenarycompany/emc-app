-- Intake and the company clock. Run after the role fixtures exist.

do $$
declare
  v_tz text;
  v_check text;
  v_rls boolean;
  v_config text[];
begin
  select time_zone, checkin_time_zone into v_tz, v_check from public.scoring_config where id = 1;
  if v_tz <> 'America/Denver' or v_check <> 'America/Denver' then
    raise exception 'company zone is % / %', v_tz, v_check;
  end if;
  if exists (select 1 from public.session_timeslots where time_zone is distinct from 'America/Denver') then
    raise exception 'a timeslot is not on company time';
  end if;
  select c.relrowsecurity into v_rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'player_intake';
  if v_rls is distinct from true then
    raise exception 'player_intake is missing row security';
  end if;
  select p.proconfig into v_config
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'save_player_intake';
  if not ('search_path=public' = any (v_config)) then
    raise exception 'save_player_intake search_path is %', v_config;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'player_intake'
      and column_name in ('injury', 'injuries', 'medical', 'emergency_contact')
  ) then
    raise exception 'intake collected a field that is not decided';
  end if;
  if (
    select count(*)
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'player_intake'
      and column_name in ('phone', 'species_idea', 'class_idea', 'backstory_idea', 'fitness_experience')
      and is_nullable = 'YES'
  ) <> 5 then
    raise exception 'enlist columns are missing or required';
  end if;
  if (
    select count(*)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'save_player_intake'
  ) <> 1 then
    raise exception 'save_player_intake should stay one function';
  end if;
  if has_function_privilege(
    'anon',
    'public.save_player_intake(text,text,text[],text,boolean,text,text,text,text,text,text)',
    'execute'
  ) then
    raise exception 'anon can save intake';
  end if;
  if not has_function_privilege(
    'authenticated',
    'public.save_player_intake(text,text,text[],text,boolean,text,text,text,text,text,text)',
    'execute'
  ) then
    raise exception 'authenticated cannot save intake';
  end if;
  if has_table_privilege('authenticated', 'public.player_intake', 'insert')
     or has_table_privilege('authenticated', 'public.player_intake', 'update') then
    raise exception 'authenticated can write player_intake directly';
  end if;
end $$;

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222221', false);
set role authenticated;

do $$
begin
  begin
    perform public.save_player_intake('never', 'new', array[]::text[], 'morning', false);
    raise exception 'empty goals were accepted';
  exception
    when others then
      if sqlerrm ilike '%empty goals were accepted%' then raise; end if;
      if sqlerrm not ilike '%first goal%' then raise; end if;
  end;

  begin
    perform public.approve_squad_muster(
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000002'
    );
    raise exception 'player approved a squad';
  exception
    when others then
      if sqlerrm ilike '%player approved a squad%' then raise; end if;
  end;

  begin
    perform public.finalize_squad_build('00000000-0000-4000-8000-000000000002');
    raise exception 'player finalized a squad';
  exception
    when others then
      if sqlerrm ilike '%player finalized a squad%' then raise; end if;
  end;

  begin
    perform public.return_character_npc('00000000-0000-4000-8000-000000000003', 'change it');
    raise exception 'player sent a note back';
  exception
    when others then
      if sqlerrm ilike '%player sent a note back%' then raise; end if;
  end;
end $$;

select public.save_player_intake('never', 'new', array['Sleep 7 hours'], 'morning', true);

do $$
declare
  v_dnd text;
  v_goals text[];
  v_reminders boolean;
begin
  select dnd_experience, first_goals, session_reminders
    into v_dnd, v_goals, v_reminders
  from public.player_intake
  where user_id = auth.uid();
  if v_dnd is distinct from 'never' or v_reminders is distinct from true or not ('Sleep 7 hours' = any (v_goals)) then
    raise exception 'intake was not stored';
  end if;
end $$;

select public.save_player_intake(
  'a_few',
  'some',
  array['Read 20 min'],
  'afternoon',
  false,
  '208-555-0100',
  'human',
  'fighter',
  'Raised near the docks.',
  'Walks most days'
);

select public.save_player_intake('lots', 'regular', array['Call a friend'], 'evening', true);

do $$
declare
  v_phone text;
  v_species text;
  v_class text;
  v_backstory text;
  v_fitness text;
  v_dnd text;
begin
  select phone, species_idea, class_idea, backstory_idea, fitness_experience, dnd_experience
    into v_phone, v_species, v_class, v_backstory, v_fitness, v_dnd
  from public.player_intake
  where user_id = auth.uid();
  if v_dnd is distinct from 'lots'
     or v_phone is distinct from '208-555-0100'
     or v_species is distinct from 'human'
     or v_class is distinct from 'fighter'
     or v_backstory is distinct from 'Raised near the docks.'
     or v_fitness is distinct from 'Walks most days' then
    raise exception 'a five-argument save wiped enlist details';
  end if;
end $$;

do $$
begin
  perform public.save_player_intake(
    'lots', 'regular', array['Call a friend'], 'evening', true,
    repeat('1', 41), null, null, null, null
  );
  raise exception 'long phone was accepted';
exception
  when others then
    if sqlerrm ilike '%long phone was accepted%' then raise; end if;
    if sqlerrm not ilike '%phone number%' then raise; end if;
end $$;

do $$
begin
  update public.player_intake set phone = 'changed' where user_id = auth.uid();
  raise exception 'player updated intake directly';
exception
  when insufficient_privilege then null;
end $$;

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222225', false);

do $$
declare
  v_seen int;
begin
  select count(*) into v_seen
  from public.player_intake
  where user_id = '22222222-2222-4222-8222-222222222221';
  if v_seen <> 0 then
    raise exception 'another player read enlist details';
  end if;
end $$;

select public.save_player_intake(
  'never', 'new', array['Sleep 7 hours'], 'morning', false,
  '208-555-0199', 'elf', 'rogue', 'A different story.', 'New to the yard'
);

do $$
declare
  v_phone text;
begin
  select phone into v_phone
  from public.player_intake
  where user_id = '22222222-2222-4222-8222-222222222221';
  if v_phone is not null then
    raise exception 'another player changed enlist details';
  end if;
  select phone into v_phone from public.player_intake where user_id = auth.uid();
  if v_phone is distinct from '208-555-0199' then
    raise exception 'the second recruit did not store a phone';
  end if;
end $$;

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', false);

do $$
declare
  v_seen int;
  v_phone text;
begin
  select count(*) into v_seen
  from public.player_intake
  where user_id in (
    '22222222-2222-4222-8222-222222222221',
    '22222222-2222-4222-8222-222222222225'
  );
  if v_seen <> 2 then
    raise exception 'staff could not read enlist details';
  end if;
  select phone into v_phone
  from public.player_intake
  where user_id = '22222222-2222-4222-8222-222222222221';
  if v_phone is distinct from '208-555-0100' then
    raise exception 'another player changed enlist details';
  end if;
end $$;

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222221', false);

select public.save_player_intake(
  'lots', 'regular', array['Call a friend'], 'evening', true,
  '', '', '', '', ''
);

do $$
declare
  v_phone text;
  v_backstory text;
begin
  select phone, backstory_idea into v_phone, v_backstory
  from public.player_intake
  where user_id = auth.uid();
  if v_phone is not null or v_backstory is not null then
    raise exception 'a blank enlist field did not clear';
  end if;
end $$;

do $$
begin
  perform public.save_player_intake(
    'lots', 'regular', array['Call a friend'], 'evening', true,
    null, null, null, null, null, '16_17'
  );
  raise exception 'a 16 year old took the evening slot';
exception
  when others then
    if sqlerrm ilike '%evening slot%' then raise; end if;
    if sqlerrm not ilike '%18+%' then raise; end if;
end $$;

select public.save_player_intake(
  'lots', 'regular', array['Call a friend'], null, false,
  null, null, null, null, null, 'under_16'
);

do $$
declare
  v_slot text;
  v_wait boolean;
  v_age text;
begin
  select timeslot_id, teen_waitlist, age_band
    into v_slot, v_wait, v_age
  from public.player_intake
  where user_id = auth.uid();
  if v_slot is not null or v_wait is distinct from true or v_age is distinct from 'under_16' then
    raise exception 'under 16 did not join the teen waitlist';
  end if;
end $$;

select public.save_player_intake(
  'lots', 'regular', array['Call a friend'], 'evening', true,
  null, null, null, null, null, '18_plus'
);

do $$
declare
  v_slot text;
  v_wait boolean;
begin
  select timeslot_id, teen_waitlist into v_slot, v_wait
  from public.player_intake
  where user_id = auth.uid();
  if v_slot is distinct from 'evening' or v_wait is distinct from false then
    raise exception '18+ could not keep the evening slot';
  end if;
end $$;

reset role;
