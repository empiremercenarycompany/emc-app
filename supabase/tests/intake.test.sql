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

reset role;
