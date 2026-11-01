-- Level 4. John, 2026-10-31.
-- Levels 1–3 stay milestone weeks. After level 3, progress is completed
-- short-term steps of a long-term goal. The count defaults to 4 and stays
-- configurable on scoring_config.level_four_steps_required.
-- Finishing a step does not grant a buff or a story reward. A DM or trainer
-- records both. Nothing in this migration writes character_buffs.

alter table public.scoring_config
  add column level_four_steps_required int not null default 4
    check (level_four_steps_required >= 1);

comment on column public.scoring_config.level_four_steps_required is
  'How many completed short-term steps mark progress toward level 4. John set the default at 4 on 2026-10-31. Change it with update_scoring_config.';

alter table public.goals
  add column parent_id uuid references public.goals (id) on delete cascade,
  add column completed_at timestamptz;

comment on column public.goals.parent_id is
  'Set on a short-term step of a long-term goal. Null on weekly goals and on the long-term goal itself.';
comment on column public.goals.completed_at is
  'Set when the recruit finishes a short-term step. It does not grant a buff or a story reward.';

alter table public.goals
  add constraint goals_long_term_is_root check (is_long_term = false or parent_id is null),
  add constraint goals_not_own_parent check (parent_id is distinct from id);

create index idx_goals_parent on public.goals (parent_id);

grant insert (
  character_id, category, title, description, target_frequency, is_active, is_long_term, period_start, period_end, parent_id
) on public.goals to authenticated;

grant update (
  category, title, description, target_frequency, is_active, is_long_term, period_start, period_end, parent_id, completed_at
) on public.goals to authenticated;

-- Buffs a DM may record for a finished step. Only the two John named.
-- More rows can be added later. This list is not buff_catalog, and recording
-- one does not grant that buff.
create table public.goal_reward_buffs (
  id text primary key,
  name text not null,
  sort_order int not null default 0,
  enabled boolean not null default true
);

insert into public.goal_reward_buffs (id, name, sort_order) values
  ('heroic_inspiration', 'Heroic Inspiration', 1),
  ('advantage_one_check', 'Advantage on one check', 2);

create table public.goal_rewards (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null unique references public.goals (id) on delete cascade,
  character_id uuid not null references public.characters (id) on delete cascade,
  status text not null default 'ready' check (status in ('ready', 'recorded')),
  buff_id text references public.goal_reward_buffs (id),
  buff_other text,
  story_reward text,
  recorded_by uuid references public.profiles (id),
  recorded_at timestamptz,
  created_at timestamptz not null default now(),
  constraint goal_rewards_ready check (
    status <> 'ready'
    or (buff_id is null and buff_other is null and story_reward is null and recorded_by is null)
  ),
  constraint goal_rewards_recorded check (
    status <> 'recorded'
    or (
      story_reward is not null
      and length(btrim(story_reward)) > 0
      and (
        (buff_id is not null and buff_other is null)
        or (buff_id is null and buff_other is not null and length(btrim(buff_other)) > 0)
      )
    )
  )
);

create index idx_goal_rewards_character on public.goal_rewards (character_id);
create index idx_goal_rewards_status on public.goal_rewards (status);

alter table public.goal_reward_buffs enable row level security;
alter table public.goal_rewards enable row level security;

create policy goal_reward_buffs_select on public.goal_reward_buffs
  for select to authenticated
  using (true);

create policy goal_reward_buffs_write on public.goal_reward_buffs
  for all to authenticated
  using (public.is_dm() or public.is_admin())
  with check (public.is_dm() or public.is_admin());

-- Recruits read their own rows. A DM or trainer (log approver: dm, admin,
-- curator, approver — there is no separate trainer role) reads and records
-- rewards for characters in their company.
create policy goal_rewards_select on public.goal_rewards
  for select to authenticated
  using (
    public.owns_character(character_id)
    or exists (
      select 1 from public.characters c
      where c.id = goal_rewards.character_id
        and public.is_member(c.guild_id)
        and public.is_log_approver()
    )
  );

