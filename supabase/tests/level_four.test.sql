-- Level 4 steps. Disposable database only.

do $$
declare
  v_steps int;
  v_buffs int;
begin
  select level_four_steps_required into v_steps from public.scoring_config where id = 1;
  if v_steps is distinct from 4 then
    raise exception 'level 4 default is %, expected 4', v_steps;
  end if;

  select count(*) into v_buffs from public.goal_reward_buffs;
  if v_buffs is distinct from 2 then
    raise exception 'goal reward buff list has % rows', v_buffs;
  end if;
  if exists (
    select 1 from public.goal_reward_buffs
    where name not in ('Heroic Inspiration', 'Advantage on one check')
  ) then
    raise exception 'goal reward buff list invented a buff';
  end if;

  if not (select relrowsecurity from pg_class where relname = 'goal_rewards')
     or not (select relrowsecurity from pg_class where relname = 'goal_reward_buffs')
  then
    raise exception 'goal reward tables are missing row level security';
  end if;
end $$;

-- A finished step records a ready reward and does not fill the buff or the story.
insert into auth.users (id, email) values
  ('33333333-3333-4333-8333-333333333331', 'level4@example.test')
on conflict (id) do nothing;

begin;
select set_config('emc.character_create', 'on', true);
insert into public.characters (id, user_id, guild_id, name)
values (
  '33333333-3333-4333-8333-333333333332',
  '33333333-3333-4333-8333-333333333331',
  '11111111-1111-4111-8111-111111111111',
  'Level Four Recruit'
)
on conflict (id) do nothing;
commit;

insert into public.goals (id, character_id, category, title, is_long_term)
values (
  '33333333-3333-4333-8333-333333333333',
  '33333333-3333-4333-8333-333333333332',
  'constitution',
  'Long aim',
  true
);

insert into public.goals (id, character_id, category, title, is_long_term, parent_id)
values (
  '33333333-3333-4333-8333-333333333334',
  '33333333-3333-4333-8333-333333333332',
  'constitution',
  'First step',
  false,
  '33333333-3333-4333-8333-333333333333'
);

update public.goals
set completed_at = now()
where id = '33333333-3333-4333-8333-333333333334';

do $$
declare
  v_status text;
  v_buff text;
  v_story text;
begin
  select status, buff_id, story_reward
    into v_status, v_buff, v_story
  from public.goal_rewards
  where goal_id = '33333333-3333-4333-8333-333333333334';
  if v_status is distinct from 'ready' or v_buff is not null or v_story is not null then
    raise exception 'finished step should wait for a DM, got % / % / %', v_status, v_buff, v_story;
  end if;
end $$;

delete from public.characters where id = '33333333-3333-4333-8333-333333333332';
delete from public.guild_memberships where user_id = '33333333-3333-4333-8333-333333333331';
delete from public.profiles where id = '33333333-3333-4333-8333-333333333331';
delete from auth.users where id = '33333333-3333-4333-8333-333333333331';
