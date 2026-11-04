-- Owner delete, duplicate titles, and player feedback. Disposable database only.
-- No real recruit names.

insert into auth.users (id, email) values
  ('55555555-5555-4555-8555-555555555551', 'owner@example.test'),
  ('55555555-5555-4555-8555-555555555556', 'staff@example.test'),
  ('55555555-5555-4555-8555-555555555557', 'other@example.test');

select set_config('emc.profile_admin', 'on', false);
update public.profiles set app_role = 'dm' where id = '55555555-5555-4555-8555-555555555556';
select set_config('emc.profile_admin', 'off', false);

begin;
select set_config('emc.character_create', 'on', true);
insert into public.characters (id, user_id, guild_id, name)
values (
  '55555555-5555-4555-8555-555555555552',
  '55555555-5555-4555-8555-555555555551',
  '11111111-1111-4111-8111-111111111111',
  'Owner Recruit'
);
commit;

insert into public.goals (id, character_id, category, title)
values
  ('55555555-5555-4555-8555-555555555553', '55555555-5555-4555-8555-555555555552', 'charisma', 'Talk to someone'),
  ('55555555-5555-4555-8555-555555555554', '55555555-5555-4555-8555-555555555552', 'charisma', 'Awarded goal'),
  ('55555555-5555-4555-8555-555555555555', '55555555-5555-4555-8555-555555555552', 'wisdom', 'Recorded goal'),
  ('55555555-5555-4555-8555-555555555558', '55555555-5555-4555-8555-555555555552', 'intelligence', 'Ready goal'),
  ('55555555-5555-4555-8555-555555555559', '55555555-5555-4555-8555-555555555552', 'constitution', 'Open goal');

do $$
begin
  insert into public.goals (character_id, category, title)
  values ('55555555-5555-4555-8555-555555555552', 'charisma', '  TALK   to someone ');
  raise exception 'duplicate title was stored';
exception
  when others then
    if sqlerrm not ilike '%already have that goal%' then raise; end if;
end $$;

insert into public.goals (character_id, category, title)
values ('55555555-5555-4555-8555-555555555552', 'wisdom', 'Talk to someone');

do $$
begin
  perform set_config('emc.progression_write', 'on', true);
  insert into public.goal_logs (goal_id, character_id, completed_on, status, points_awarded)
  values (
    '55555555-5555-4555-8555-555555555554',
    '55555555-5555-4555-8555-555555555552',
    public.company_today(),
    'awarded',
    1
  );
end $$;

insert into public.goal_rewards (goal_id, character_id, status, buff_id, story_reward, recorded_by)
values (
  '55555555-5555-4555-8555-555555555555',
  '55555555-5555-4555-8555-555555555552',
  'recorded',
  'heroic_inspiration',
  'A story for the test.',
  '55555555-5555-4555-8555-555555555556'
);

insert into public.goal_rewards (goal_id, character_id, status)
values (
  '55555555-5555-4555-8555-555555555558',
  '55555555-5555-4555-8555-555555555552',
  'ready'
);

select set_config('request.jwt.claim.sub', '55555555-5555-4555-8555-555555555551', false);
set role authenticated;

delete from public.goals where id = '55555555-5555-4555-8555-555555555559';
delete from public.goals where id = '55555555-5555-4555-8555-555555555558';
delete from public.goals where id = '55555555-5555-4555-8555-555555555554';
delete from public.goals where id = '55555555-5555-4555-8555-555555555555';

reset role;

do $$
declare
  v_open int;
  v_ready int;
  v_awarded int;
  v_recorded int;
begin
  select count(*) into v_open from public.goals where id = '55555555-5555-4555-8555-555555555559';
  select count(*) into v_ready from public.goals where id = '55555555-5555-4555-8555-555555555558';
  select count(*) into v_awarded from public.goals where id = '55555555-5555-4555-8555-555555555554';
  select count(*) into v_recorded from public.goals where id = '55555555-5555-4555-8555-555555555555';
  if v_open <> 0 or v_ready <> 0 then
    raise exception 'owner should remove an open goal and a ready reward, open % ready %', v_open, v_ready;
  end if;
  if v_awarded <> 1 or v_recorded <> 1 then
    raise exception 'owner should keep awarded and recorded goals, awarded % recorded %', v_awarded, v_recorded;
  end if;
end $$;

select set_config('request.jwt.claim.sub', '55555555-5555-4555-8555-555555555557', false);
set role authenticated;
delete from public.goals where id = '55555555-5555-4555-8555-555555555553';
reset role;

do $$
begin
  if not exists (
    select 1 from public.goals where id = '55555555-5555-4555-8555-555555555553'
  ) then
    raise exception 'another player deleted a goal';
  end if;
end $$;

select set_config('request.jwt.claim.sub', '55555555-5555-4555-8555-555555555551', false);
set role authenticated;

insert into public.player_feedback (user_id, body, page, app_version)
values (
  '55555555-5555-4555-8555-555555555551',
  'The sheet closed and another one opened.',
  '/goals',
  '0.1.0'
);

do $$
begin
  insert into public.player_feedback (user_id, body, page, app_version)
  values (
    '55555555-5555-4555-8555-555555555556',
    'Not mine.',
    '/goals',
    '0.1.0'
  );
  raise exception 'player inserted a note for someone else';
exception
  when insufficient_privilege then null;
  when others then
    if sqlerrm not ilike '%row-level security%' and sqlerrm not ilike '%permission denied%' then
      raise;
    end if;
end $$;

do $$
declare
  v_seen int;
begin
  select count(*) into v_seen from public.player_feedback
  where user_id = '55555555-5555-4555-8555-555555555551';
  if v_seen <> 1 then
    raise exception 'owner should read their own note, saw %', v_seen;
  end if;
end $$;

select set_config('request.jwt.claim.sub', '55555555-5555-4555-8555-555555555557', false);

do $$
declare
  v_seen int;
begin
  select count(*) into v_seen from public.player_feedback
  where user_id = '55555555-5555-4555-8555-555555555551';
  if v_seen <> 0 then
    raise exception 'another player read a note';
  end if;
end $$;

select set_config('request.jwt.claim.sub', '55555555-5555-4555-8555-555555555556', false);

do $$
declare
  v_seen int;
begin
  select count(*) into v_seen from public.player_feedback
  where user_id = '55555555-5555-4555-8555-555555555551';
  if v_seen <> 1 then
    raise exception 'staff should read the note, saw %', v_seen;
  end if;
end $$;

reset role;

delete from public.player_feedback where user_id = '55555555-5555-4555-8555-555555555551';
delete from public.characters where id = '55555555-5555-4555-8555-555555555552';
delete from public.guild_memberships where user_id in (
  '55555555-5555-4555-8555-555555555551',
  '55555555-5555-4555-8555-555555555556',
  '55555555-5555-4555-8555-555555555557'
);
delete from public.profiles where id in (
  '55555555-5555-4555-8555-555555555551',
  '55555555-5555-4555-8555-555555555556',
  '55555555-5555-4555-8555-555555555557'
);
delete from auth.users where id in (
  '55555555-5555-4555-8555-555555555551',
  '55555555-5555-4555-8555-555555555556',
  '55555555-5555-4555-8555-555555555557'
);