create policy goal_rewards_insert on public.goal_rewards
  for insert to authenticated
  with check (
    status = 'ready'
    and buff_id is null
    and buff_other is null
    and story_reward is null
    and recorded_by is null
    and public.owns_character(character_id)
    and exists (
      select 1 from public.goals g
      where g.id = goal_id
        and g.character_id = goal_rewards.character_id
        and g.parent_id is not null
        and g.completed_at is not null
    )
  );

create policy goal_rewards_update on public.goal_rewards
  for update to authenticated
  using (
    exists (
      select 1 from public.characters c
      where c.id = goal_rewards.character_id
        and public.is_member(c.guild_id)
        and public.is_log_approver()
    )
  )
  with check (
    exists (
      select 1 from public.characters c
      where c.id = goal_rewards.character_id
        and public.is_member(c.guild_id)
        and public.is_log_approver()
    )
  );

revoke all on public.goal_reward_buffs from public, anon, authenticated;
revoke all on public.goal_rewards from public, anon, authenticated;
grant select on public.goal_reward_buffs to authenticated;
grant select, insert, update on public.goal_rewards to authenticated;

create or replace function public.goals_shape_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  parent public.goals%rowtype;
begin
  if new.parent_id is not null then
    if new.parent_id = new.id then
      raise exception 'A goal cannot parent itself';
    end if;
    select * into parent from public.goals where id = new.parent_id;
    if parent.id is null then
      raise exception 'Parent goal is missing';
    end if;
    if parent.character_id is distinct from new.character_id then
      raise exception 'A step stays on the same character';
    end if;
    if parent.is_long_term is not true or parent.parent_id is not null then
      raise exception 'A step belongs to a long-term goal';
    end if;
    if new.is_long_term then
      raise exception 'A long-term goal has no parent';
    end if;
  end if;

  if tg_op = 'UPDATE' and new.completed_at is distinct from old.completed_at then
    if old.completed_at is not null and not public.is_log_approver() then
      raise exception 'A finished step stays finished';
    end if;
    if new.completed_at is not null and new.parent_id is null then
      raise exception 'Only a short-term step of a long-term goal finishes this way';
    end if;
  end if;
  return new;
end;
$$;

create trigger goals_shape_guard
  before insert or update on public.goals
  for each row execute function public.goals_shape_guard();

-- Hook: a finished short-term step gets one ready reward row. No buff, no story.
create or replace function public.note_short_term_goal_reward()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and old.completed_at is null
     and new.completed_at is not null
     and new.parent_id is not null
     and new.is_long_term = false
  then
    insert into public.goal_rewards (goal_id, character_id, status)
    values (new.id, new.character_id, 'ready')
    on conflict (goal_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger note_short_term_goal_reward
  after update on public.goals
  for each row execute function public.note_short_term_goal_reward();

revoke all on function public.goals_shape_guard() from public, anon;
revoke all on function public.note_short_term_goal_reward() from public, anon;
grant execute on function public.goals_shape_guard() to authenticated;
grant execute on function public.note_short_term_goal_reward() to authenticated;

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
    'attendance_loot', 'group_goal_payout', 'level_two_week', 'level_three_week',
    'level_four_steps_required'
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
    level_three_week = case when p_patch ? 'level_three_week' then (p_patch->>'level_three_week')::int else level_three_week end,
    level_four_steps_required = case when p_patch ? 'level_four_steps_required' then (p_patch->>'level_four_steps_required')::int else level_four_steps_required end
  where id = 1;

  if p_patch ? 'cohort_start' then
    update public.adventures set start_date = (p_patch->>'cohort_start')::date where number = 1;
  end if;

  return (select to_jsonb(s) from public.scoring_config s where id = 1);
end;
$$;

insert into public.config_notes (key, note) values
  (
    'level_four',
    'John, 2026-10-31. Level 4 progress is completed short-term steps of a long-term goal. Default 4, still configurable. Each finished step waits for a DM or trainer to record a buff and a story reward. Nothing is granted automatically.'
  )
on conflict (key) do update set note = excluded.note;
