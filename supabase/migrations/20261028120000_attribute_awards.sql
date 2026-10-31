-- Locked 10/28. The per-session 3+3 cap is retired. Weekly caps and approval replace it.
-- Earlier migrations stay as they were applied.

alter table public.scoring_config
  add column weekly_point_cap int not null default 4 check (weekly_point_cap >= 0),
  add column pool_point_cap int not null default 2 check (pool_point_cap >= 0),
  add column attendance_points int not null default 2 check (attendance_points >= 0),
  add column muster_week int not null default 10 check (muster_week >= 1),
  add column pace_full_week int not null default 6,
  add column pace_light_week int not null default 10,
  add column pace_light_logs int not null default 2,
  add column spend_only_at_session boolean not null default false,
  add column pre_induction_hp_base int not null default 6,
  add column posters_launch date,
  add column location_address text,
  add column price_member_cents int,
  add column price_nonmember_cents int,
  add column checkin_time_zone text not null default 'America/Boise',
  add column discord_enabled boolean not null default false,
  add column discord_auth_enabled boolean not null default false,
  add column google_auth_enabled boolean not null default false,
  add column veteran_tier_level int not null default 3;

comment on column public.scoring_config.exercise_points_per_session is
  'Retired 10/28. Awards use weekly_point_cap and pool_point_cap. The column remains so old reads do not break.';
comment on column public.scoring_config.goal_points_per_session is
  'Retired 10/28. Same weekly cap as workouts.';
comment on column public.scoring_config.first_adventure_sessions is
  'Retired 10/28 for awards. The calendar still has sessions. Logs bank until the 27 is complete.';

alter table public.characters
  add column social_points int not null default 0 check (social_points >= 0),
  add column free_points int not null default 0 check (free_points >= 0),
  add column share_logs boolean not null default true;

comment on column public.characters.social_points is
  'Unspent bank from social goals. Charisma spends it.';
comment on column public.characters.free_points is
  'Unspent bank from attendance, the mustering grant, and a DM bonus. The recruit places it on any ability.';
comment on column public.characters.share_logs is
  'Company can read logs while this is true. The recruit may opt out.';
comment on column public.characters.background_bonus is
  'The starting +2/+1 or three +1s. Separate from the 27. It does not consume the bank.';

alter table public.workout_logs
  add column bank_pool text check (bank_pool is null or bank_pool in ('physical', 'constitution'));

alter table public.session_attendance
  add column award_status text not null default 'none' check (award_status in ('pending', 'awarded', 'none', 'bonus'));

alter table public.attribute_point_ledger
  add column week_start date;

alter table public.attribute_point_ledger drop constraint attribute_point_ledger_source_check;
alter table public.attribute_point_ledger add constraint attribute_point_ledger_source_check
  check (source in (
    'workout', 'goal', 'session', 'squad_goal', 'admin', 'spend', 'staff',
    'nutrition', 'sleep', 'attendance', 'muster'
  ));

alter table public.attribute_point_ledger drop constraint attribute_point_ledger_pool_check;
alter table public.attribute_point_ledger add constraint attribute_point_ledger_pool_check
  check (pool is null or pool in ('physical', 'constitution', 'mental', 'social', 'free'));

alter table public.workout_logs drop constraint workout_logs_status_check;
alter table public.workout_logs add constraint workout_logs_status_check
  check (status in ('pending', 'awarded', 'none', 'bonus'));

alter table public.goal_logs drop constraint goal_logs_status_check;
alter table public.goal_logs add constraint goal_logs_status_check
  check (status in ('pending', 'awarded', 'none', 'bonus'));

alter table public.profiles drop constraint profiles_app_role_check;
alter table public.profiles add constraint profiles_app_role_check
  check (app_role in ('player', 'dm', 'admin', 'curator', 'approver'));

create table public.log_approver_roles (
  app_role text primary key check (app_role in ('dm', 'admin', 'curator', 'approver'))
);
insert into public.log_approver_roles (app_role) values ('dm'), ('admin'), ('curator'), ('approver');
alter table public.log_approver_roles enable row level security;
create policy log_approver_roles_select on public.log_approver_roles
  for select to authenticated using (true);

create table public.build_plans (
  character_id uuid primary key references public.characters (id) on delete cascade,
  strength int not null check (strength between 8 and 15),
  dexterity int not null check (dexterity between 8 and 15),
  constitution int not null check (constitution between 8 and 15),
  intelligence int not null check (intelligence between 8 and 15),
  wisdom int not null check (wisdom between 8 and 15),
  charisma int not null check (charisma between 8 and 15),
  updated_at timestamptz not null default now()
);
alter table public.build_plans enable row level security;
create policy build_plans_select on public.build_plans
  for select to authenticated
  using (
    public.owns_character(character_id)
    or exists (
      select 1 from public.characters c
      where c.id = character_id and public.is_member(c.guild_id) and public.is_staff()
    )
  );
create policy build_plans_write on public.build_plans
  for all to authenticated
  using (public.owns_character(character_id))
  with check (public.owns_character(character_id));

create table public.post_cap_bonuses (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds (id) on delete cascade,
  pool text not null check (pool in ('physical', 'constitution', 'mental', 'social', 'any')),
  name text not null,
  effect text not null,
  con_tied boolean not null default false,
  enabled boolean not null default true
);
alter table public.post_cap_bonuses enable row level security;
create policy post_cap_select on public.post_cap_bonuses
  for select to authenticated using (public.is_member(guild_id));
create policy post_cap_write on public.post_cap_bonuses
  for all to authenticated
  using ((public.is_dm() or public.is_admin()) and public.is_member(guild_id))
  with check ((public.is_dm() or public.is_admin()) and public.is_member(guild_id));

create table public.character_bonuses (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters (id) on delete cascade,
  bonus_id uuid references public.post_cap_bonuses (id),
  source text not null,
  source_id uuid,
  created_at timestamptz not null default now()
);
alter table public.character_bonuses enable row level security;
create policy character_bonuses_select on public.character_bonuses
  for select to authenticated
  using (
    public.owns_character(character_id)
    or exists (
      select 1 from public.characters c
      where c.id = character_id and public.is_member(c.guild_id) and (public.is_staff() or public.can_read_logs(c.id))
    )
  );

