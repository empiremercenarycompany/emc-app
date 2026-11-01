-- Constitution goal and a staff-written subclass.
-- Does not edit 20261031224500. Not applied from this repo.
-- The +2 initiative is calculated in the app. It does not insert a buff.

alter table public.scoring_config
  add column con_goal_score_min int not null default 15
    check (con_goal_score_min between 8 and 20),
  add column mental_goal_cmart boolean not null default true;

comment on column public.scoring_config.mental_goal_cmart is
  'Pending John''s confirmation. When true, an Intelligence or Wisdom goal stays inactive and does not count until Clear, Measurable, Attainable, Relevant, and Timed are all checked. Set false to turn the checks off.';

comment on column public.scoring_config.con_goal_score_min is
  'Open for John. Constitution score that, with an empty nutrition-and-sleep bank, counts as having all Constitution points. Default 15 matches point_buy_max. The other reading is that the whole 27 must be spent.';

create table public.constitution_goal_options (
  id text primary key,
  label text not null,
  condition_name text not null,
  sort_order int not null,
  enabled boolean not null default true
);

insert into public.constitution_goal_options (id, label, condition_name, sort_order) values
  ('sleep', 'Get enough sleep', 'Well Rested', 1),
  ('meal_prep', 'Meal prep', 'Well Fed', 2),
  ('cardio', 'Do the cardio', 'Limbered Up', 3);

comment on table public.constitution_goal_options is
  'Constitution tracks. Meal prep can gain a nutrition-plan row later without a code change.';

alter table public.characters
  add column constitution_goal_id text references public.constitution_goal_options (id),
  add column subclass_name text,
  add column subclass_features text,
  add column subclass_spells text;

comment on column public.characters.subclass_name is
  'Staff-written. Empty until a DM records one. No subclass is assigned in seed. Homebrew names are allowed. Do not store book text.';
comment on column public.characters.subclass_features is
  'Staff-written features for the subclass. Not a rules paste.';
comment on column public.characters.subclass_spells is
  'Staff-written spell names, one per line. Not a rules paste.';

create table public.constitution_goal_weeks (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters (id) on delete cascade,
  option_id text not null references public.constitution_goal_options (id),
  week_start date not null,
  marked_on date not null,
  unique (character_id, week_start)
);

create index idx_constitution_goal_weeks_character on public.constitution_goal_weeks (character_id, week_start);

alter table public.constitution_goal_options enable row level security;
alter table public.constitution_goal_weeks enable row level security;

create policy constitution_goal_options_select on public.constitution_goal_options
  for select to authenticated
  using (enabled or public.is_staff());

create policy constitution_goal_options_write on public.constitution_goal_options
  for all to authenticated
  using (public.is_dm() or public.is_admin())
  with check (public.is_dm() or public.is_admin());

create policy constitution_goal_weeks_select on public.constitution_goal_weeks
  for select to authenticated
  using (
    public.owns_character(character_id)
    or exists (
      select 1 from public.characters c
      where c.id = constitution_goal_weeks.character_id
        and public.is_member(c.guild_id)
        and public.is_log_approver()
    )
  );

create policy constitution_goal_weeks_insert on public.constitution_goal_weeks
  for insert to authenticated
  with check (
    public.owns_character(character_id)
    and exists (
      select 1 from public.characters c
      where c.id = character_id
        and c.constitution_goal_id = option_id
    )
  );

create policy constitution_goal_weeks_update on public.constitution_goal_weeks
  for update to authenticated
  using (public.owns_character(character_id))
  with check (
    public.owns_character(character_id)
    and exists (
      select 1 from public.characters c
      where c.id = character_id
        and c.constitution_goal_id = option_id
    )
  );

revoke all on public.constitution_goal_options from public, anon, authenticated;
revoke all on public.constitution_goal_weeks from public, anon, authenticated;
grant select on public.constitution_goal_options to authenticated;
grant select, insert, update on public.constitution_goal_weeks to authenticated;
grant update (constitution_goal_id) on public.characters to authenticated;

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
     or new.subclass_name is distinct from old.subclass_name
     or new.subclass_features is distinct from old.subclass_features
     or new.subclass_spells is distinct from old.subclass_spells
  then
    raise exception 'Level, class, rank, squad, and subclass change through company functions';
  end if;
  return new;