create table public.award_audit (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters (id) on delete cascade,
  kind text not null check (kind in ('grant', 'approval', 'spend', 'muster', 'attendance', 'workout', 'goal', 'bonus')),
  pool text,
  amount int,
  reason text,
  actor_id uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
alter table public.award_audit enable row level security;
create policy award_audit_select on public.award_audit
  for select to authenticated
  using (
    public.owns_character(character_id)
    or exists (
      select 1 from public.characters c
      where c.id = character_id and public.is_member(c.guild_id) and public.is_staff()
    )
  );

create table public.origin_feats (
  id text primary key,
  display_name text not null,
  allowed boolean not null default true,
  notes text
);
alter table public.origin_feats enable row level security;
create policy origin_feats_select on public.origin_feats for select to authenticated using (true);
create policy origin_feats_write on public.origin_feats
  for all to authenticated
  using (public.is_dm() or public.is_admin())
  with check (public.is_dm() or public.is_admin());

create table public.hp_adjustments (
  id text primary key,
  kind text not null check (kind in ('feat', 'species')),
  match_value text not null,
  amount int not null
);
alter table public.hp_adjustments enable row level security;
create policy hp_adjustments_select on public.hp_adjustments for select to authenticated using (true);
create policy hp_adjustments_write on public.hp_adjustments
  for all to authenticated
  using (public.is_dm() or public.is_admin())
  with check (public.is_dm() or public.is_admin());

create table public.session_timeslots (
  id text primary key,
  label text not null,
  start_time time not null,
  end_time time not null,
  adults_only boolean not null default false,
  time_zone text not null default 'America/Boise'
);
alter table public.session_timeslots enable row level security;
create policy timeslots_select on public.session_timeslots for select to authenticated using (true);
create policy timeslots_write on public.session_timeslots
  for all to authenticated
  using (public.is_dm() or public.is_admin())
  with check (public.is_dm() or public.is_admin());

create table public.schedule_skips (
  skip_date date primary key,
  reason text not null
);
alter table public.schedule_skips enable row level security;
create policy skips_select on public.schedule_skips for select to authenticated using (true);
create policy skips_write on public.schedule_skips
  for all to authenticated
  using (public.is_dm() or public.is_admin())
  with check (public.is_dm() or public.is_admin());

create table public.goal_reward_types (
  id text primary key,
  label text not null,
  enabled boolean not null default true
);
alter table public.goal_reward_types enable row level security;
create policy goal_reward_select on public.goal_reward_types for select to authenticated using (true);
create policy goal_reward_write on public.goal_reward_types
  for all to authenticated
  using (public.is_dm() or public.is_admin())
  with check (public.is_dm() or public.is_admin());

create table public.veteran_hooks (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters (id) on delete cascade,
  kind text not null check (kind in ('personal', 'stepping_stone', 'milestone_xp')),
  body text not null,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
alter table public.veteran_hooks enable row level security;
create policy veteran_hooks_select on public.veteran_hooks
  for select to authenticated
  using (
    public.owns_character(character_id)
    or exists (
      select 1 from public.characters c
      where c.id = character_id and public.is_member(c.guild_id) and public.is_staff()
    )
  );
create policy veteran_hooks_write on public.veteran_hooks
  for all to authenticated
  using (
    exists (
      select 1 from public.characters c
      where c.id = character_id and public.is_member(c.guild_id) and public.is_staff()
    )
  )
  with check (
    exists (
      select 1 from public.characters c
      where c.id = character_id and public.is_member(c.guild_id) and public.is_staff()
    )
  );

create index idx_build_plans_character on public.build_plans (character_id);
create index idx_post_cap_guild on public.post_cap_bonuses (guild_id);
create index idx_character_bonuses_character on public.character_bonuses (character_id);
create index idx_character_bonuses_bonus on public.character_bonuses (bonus_id);
create index idx_award_audit_character on public.award_audit (character_id);
create index idx_award_audit_actor on public.award_audit (actor_id);
create index idx_veteran_hooks_character on public.veteran_hooks (character_id);
create index idx_ledger_week on public.attribute_point_ledger (character_id, week_start);

insert into public.origin_feats (id, display_name, allowed, notes) values
  ('skilled', 'Skilled', true, 'Label only. No rules text.'),
  ('lucky', 'Lucky', true, 'Label only. John named this. No rules text is stored.'),
  ('tough', 'Tough', true, 'Display is Tough, not Toughness. Label only.'),
  ('brawler', 'Brawler', true, 'Label only. John named this. No rules text is stored.'),
  ('magic_initiate', 'Magic Initiate', false, 'Disallowed. Do not offer this origin.');

insert into public.hp_adjustments (id, kind, match_value, amount) values
  ('tough', 'feat', 'Tough', 2),
  ('dwarf', 'species', 'dwarf', 1);

insert into public.session_timeslots (id, label, start_time, end_time, adults_only, time_zone) values
  ('morning', '9–12', '09:00', '12:00', false, 'America/Boise'),
  ('afternoon', '2–5', '14:00', '17:00', false, 'America/Boise'),
  ('evening', '7–10', '19:00', '22:00', true, 'America/Boise');

insert into public.schedule_skips (skip_date, reason) values
  ('2026-10-31', 'Halloween. This Saturday is skipped and the cohort shifts one week.');

insert into public.goal_reward_types (id, label, enabled) values
  ('world_effect', 'World effect', true),
  ('progress', 'Progress toward a larger goal', true),
  ('narrative', 'Narrative reward', true);

insert into public.post_cap_bonuses (guild_id, pool, name, effect, con_tied) values
  ('11111111-1111-4111-8111-111111111111', 'any', 'Heroic inspiration', 'One use of heroic inspiration.', false),
  ('11111111-1111-4111-8111-111111111111', 'physical', '+2 damage', '+2 damage on one attack.', false),
  ('11111111-1111-4111-8111-111111111111', 'constitution', 'Kept fed and rested', 'A Constitution bonus tied to nutrition and sleep.', true);

insert into public.squads (guild_id, name, max_size)
select '11111111-1111-4111-8111-111111111111', name, 6
from (values ('RBM'), ('CCC')) as seed(name)
where not exists (
  select 1 from public.squads s where s.name = seed.name
);

update public.induction_classes set enabled = true, notes = 'Enabled 10/28. Spell tables stay empty until each spell is approved as a biological or non-spell effect.'
where id in ('fighter', 'barbarian', 'monk', 'rogue');

insert into public.induction_classes (id, name, enabled, notes) values
  ('ranger', 'Ranger', true, 'Enabled 10/28. Spell tables stay empty until John approves a reskin.'),
  ('paladin', 'Paladin', true, 'Enabled 10/28. Spell tables stay empty until John approves a reskin.')
on conflict (id) do update set enabled = true;

select set_config('emc.seed', 'on', false);
update public.skill_labels
set display_name = 'Alchemy',
    notes = 'Rules name stays Arcana. The sheet says Alchemy.'
where id = 'arcana';

update public.skill_labels
set display_name = 'Culture',
    notes = 'Rules name stays Religion. The sheet says Culture.'
where id = 'religion';
select set_config('emc.seed', 'off', false);

update public.scoring_config set
  time_zone = 'America/Boise',
  cohort_start = '2027-01-02',
  posters_launch = '2027-01-04',
  award_requires_approval = true,
  log_visibility = 'company',
  points_per_custom_workout = points_per_prescribed_workout,
  location_address = '1539 E Piper St, Idaho Falls, ID 83401',
  price_member_cents = 6000,
  price_nonmember_cents = 12000,
  group_goal_payout = 'narrative',
  veteran_tier_start_week = null;

insert into public.config_notes (key, note) values
  ('weekly_caps', 'Locked 10/28. 4 earned a week, 2 from any one pool. Attendance is outside the cap. The 3+3 session cap is retired.'),
  ('approval', 'Locked 10/28. award_requires_approval is true. A DM, admin, curator, or approver approves. No real account is assigned approver.'),
  ('background', 'The starting array is a background bonus and does not consume the 27.'),
  ('after_27', 'Logs past the 27 pay a row from post_cap_bonuses. A DM in-game grant can still bank a free point.'),
  ('bleakspire', 'Bleakspire is a fortress with a small city around it.'),
  ('schedule', 'Next adventure starts Saturday 2027-01-02. Posters launch 2027-01-04. Oct 31 2026 is skipped. Squad size is still open.'),
  ('pricing', 'Display only. Founding Recruit Rate $60/mo added to a gym membership, or $120/mo for non-members with membership included. No payments.')
on conflict (key) do update set note = excluded.note;

create or replace function public.is_log_approver()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    join public.log_approver_roles r on r.app_role = p.app_role
    where p.id = auth.uid()
  );
$$;

create or replace function public.write_award_audit(
  p_character_id uuid,
  p_kind text,
  p_pool text,
  p_amount int,
  p_reason text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.award_audit (character_id, kind, pool, amount, reason, actor_id)
  values (p_character_id, p_kind, p_pool, p_amount, p_reason, auth.uid());
end;
$$;

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
     or new.social_points is distinct from old.social_points
     or new.free_points is distinct from old.free_points
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
  v_share boolean;
begin
  if public.owns_character(p_character_id) then
    return true;
  end if;
  select guild_id, share_logs into v_guild, v_share
  from public.characters where id = p_character_id;
  if v_guild is null or not public.is_member(v_guild) then
    return false;
  end if;
  if public.is_dm() or public.is_admin() or public.is_curator() then
    return true;
  end if;
  if not coalesce(v_share, true) then
    return false;
  end if;
  select log_visibility into v_mode from public.scoring_config where id = 1;
  if v_mode = 'company' then
    return true;
  elsif v_mode = 'squad' then
    return public.shares_squad(p_character_id);
  elsif v_mode = 'staff' then
    return false;
  end if;
  return false;
end;
$$;

create or replace function public.set_app_role(p_user_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current text;
  v_dm_count int;
begin
  if not public.is_dm() then
    raise exception 'Only the DM assigns roles';
  end if;
  if p_role not in ('player', 'dm', 'admin', 'curator', 'approver') then
    raise exception 'Unknown role';
  end if;
  select app_role into v_current from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'Profile not found';
  end if;
  if not exists (
    select 1 from public.guild_memberships mine
    join public.guild_memberships theirs on theirs.guild_id = mine.guild_id
    where mine.user_id = auth.uid() and theirs.user_id = p_user_id
  ) then
    raise exception 'Not your company';
  end if;
  if v_current = 'dm' and p_role <> 'dm' then
    select count(*) into v_dm_count from public.profiles where app_role = 'dm';
    if v_dm_count <= 1 then
      raise exception 'The company keeps one DM';
    end if;
  end if;
  perform set_config('emc.profile_admin', 'on', true);
  update public.profiles set app_role = p_role where id = p_user_id;
  perform set_config('emc.profile_admin', 'off', true);
end;
$$;

create or replace function public.award_attribute_points(
  p_character_id uuid,
  p_source text,
  p_source_id uuid,
  p_event_date date,
  p_reason text
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cfg public.scoring_config%rowtype;
  v_today date;
  v_pool text;
  v_unit int;
  v_exempt boolean := false;
  v_week_start date;
  v_week_used int := 0;
  v_pool_used int := 0;
  v_awarded_total int := 0;
  v_award int := 0;
  v_log_character uuid;
  v_bank text;
  v_category text;
  v_goal_character uuid;
  v_completed date;
  v_bonus uuid;
begin
  if current_setting('emc.internal_award', true) is distinct from 'on' then
    raise exception 'Point awards are made by company functions';
  end if;
  if p_source not in ('workout', 'goal', 'attendance') then
    raise exception 'Unknown point source';
  end if;

  select * into v_cfg from public.scoring_config where id = 1;
  if v_cfg.id is null or v_cfg.cohort_start is null then
    raise exception 'Progression config is invalid';
  end if;

  perform 1 from public.characters where id = p_character_id for update;
  if not found then
    raise exception 'Character not found';
  end if;

  if p_source_id is not null and exists (
    select 1 from public.attribute_point_ledger
    where source = p_source and source_id = p_source_id and points_awarded > 0
  ) then
    return 0;
  end if;

  v_today := public.company_today();

  if p_source = 'workout' then
    select character_id, bank_pool into v_log_character, v_bank
    from public.workout_logs where id = p_source_id for update;
    if not found or v_log_character <> p_character_id then
      raise exception 'Workout log not found';
    end if;
    v_pool := case when v_bank = 'constitution' then 'constitution' else 'physical' end;
    v_unit := v_cfg.points_per_prescribed_workout;
    if p_event_date > v_today then
      raise exception 'Future workout dates are rejected';
    end if;
    if p_event_date < v_today - v_cfg.backfill_days then
      update public.workout_logs set points_awarded = 0, status = 'none' where id = p_source_id;
      return 0;
    end if;
  elsif p_source = 'goal' then
    select g.character_id, g.category, gl.completed_on
      into v_goal_character, v_category, v_completed
    from public.goal_logs gl
    join public.goals g on g.id = gl.goal_id
    where gl.id = p_source_id
    for update of gl;
    if not found or v_goal_character <> p_character_id then
      raise exception 'Goal log not found';
    end if;
    v_pool := case v_category
      when 'constitution' then 'constitution'
      when 'charisma' then 'social'
      else 'mental'
    end;
    v_unit := v_cfg.points_per_goal;
    p_event_date := v_completed;
    if p_event_date > v_today then
      raise exception 'Future workout dates are rejected';
    end if;
    if p_event_date < v_today - v_cfg.goal_backfill_days then
      update public.goal_logs set points_awarded = 0, status = 'none' where id = p_source_id;
      return 0;
    end if;
  else
    v_pool := 'free';
    v_unit := v_cfg.attendance_points;
    v_exempt := true;
  end if;

  if p_event_date < v_cfg.cohort_start then
    v_week_start := v_cfg.cohort_start;
  else
    v_week_start := v_cfg.cohort_start + (((p_event_date - v_cfg.cohort_start) / 7) * 7);
  end if;

  select coalesce(sum(points_awarded), 0)::int into v_awarded_total
  from public.attribute_point_ledger
  where character_id = p_character_id and points_awarded > 0;

  if v_awarded_total >= v_cfg.point_buy_budget then
    select id into v_bonus
    from public.post_cap_bonuses
    where enabled
      and (pool = v_pool or pool = 'any')
      and (v_pool <> 'constitution' or con_tied or pool = 'constitution')
    order by case when pool = v_pool then 0 else 1 end, name
    limit 1;
    if v_bonus is not null and p_source_id is not null and not exists (
      select 1 from public.character_bonuses where source = p_source and source_id = p_source_id
    ) then
      insert into public.character_bonuses (character_id, bonus_id, source, source_id)
      values (p_character_id, v_bonus, p_source, p_source_id);
      perform public.write_award_audit(p_character_id, 'bonus', v_pool, 0, p_reason);
    end if;
    perform set_config('emc.progression_write', 'on', true);
    if p_source = 'workout' then
      update public.workout_logs set points_awarded = 0, status = 'bonus' where id = p_source_id;
    elsif p_source = 'goal' then
      update public.goal_logs set points_awarded = 0, status = 'bonus' where id = p_source_id;
    elsif p_source = 'attendance' then
      update public.session_attendance set award_status = 'bonus' where id = p_source_id;
    end if;
    perform set_config('emc.progression_write', 'off', true);
    return 0;
  end if;

  if not v_exempt then
    select coalesce(sum(points_awarded), 0)::int into v_week_used
    from public.attribute_point_ledger
    where character_id = p_character_id
      and points_awarded > 0
      and source in ('workout', 'goal')
      and week_start = v_week_start;
    select coalesce(sum(points_awarded), 0)::int into v_pool_used
    from public.attribute_point_ledger
    where character_id = p_character_id
      and points_awarded > 0
      and source in ('workout', 'goal')
      and pool = v_pool
      and week_start = v_week_start;
    v_award := least(v_unit, v_cfg.weekly_point_cap - v_week_used, v_cfg.pool_point_cap - v_pool_used, v_cfg.point_buy_budget - v_awarded_total);
  else
    v_award := least(v_unit, v_cfg.point_buy_budget - v_awarded_total);
  end if;

  if v_award is null or v_award <= 0 then
    perform set_config('emc.progression_write', 'on', true);
    if p_source = 'workout' then
      update public.workout_logs set points_awarded = 0, status = 'none' where id = p_source_id;
    elsif p_source = 'goal' then
      update public.goal_logs set points_awarded = 0, status = 'none' where id = p_source_id;
    else
      update public.session_attendance set award_status = 'none' where id = p_source_id;
    end if;
    perform set_config('emc.progression_write', 'off', true);
    return 0;
  end if;

  perform set_config('emc.progression_write', 'on', true);
  if v_pool = 'physical' then
    update public.characters set physical_points = physical_points + v_award where id = p_character_id;
  elsif v_pool = 'constitution' then
    update public.characters set constitution_points = constitution_points + v_award where id = p_character_id;
  elsif v_pool = 'mental' then
    update public.characters set mental_points = mental_points + v_award where id = p_character_id;
  elsif v_pool = 'social' then
    update public.characters set social_points = social_points + v_award where id = p_character_id;
  else
    update public.characters set free_points = free_points + v_award where id = p_character_id;
  end if;

  insert into public.attribute_point_ledger (
    character_id, source, source_id, points_awarded, attribute_target, pool, reason, status, week_start, session_start
  ) values (
    p_character_id, p_source, p_source_id, v_award, v_pool, v_pool, p_reason, 'awarded', v_week_start, v_week_start
  );

  if p_source = 'workout' then
    update public.workout_logs set points_awarded = v_award, status = 'awarded' where id = p_source_id;
  elsif p_source = 'goal' then
    update public.goal_logs set points_awarded = v_award, status = 'awarded' where id = p_source_id;
  else
    update public.session_attendance set award_status = 'awarded' where id = p_source_id;
  end if;
  perform public.write_award_audit(p_character_id, p_source, v_pool, v_award, p_reason);
  perform set_config('emc.progression_write', 'off', true);
  return v_award;
end;
$$;
create or replace function public.log_activity(p_kind text, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_character_id uuid;
  v_owner uuid;
  v_guild uuid;
  v_inducted timestamptz;
  v_log_id uuid;
  v_existing_points int;
  v_existing_status text;
  v_date date;
  v_today date;
  v_awarded int := 0;
  v_pool text;
  v_status text := 'none';
  v_library uuid;
  v_equipment text;
  v_tier text;
  v_published boolean;
  v_attribute text;
  v_title text;
  v_library_guild uuid;
  v_char_tier text;
  v_vet_week int;
  v_week int;
  v_approve boolean;
  v_client uuid;
  v_goal_id uuid;
  v_goal_character uuid;
  v_category text;
  v_session_id uuid;
  v_session_guild uuid;
  v_objective jsonb;
  v_impact jsonb;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;
  if p_payload is null then
    p_payload := '{}'::jsonb;
  end if;
  if p_kind not in ('workout', 'goal', 'checkin') then
    raise exception 'Unknown activity';
  end if;

  if nullif(p_payload->>'character_id', '') is null then
    select id, guild_id, inducted_at
      into v_character_id, v_guild, v_inducted
    from public.characters
    where user_id = v_user;
  else
    v_character_id := (p_payload->>'character_id')::uuid;
    select user_id, guild_id, inducted_at
      into v_owner, v_guild, v_inducted
    from public.characters
    where id = v_character_id;
    if v_owner is distinct from v_user then
      raise exception 'Not your character';
    end if;
  end if;

  if v_character_id is null then
    raise exception 'Create a character first';
  end if;

  v_today := public.company_today();
  select award_requires_approval into v_approve from public.scoring_config where id = 1;

  if p_kind = 'checkin' then
    v_session_id := (p_payload->>'session_id')::uuid;
    select guild_id into v_session_guild from public.sessions where id = v_session_id;
    if v_session_guild is null then
      raise exception 'Session not found';
    end if;
    if v_session_guild is distinct from v_guild then
      raise exception 'That session is not for your company';
    end if;
    begin
      insert into public.session_attendance (session_id, character_id, award_status)
      values (
        v_session_id,
        v_character_id,
        case when v_approve then 'pending' else 'none' end
      )
      returning id into v_log_id;
    exception
      when unique_violation then
        v_status := 'none';
        v_log_id := null;
    end;
    if v_log_id is not null and not v_approve then
      perform set_config('emc.internal_award', 'on', true);
      v_awarded := public.award_attribute_points(
        v_character_id, 'attendance', v_log_id, v_today, 'Attendance'
      );
      perform set_config('emc.internal_award', 'off', true);
      v_status := case when v_awarded > 0 then 'awarded' else 'none' end;
      update public.session_attendance set award_status = v_status where id = v_log_id;
    elsif v_log_id is not null then
      v_status := 'pending';
      v_awarded := 0;
    end if;
    v_impact := public.character_impact(v_character_id);
    return v_impact || jsonb_build_object(
      'kind', 'checkin',
      'log_id', coalesce(v_log_id, v_session_id),
      'points_delta', v_awarded,
      'pool', 'free',
      'status', v_status,
      'objective_progress', null
    );
  end if;

  if nullif(p_payload->>'date', '') is not null then
    v_date := (p_payload->>'date')::date;
  elsif nullif(p_payload->>'completed_on', '') is not null then
    v_date := (p_payload->>'completed_on')::date;
  else
    v_date := v_today;
  end if;

  if v_date > v_today then
    raise exception 'Future workout dates are rejected';
  end if;

  if p_kind = 'workout' then
    if nullif(p_payload->>'client_id', '') is not null then
      v_client := (p_payload->>'client_id')::uuid;
      select id, points_awarded, status
        into v_log_id, v_existing_points, v_existing_status
      from public.workout_logs
      where character_id = v_character_id and client_id = v_client;
      if found then
        v_impact := public.character_impact(v_character_id);
        return v_impact || jsonb_build_object(
          'kind', 'workout',
          'log_id', v_log_id,
          'points_delta', v_existing_points,
          'pool', 'physical',
          'status', v_existing_status,
          'objective_progress', null,
          'replayed', true
        );
      end if;
    end if;

    if coalesce((p_payload->>'is_custom')::boolean, true) then
      if nullif(btrim(p_payload->>'exercise'), '') is null or nullif(btrim(p_payload->>'type'), '') is null then
        raise exception 'Exercise and type are required';
      end if;
      insert into public.workout_logs (
        character_id, date, type, exercise, sets, reps, weight, duration_minutes, notes,
        is_custom, award_track, status, points_awarded, client_id
      ) values (
        v_character_id,
        v_date,
        btrim(p_payload->>'type'),
        btrim(p_payload->>'exercise'),
        nullif(p_payload->>'sets', '')::int,
        nullif(p_payload->>'reps', '')::int,
        nullif(p_payload->>'weight', '')::numeric,
        nullif(p_payload->>'duration_minutes', '')::int,
        nullif(p_payload->>'notes', ''),
        true,
        'custom',
        'none',
        0,
        v_client
      )
      returning id into v_log_id;
      v_pool := 'physical';
    else
      v_library := (p_payload->>'library_workout_id')::uuid;
      v_equipment := p_payload->>'equipment';
      select tier, published, attribute, title, guild_id
        into v_tier, v_published, v_attribute, v_title, v_library_guild
      from public.workout_library
      where id = v_library;
      if not found or not v_published or v_library_guild is distinct from v_guild then
        raise exception 'That drill is not available';
      end if;
      if v_equipment not in ('functional', 'full_gym', 'at_home') then
        raise exception 'Choose an equipment version';
      end if;
      if not exists (
        select 1 from public.workout_versions
        where workout_id = v_library and equipment = v_equipment
      ) then
        raise exception 'That equipment version is not on this drill';
      end if;

      v_char_tier := case when v_inducted is null then 'recruit' else 'inducted' end;
      if v_tier = 'veteran' then
        select veteran_tier_start_week into v_vet_week from public.scoring_config where id = 1;
        v_week := public.adventure_week(v_today);
        if v_vet_week is null or v_inducted is null or v_week is null or v_week < v_vet_week then
          raise exception 'Veteran tier is not open yet';
        end if;
      elsif v_tier <> v_char_tier then
        raise exception 'That drill is for a different tier';
      end if;

      insert into public.workout_logs (
        character_id, date, type, exercise, sets, reps, weight, duration_minutes, notes,
        library_workout_id, equipment, is_custom, award_track, status, points_awarded, client_id
      ) values (
        v_character_id, v_date, v_attribute, v_title,
        nullif(p_payload->>'sets', '')::int,
        nullif(p_payload->>'reps', '')::int,
        nullif(p_payload->>'weight', '')::numeric,
        nullif(p_payload->>'duration_minutes', '')::int,
        nullif(p_payload->>'notes', ''),
        v_library, v_equipment, false, 'prescribed', 'none', 0, v_client
      )
      returning id into v_log_id;
      v_pool := 'physical';
    end if;

    if lower(coalesce(p_payload->>'bank_pool', '')) = 'constitution' then
      v_pool := 'constitution';
    end if;
    update public.workout_logs set bank_pool = v_pool where id = v_log_id;

    if v_approve then
      perform set_config('emc.progression_write', 'on', true);
      update public.workout_logs set status = 'pending' where id = v_log_id;
      perform set_config('emc.progression_write', 'off', true);
      v_status := 'pending';
      v_awarded := 0;
    else
      perform set_config('emc.internal_award', 'on', true);
      v_awarded := public.award_attribute_points(
        v_character_id, 'workout', v_log_id, v_date, coalesce(nullif(p_payload->>'exercise', ''), 'Workout')
      );
      perform set_config('emc.internal_award', 'off', true);
      v_status := case when v_awarded > 0 then 'awarded' else 'none' end;
    end if;
  elsif p_kind = 'goal' then
    v_goal_id := (p_payload->>'goal_id')::uuid;
    select character_id, category into v_goal_character, v_category
    from public.goals where id = v_goal_id;
    if not found or v_goal_character <> v_character_id then
      raise exception 'Goal not found';
    end if;
    if v_category = 'constitution' then
      v_pool := 'constitution';
    elsif v_category = 'charisma' then
      v_pool := 'social';
    else
      v_pool := 'mental';
    end if;

    insert into public.goal_logs (goal_id, character_id, completed_on, notes, status, points_awarded)
    values (v_goal_id, v_character_id, v_date, nullif(p_payload->>'notes', ''), 'none', 0)
    returning id into v_log_id;

    if v_approve then
      perform set_config('emc.progression_write', 'on', true);
      update public.goal_logs set status = 'pending' where id = v_log_id;
      perform set_config('emc.progression_write', 'off', true);
      v_status := 'pending';
      v_awarded := 0;
    else
      perform set_config('emc.internal_award', 'on', true);
      v_awarded := public.award_attribute_points(
        v_character_id, 'goal', v_log_id, v_date, 'Goal completed'
      );
      perform set_config('emc.internal_award', 'off', true);
      v_status := case when v_awarded > 0 then 'awarded' else 'none' end;
    end if;
  end if;

  if nullif(p_payload->>'objective_id', '') is not null then
    v_objective := public.log_objective_progress(
      (p_payload->>'objective_id')::uuid,
      coalesce(nullif(p_payload->>'objective_amount', '')::int, 1),
      nullif(p_payload->>'notes', '')
    );
  end if;

  v_impact := public.character_impact(v_character_id);
  return v_impact || jsonb_build_object(
    'kind', p_kind,
    'log_id', v_log_id,
    'points_delta', v_awarded,
    'pool', v_pool,
    'status', v_status,
    'objective_progress', v_objective
  );
end;
$$;

create or replace function public.approve_log(p_kind text, p_log_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_character uuid;
  v_guild uuid;
  v_status text;
  v_date date;
  v_awarded int;
begin
  if not public.is_staff() then
    raise exception 'Staff role required';
  end if;
  if p_kind = 'workout' then
    select character_id, status, date into v_character, v_status, v_date
    from public.workout_logs where id = p_log_id for update;
  elsif p_kind = 'goal' then
    select character_id, status, completed_on into v_character, v_status, v_date
    from public.goal_logs where id = p_log_id for update;
  else
    raise exception 'Unknown activity';
  end if;
  if not found then
    raise exception 'Log not found';
  end if;
  select guild_id into v_guild from public.characters where id = v_character;
  if not public.is_member(v_guild) then
    raise exception 'Not your company';
  end if;
  if v_status is distinct from 'pending' then
    raise exception 'That log is not waiting for approval';
  end if;

  perform set_config('emc.internal_award', 'on', true);
  v_awarded := public.award_attribute_points(v_character, p_kind, p_log_id, v_date, 'Approved by staff');
  perform set_config('emc.internal_award', 'off', true);

  update public.attribute_point_ledger
  set approved_by = auth.uid()
  where source = p_kind and source_id = p_log_id and approved_by is null;

  return public.character_impact(v_character) || jsonb_build_object(
    'kind', p_kind,
    'log_id', p_log_id,
    'points_delta', v_awarded,
    'status', case when v_awarded > 0 then 'awarded' else 'none' end
  );
end;
$$;

-- The approved_by update is blocked by the ledger trigger. Fold it into the award insert instead.
-- approve_log above updates the ledger after the flag is off. Fix: set approved_by inside award
-- when the flag is on. The update below is replaced by doing nothing if the trigger rejects it.
-- See the following replacement of approve_log's ledger update: it runs while progression_write is on.



create or replace function public.spend_attribute_points(
  p_character_id uuid,
  p_strength int,
  p_dexterity int,
  p_constitution int,
  p_intelligence int,
  p_wisdom int,
  p_charisma int
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.characters%rowtype;
  v_physical int;
  v_constitution int;
  v_mental int;
  v_social int;
  v_free int := 0;
  v_session boolean;
begin
  select * into v_row from public.characters where id = p_character_id for update;
  if not found then
    raise exception 'Character not found';
  end if;
  if v_row.user_id is distinct from auth.uid() then
    raise exception 'The recruit places their own Build';
  end if;
  if (select spend_only_at_session from public.scoring_config where id = 1) then
    select exists (
      select 1 from public.sessions s
      where s.guild_id = v_row.guild_id and s.session_date = public.company_today()
    ) into v_session;
    if not v_session then
      raise exception 'Banking opens at a session';
    end if;
  end if;

  if public.point_buy_cost(p_strength) is null
     or public.point_buy_cost(p_dexterity) is null
     or public.point_buy_cost(p_constitution) is null
     or public.point_buy_cost(p_intelligence) is null
     or public.point_buy_cost(p_wisdom) is null
     or public.point_buy_cost(p_charisma) is null
     or public.point_buy_cost(v_row.strength) is null
     or public.point_buy_cost(v_row.dexterity) is null
     or public.point_buy_cost(v_row.constitution) is null
     or public.point_buy_cost(v_row.intelligence) is null
     or public.point_buy_cost(v_row.wisdom) is null
     or public.point_buy_cost(v_row.charisma) is null
  then
    raise exception 'Scores must stay on the point-buy table';
  end if;

  v_physical :=
    (public.point_buy_cost(p_strength) - public.point_buy_cost(v_row.strength))
    + (public.point_buy_cost(p_dexterity) - public.point_buy_cost(v_row.dexterity));
  v_constitution := public.point_buy_cost(p_constitution) - public.point_buy_cost(v_row.constitution);
  v_mental :=
    (public.point_buy_cost(p_intelligence) - public.point_buy_cost(v_row.intelligence))
    + (public.point_buy_cost(p_wisdom) - public.point_buy_cost(v_row.wisdom));
  v_social := public.point_buy_cost(p_charisma) - public.point_buy_cost(v_row.charisma);

  if v_physical < 0 then
    -- refund stays in the tagged bank
    null;
  elsif v_row.physical_points < v_physical then
    v_free := v_free + (v_physical - v_row.physical_points);
    v_physical := v_row.physical_points;
  end if;
  if v_constitution > v_row.constitution_points then
    v_free := v_free + (v_constitution - v_row.constitution_points);
    v_constitution := v_row.constitution_points;
  end if;
  if v_mental > v_row.mental_points then
    v_free := v_free + (v_mental - v_row.mental_points);
    v_mental := v_row.mental_points;
  end if;
  if v_social > v_row.social_points then
    v_free := v_free + (v_social - v_row.social_points);
    v_social := v_row.social_points;
  end if;
  if v_row.free_points < v_free then
    if v_constitution > v_row.constitution_points then
      raise exception 'Not enough Constitution points';
    end if;
    raise exception 'Not enough banked for that Build';
  end if;
  if v_row.physical_points - v_physical < 0
     or v_row.constitution_points - v_constitution < 0
     or v_row.mental_points - v_mental < 0
     or v_row.social_points - v_social < 0
  then
    raise exception 'Not enough banked for that Build';
  end if;

  perform set_config('emc.progression_write', 'on', true);
  update public.characters
  set strength = p_strength,
      dexterity = p_dexterity,
      constitution = p_constitution,
      intelligence = p_intelligence,
      wisdom = p_wisdom,
      charisma = p_charisma,
      physical_points = physical_points - v_physical,
      constitution_points = constitution_points - v_constitution,
      mental_points = mental_points - v_mental,
      social_points = social_points - v_social,
      free_points = free_points - v_free
  where id = p_character_id;

  if v_physical <> 0 then
    insert into public.attribute_point_ledger (character_id, source, points_awarded, pool, reason, status)
    values (p_character_id, 'spend', -v_physical, 'physical', 'Build', 'awarded');
  end if;
  if v_constitution <> 0 then
    insert into public.attribute_point_ledger (character_id, source, points_awarded, pool, reason, status)
    values (p_character_id, 'spend', -v_constitution, 'constitution', 'Build', 'awarded');
  end if;
  if v_mental <> 0 then
    insert into public.attribute_point_ledger (character_id, source, points_awarded, pool, reason, status)
    values (p_character_id, 'spend', -v_mental, 'mental', 'Build', 'awarded');
  end if;
  if v_social <> 0 then
    insert into public.attribute_point_ledger (character_id, source, points_awarded, pool, reason, status)
    values (p_character_id, 'spend', -v_social, 'social', 'Build', 'awarded');
  end if;
  if v_free <> 0 then
    insert into public.attribute_point_ledger (character_id, source, points_awarded, pool, reason, status)
    values (p_character_id, 'spend', -v_free, 'free', 'Build', 'awarded');
  end if;
  perform public.write_award_audit(p_character_id, 'spend', null, -(v_physical + v_constitution + v_mental + v_social + v_free), 'Build');
  perform set_config('emc.progression_write', 'off', true);
  return public.character_impact(p_character_id);
end;
$$;

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
declare
  v_guild uuid;
begin
  if not (public.is_dm() or public.is_admin()) then
    raise exception 'Staff role required';
  end if;
  if p_points is null or p_points <= 0 then
    raise exception 'Points cannot be taken away';
  end if;
  if p_pool not in ('physical', 'constitution', 'mental', 'social', 'free') then
    raise exception 'Unknown point pool';
  end if;
  if p_reason is null or length(btrim(p_reason)) = 0 then
    raise exception 'A reason is required';
  end if;
  select guild_id into v_guild from public.characters where id = p_character_id for update;
  if not found then
    raise exception 'Character not found';
  end if;
  if not public.is_member(v_guild) then
    raise exception 'Not your company';
  end if;

  perform set_config('emc.progression_write', 'on', true);
  if p_pool = 'physical' then
    update public.characters set physical_points = physical_points + p_points where id = p_character_id;
  elsif p_pool = 'constitution' then
    update public.characters set constitution_points = constitution_points + p_points where id = p_character_id;
  elsif p_pool = 'mental' then
    update public.characters set mental_points = mental_points + p_points where id = p_character_id;
  elsif p_pool = 'social' then
    update public.characters set social_points = social_points + p_points where id = p_character_id;
  else
    update public.characters set free_points = free_points + p_points where id = p_character_id;
  end if;
  insert into public.attribute_point_ledger (
    character_id, source, points_awarded, attribute_target, pool, reason, status, approved_by
  ) values (
    p_character_id, 'staff', p_points, p_pool, p_pool, btrim(p_reason), 'awarded', auth.uid()
  );
  perform public.write_award_audit(p_character_id, 'grant', p_pool, p_points, btrim(p_reason));
  perform set_config('emc.progression_write', 'off', true);
  return p_points;
end;
$$;

create or replace function public.approve_log(p_kind text, p_log_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_character uuid;
  v_guild uuid;
  v_status text;
  v_date date;
  v_awarded int;
  v_source text;
begin
  if not public.is_log_approver() then
    raise exception 'Staff role required';
  end if;
  if p_kind = 'workout' then
    select character_id, status, date into v_character, v_status, v_date
    from public.workout_logs where id = p_log_id for update;
    v_source := 'workout';
  elsif p_kind = 'goal' then
    select character_id, status, completed_on into v_character, v_status, v_date
    from public.goal_logs where id = p_log_id for update;
    v_source := 'goal';
  elsif p_kind = 'checkin' then
    select character_id, award_status, public.company_today()
      into v_character, v_status, v_date
    from public.session_attendance where id = p_log_id for update;
    v_source := 'attendance';
  else
    raise exception 'Unknown activity';
  end if;
  if not found then
    raise exception 'Log not found';
  end if;
  select guild_id into v_guild from public.characters where id = v_character;
  if not public.is_member(v_guild) then
    raise exception 'Not your company';
  end if;
  if v_status is distinct from 'pending' then
    raise exception 'That log is not waiting for approval';
  end if;

  perform set_config('emc.internal_award', 'on', true);
  v_awarded := public.award_attribute_points(v_character, v_source, p_log_id, v_date, 'Approved');
  perform set_config('emc.progression_write', 'on', true);
  update public.attribute_point_ledger
  set approved_by = auth.uid()
  where source = v_source and source_id = p_log_id;
  perform public.write_award_audit(v_character, 'approval', null, v_awarded, 'Approved');
  perform set_config('emc.internal_award', 'off', true);
  perform set_config('emc.progression_write', 'off', true);

  return public.character_impact(v_character) || jsonb_build_object(
    'kind', p_kind,
    'log_id', p_log_id,
    'points_delta', v_awarded,
    'status', case when v_awarded > 0 then 'awarded' else 'none' end
  );
end;
$$;

create or replace function public.muster_grant(p_character_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guild uuid;
  v_week int;
  v_need int;
  v_awarded int;
  v_cfg public.scoring_config%rowtype;
begin
  if not (public.is_dm() or public.is_admin()) then
    raise exception 'Staff role required';
  end if;
  select * into v_cfg from public.scoring_config where id = 1;
  select guild_id into v_guild from public.characters where id = p_character_id for update;
  if not found or not public.is_member(v_guild) then
    raise exception 'Not your company';
  end if;
  v_week := public.adventure_week(public.company_today());
  if v_week is null or v_week < v_cfg.muster_week then
    raise exception 'Mustering Grant is not open yet';
  end if;
  if not exists (
    select 1 from public.session_attendance a
    join public.characters c on c.id = a.character_id
    where a.character_id = p_character_id
  ) then
    raise exception 'Mustering Grant is for someone still attending';
  end if;
  select coalesce(sum(points_awarded), 0)::int into v_awarded
  from public.attribute_point_ledger
  where character_id = p_character_id and points_awarded > 0;
  v_need := v_cfg.point_buy_budget - v_awarded;
  if v_need <= 0 then
    return 0;
  end if;
  perform set_config('emc.progression_write', 'on', true);
  update public.characters set free_points = free_points + v_need where id = p_character_id;
  insert into public.attribute_point_ledger (
    character_id, source, points_awarded, pool, reason, status, approved_by
  ) values (
    p_character_id, 'muster', v_need, 'free', 'Mustering Grant', 'awarded', auth.uid()
  );
  perform public.write_award_audit(p_character_id, 'muster', 'free', v_need, 'Mustering Grant');
  perform set_config('emc.progression_write', 'off', true);
  return v_need;
end;
$$;

create or replace function public.save_build_plan(
  p_character_id uuid,
  p_strength int,
  p_dexterity int,
  p_constitution int,
  p_intelligence int,
  p_wisdom int,
  p_charisma int
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select user_id into v_owner from public.characters where id = p_character_id;
  if v_owner is distinct from auth.uid() then
    raise exception 'The recruit writes their own Build plan';
  end if;
  insert into public.build_plans (
    character_id, strength, dexterity, constitution, intelligence, wisdom, charisma, updated_at
  ) values (
    p_character_id, p_strength, p_dexterity, p_constitution, p_intelligence, p_wisdom, p_charisma, now()
  )
  on conflict (character_id) do update set
    strength = excluded.strength,
    dexterity = excluded.dexterity,
    constitution = excluded.constitution,
    intelligence = excluded.intelligence,
    wisdom = excluded.wisdom,
    charisma = excluded.charisma,
    updated_at = now();
end;
$$;

create or replace function public.character_impact(p_character_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.characters%rowtype;
  v_names text[] := array['strength','dexterity','constitution','intelligence','wisdom','charisma'];
  v_pools text[] := array['physical','physical','constitution','mental','mental','social'];
  v_scores int[];
  v_balances int[];
  v_list jsonb := '[]'::jsonb;
  v_cost int;
  v_build int;
  v_free int;
  i int;
begin
  select * into v_row from public.characters where id = p_character_id;
  if not found then
    raise exception 'Character not found';
  end if;
  if v_row.user_id is distinct from auth.uid()
     and not (public.is_dm() or public.is_admin() or public.is_curator())
  then
    raise exception 'Not allowed';
  end if;

  v_scores := array[
    v_row.strength, v_row.dexterity, v_row.constitution,
    v_row.intelligence, v_row.wisdom, v_row.charisma
  ];
  v_balances := array[
    v_row.physical_points, v_row.physical_points, v_row.constitution_points,
    v_row.mental_points, v_row.mental_points, v_row.social_points
  ];
  v_free := v_row.free_points;
  select coalesce(sum(points_awarded), 0)::int into v_build
  from public.attribute_point_ledger
  where character_id = p_character_id and points_awarded > 0;

  for i in 1..6 loop
    if public.point_buy_cost(v_scores[i]) is null or public.point_buy_cost(v_scores[i] + 1) is null then
      continue;
    end if;
    v_cost := public.point_buy_cost(v_scores[i] + 1) - public.point_buy_cost(v_scores[i]);
    if v_balances[i] >= v_cost or v_free >= v_cost then
      v_list := v_list || jsonb_build_array(jsonb_build_object(
        'ability', v_names[i],
        'from', v_scores[i],
        'to', v_scores[i] + 1,
        'cost', v_cost,
        'pool', case when v_balances[i] >= v_cost then v_pools[i] else 'free' end
      ));
    end if;
  end loop;

  return jsonb_build_object(
    'character_id', v_row.id,
    'unspent_after', jsonb_build_object(
      'physical', v_row.physical_points,
      'constitution', v_row.constitution_points,
      'mental', v_row.mental_points,
      'social', v_row.social_points,
      'free', v_row.free_points
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

revoke all on function public.write_award_audit(uuid, text, text, int, text) from public, anon, authenticated;
grant execute on function public.write_award_audit(uuid, text, text, int, text) to current_user;

grant execute on function public.is_log_approver() to authenticated;
grant execute on function public.muster_grant(uuid) to authenticated;
grant execute on function public.save_build_plan(uuid, int, int, int, int, int, int) to authenticated;

grant select on public.log_approver_roles to authenticated;
grant select, insert, update, delete on public.build_plans to authenticated;
grant select, insert, update, delete on public.post_cap_bonuses to authenticated;
grant select on public.character_bonuses to authenticated;
grant select on public.award_audit to authenticated;
grant select, insert, update, delete on public.origin_feats to authenticated;
grant select, insert, update, delete on public.hp_adjustments to authenticated;
grant select, insert, update, delete on public.session_timeslots to authenticated;
grant select, insert, update, delete on public.schedule_skips to authenticated;
grant select, insert, update, delete on public.goal_reward_types to authenticated;
grant select, insert, update, delete on public.veteran_hooks to authenticated;
grant update (share_logs) on public.characters to authenticated;

revoke all on function public.is_log_approver() from public, anon;
grant execute on function public.is_log_approver() to authenticated;
revoke all on function public.muster_grant(uuid) from public, anon;
revoke all on function public.save_build_plan(uuid, int, int, int, int, int, int) from public, anon;