end;
$$;

create or replace function public.set_character_subclass(
  p_character_id uuid,
  p_name text,
  p_features text,
  p_spells text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guild uuid;
begin
  if not public.is_staff() then
    raise exception 'Staff role required';
  end if;
  select guild_id into v_guild from public.characters where id = p_character_id for update;
  if not found or not public.is_member(v_guild) then
    raise exception 'Character not found';
  end if;
  perform set_config('emc.staff_write', 'on', true);
  update public.characters
  set
    subclass_name = nullif(btrim(coalesce(p_name, '')), ''),
    subclass_features = nullif(btrim(coalesce(p_features, '')), ''),
    subclass_spells = nullif(btrim(coalesce(p_spells, '')), '')
  where id = p_character_id;
  perform set_config('emc.staff_write', 'off', true);
end;
$$;

revoke all on function public.set_character_subclass(uuid, text, text, text) from public, anon;
grant execute on function public.set_character_subclass(uuid, text, text, text) to authenticated;

alter table public.goals
  add column cmart_clear boolean not null default false,
  add column cmart_measurable boolean not null default false,
  add column cmart_attainable boolean not null default false,
  add column cmart_relevant boolean not null default false,
  add column cmart_timed boolean not null default false,
  add column marked_done boolean not null default false;

comment on column public.goals.marked_done is
  'The done box. A mental goal still does not count until the five checks are on, when mental_goal_cmart is true.';

grant insert (
  cmart_clear, cmart_measurable, cmart_attainable, cmart_relevant, cmart_timed, marked_done
) on public.goals to authenticated;
grant update (
  cmart_clear, cmart_measurable, cmart_attainable, cmart_relevant, cmart_timed, marked_done, is_active
) on public.goals to authenticated;

create or replace function public.goals_cmart_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_on boolean;
begin
  if new.category not in ('intelligence', 'wisdom') then
    return new;
  end if;
  select mental_goal_cmart into v_on from public.scoring_config where id = 1;
  if coalesce(v_on, true)
     and new.is_active
     and not (new.cmart_clear and new.cmart_measurable and new.cmart_attainable and new.cmart_relevant and new.cmart_timed)
  then
    new.is_active := false;
  end if;
  return new;
end;
$$;

create trigger goals_cmart_guard
  before insert or update on public.goals
  for each row execute function public.goals_cmart_guard();

create or replace function public.goal_logs_cmart_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_goal public.goals%rowtype;
  v_on boolean;
begin
  select * into v_goal from public.goals where id = new.goal_id;
  if v_goal.category is null or v_goal.category not in ('intelligence', 'wisdom') then
    return new;
  end if;
  select mental_goal_cmart into v_on from public.scoring_config where id = 1;
  if coalesce(v_on, true)
     and not (v_goal.cmart_clear and v_goal.cmart_measurable and v_goal.cmart_attainable and v_goal.cmart_relevant and v_goal.cmart_timed)
  then
    raise exception 'A mental goal needs all five checks before it counts';
  end if;
  return new;
end;
$$;

create trigger goal_logs_cmart_guard
  before insert on public.goal_logs
  for each row execute function public.goal_logs_cmart_guard();

revoke all on function public.goals_cmart_guard() from public, anon;
revoke all on function public.goal_logs_cmart_guard() from public, anon;
grant execute on function public.goals_cmart_guard() to authenticated;
grant execute on function public.goal_logs_cmart_guard() to authenticated;

insert into public.config_notes (key, note) values
  (
    'con_goal',
    'Open for John. +2 initiative when Constitution is at con_goal_score_min (default 15) and the nutrition-and-sleep bank has nothing left to place, and the chosen Constitution goal was logged this week. It is not a buff row. Meal prep can later grow a nutrition-plan option.'
  )
on conflict (key) do update set note = excluded.note;

insert into public.config_notes (key, note) values
  (
    'mental_goal_cmart',
    'Pending John''s confirmation. Intelligence and Wisdom goals use the journal CMART checks. mental_goal_cmart defaults true. Set it false to turn the checks off.'
  )
on conflict (key) do update set note = excluded.note;
