-- Lifting journal. A flagged exercise does not grant attribute points.
-- One lifting session writes one workout log and can take at most one exercise award.

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds (id) on delete cascade,
  name text not null,
  focus text not null check (focus in ('strength', 'dexterity', 'functional')),
  cues text,
  status text not null default 'approved' check (status in ('approved', 'retired')),
  created_by uuid references public.profiles (id),
  approved_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.exercise_pools (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds (id) on delete cascade,
  title text not null,
  shared boolean not null default false,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

comment on column public.exercise_pools.shared is
  'TODO(John): a shared pool is on the menu for every member. Otherwise a player needs an assignment or their own workout already on that pool.';

create table public.exercise_pool_items (
  pool_id uuid not null references public.exercise_pools (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  primary key (pool_id, exercise_id)
);

create table public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds (id) on delete cascade,
  pool_id uuid not null references public.exercise_pools (id),
  created_by uuid references public.profiles (id),
  title text not null,
  notes text,
  focus text,
  created_at timestamptz not null default now()
);

create table public.workout_template_exercises (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.workout_templates (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id),
  position int not null,
  target_sets int,
  target_reps int,
  target_weight numeric,
  notes text
);

create table public.template_assignments (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.workout_templates (id) on delete cascade,
  character_id uuid not null references public.characters (id) on delete cascade,
  assigned_by uuid references public.profiles (id),
  assigned_at timestamptz not null default now(),
  ended_at timestamptz
);

create table public.player_workouts (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters (id) on delete cascade,
  based_on_template_id uuid references public.workout_templates (id),
  pool_id uuid not null references public.exercise_pools (id),
  title text not null,
  updated_at timestamptz not null default now()
);

create table public.player_workout_exercises (
  id uuid primary key default gen_random_uuid(),
  player_workout_id uuid not null references public.player_workouts (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id),
  position int not null,
  target_sets int,
  target_reps int,
  target_weight numeric
);

create table public.lifting_sessions (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters (id) on delete cascade,
  player_workout_id uuid references public.player_workouts (id) on delete set null,
  template_id uuid references public.workout_templates (id) on delete set null,
  workout_log_id uuid references public.workout_logs (id) on delete set null,
  date date not null,
  notes text,
  share_with_squad boolean not null default true,
  points_awarded int not null default 0 check (points_awarded >= 0),
  created_at timestamptz not null default now()
);

create table public.lifting_sets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.lifting_sessions (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id),
  set_number int not null,
  reps int,
  weight numeric,
  notes text,
  is_pr boolean not null default false
);

create table public.exercise_flags (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  guild_id uuid not null references public.guilds (id) on delete cascade,
  goal_id uuid references public.goals (id) on delete set null,
  period_start date,
  period_end date,
  reward_hook text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

comment on column public.exercise_flags.reward_hook is
  'Empty slot for a later reward. A flag does not grant attribute points.';

alter table public.exercises enable row level security;
alter table public.exercise_pools enable row level security;
alter table public.exercise_pool_items enable row level security;
alter table public.workout_templates enable row level security;
alter table public.workout_template_exercises enable row level security;
alter table public.template_assignments enable row level security;
alter table public.player_workouts enable row level security;
alter table public.player_workout_exercises enable row level security;
alter table public.lifting_sessions enable row level security;
alter table public.lifting_sets enable row level security;
alter table public.exercise_flags enable row level security;

create policy exercises_select on public.exercises
  for select to authenticated
  using (
    public.is_member(guild_id)
    and (status = 'approved' or public.is_curator() or public.is_dm() or public.is_admin())
  );

create policy exercises_write on public.exercises
  for all to authenticated
  using (public.is_curator() and public.is_member(guild_id))
  with check (public.is_curator() and public.is_member(guild_id));

create policy pools_select on public.exercise_pools
  for select to authenticated
  using (public.is_member(guild_id));

create policy pools_write on public.exercise_pools
  for all to authenticated
  using (public.is_curator() and public.is_member(guild_id))
  with check (public.is_curator() and public.is_member(guild_id));

create policy pool_items_select on public.exercise_pool_items
  for select to authenticated
  using (
    exists (
      select 1 from public.exercise_pools p
      where p.id = pool_id and public.is_member(p.guild_id)
    )
  );

create policy pool_items_write on public.exercise_pool_items
  for all to authenticated
  using (
    exists (
      select 1 from public.exercise_pools p
      where p.id = pool_id and public.is_curator() and public.is_member(p.guild_id)
    )
  )
  with check (
    exists (
      select 1 from public.exercise_pools p
      join public.exercises e on e.id = exercise_id
      where p.id = pool_id
        and public.is_curator()
        and public.is_member(p.guild_id)
        and e.guild_id = p.guild_id
        and e.status = 'approved'
    )
  );

create policy templates_select on public.workout_templates
  for select to authenticated
  using (public.is_member(guild_id));

create policy templates_write on public.workout_templates
  for all to authenticated
  using (public.is_curator() and public.is_member(guild_id))
  with check (public.is_curator() and public.is_member(guild_id));

create policy template_exercises_select on public.workout_template_exercises
  for select to authenticated
  using (
    exists (
      select 1 from public.workout_templates t
      where t.id = template_id and public.is_member(t.guild_id)
    )
  );

create policy template_exercises_write on public.workout_template_exercises
  for all to authenticated
  using (
    exists (
      select 1 from public.workout_templates t
      where t.id = template_id and public.is_curator() and public.is_member(t.guild_id)
    )
  )
  with check (
    exists (
      select 1 from public.workout_templates t
      where t.id = template_id and public.is_curator() and public.is_member(t.guild_id)
    )
  );

create policy assignments_select on public.template_assignments
  for select to authenticated
  using (
    public.owns_character(character_id)
    or public.is_curator()
    or public.is_dm()
  );

create policy assignments_write on public.template_assignments
  for all to authenticated
  using (public.is_curator())
  with check (public.is_curator());

create policy player_workouts_all on public.player_workouts
  for all to authenticated
  using (public.owns_character(character_id))
  with check (public.owns_character(character_id));

create policy player_workout_exercises_all on public.player_workout_exercises
  for all to authenticated
  using (
    exists (
      select 1 from public.player_workouts w
      where w.id = player_workout_id and public.owns_character(w.character_id)
    )
  )
  with check (
    exists (
      select 1
      from public.player_workouts w
      join public.exercises e on e.id = exercise_id
      where w.id = player_workout_id
        and public.owns_character(w.character_id)
        and e.status = 'approved'
        and exists (
          select 1 from public.exercise_pool_items i
          where i.pool_id = w.pool_id and i.exercise_id = e.id
        )
    )
  );

create policy lifting_sessions_select on public.lifting_sessions
  for select to authenticated
  using (
    public.owns_character(character_id)
    or (
      share_with_squad
      and public.shares_squad(character_id)
    )
    or public.is_dm()
    or public.is_admin()
  );

create policy lifting_sessions_write on public.lifting_sessions
  for all to authenticated
  using (public.owns_character(character_id))
  with check (public.owns_character(character_id));

create policy lifting_sets_select on public.lifting_sets
  for select to authenticated
  using (
    exists (
      select 1 from public.lifting_sessions s
      where s.id = session_id
        and (
          public.owns_character(s.character_id)
          or (s.share_with_squad and public.shares_squad(s.character_id))
          or public.is_dm()
          or public.is_admin()
        )
    )
  );

create policy lifting_sets_write on public.lifting_sets
  for all to authenticated
  using (
    exists (
      select 1 from public.lifting_sessions s
      where s.id = session_id and public.owns_character(s.character_id)
    )
  )
  with check (
    exists (
      select 1 from public.lifting_sessions s
      where s.id = session_id and public.owns_character(s.character_id)
    )
  );

create policy flags_select on public.exercise_flags
  for select to authenticated
  using (public.is_member(guild_id));

create policy flags_write on public.exercise_flags
  for all to authenticated
  using (public.is_curator() and public.is_member(guild_id))
  with check (public.is_curator() and public.is_member(guild_id));

create or replace function public.protect_lifting_points()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_setting('emc.progression_write', true) = 'on' then
    return new;
  end if;
  if tg_op = 'INSERT' and coalesce(new.points_awarded, 0) <> 0 then
    raise exception 'Lifting points are awarded by the company';
  end if;
  if tg_op = 'UPDATE' and new.points_awarded is distinct from old.points_awarded then
    raise exception 'Lifting points are awarded by the company';
  end if;
  return new;
end;
$$;

drop trigger if exists lifting_sessions_protect_points on public.lifting_sessions;
create trigger lifting_sessions_protect_points
  before insert or update on public.lifting_sessions
  for each row execute function public.protect_lifting_points();

create or replace function public.curator_save_exercise(
  p_id uuid,
  p_name text,
  p_focus text,
  p_cues text,
  p_status text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guild uuid;
  v_id uuid;
begin
  if not public.is_curator() then
    raise exception 'A curator edits the exercise library';
  end if;
  if p_name is null or length(btrim(p_name)) = 0 then
    raise exception 'Exercise name is required';
  end if;
  if p_focus not in ('strength', 'dexterity', 'functional') then
    raise exception 'Unknown focus';
  end if;
  if p_status not in ('approved', 'retired') then
    raise exception 'Unknown exercise status';
  end if;
  select guild_id into v_guild from public.guild_memberships where user_id = auth.uid() limit 1;
  if p_id is null then
    insert into public.exercises (guild_id, name, focus, cues, status, created_by, approved_by)
    values (
      v_guild, btrim(p_name), p_focus, nullif(p_cues, ''), p_status, auth.uid(),
      case when p_status = 'approved' then auth.uid() else null end
    )
    returning id into v_id;
  else
    update public.exercises
    set name = btrim(p_name),
        focus = p_focus,
        cues = nullif(p_cues, ''),
        status = p_status,
        approved_by = case when p_status = 'approved' then coalesce(approved_by, auth.uid()) else approved_by end
    where id = p_id and guild_id = v_guild
    returning id into v_id;
    if v_id is null then
      raise exception 'Exercise not found';
    end if;
  end if;
  return v_id;
end;
$$;

create or replace function public.save_exercise_pool(
  p_id uuid,
  p_title text,
  p_shared boolean,
  p_exercise_ids uuid[]
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guild uuid;
  v_id uuid;
  v_exercise uuid;
begin
  if not public.is_curator() then
    raise exception 'A curator edits pools';
  end if;
  select guild_id into v_guild from public.guild_memberships where user_id = auth.uid() limit 1;
  if p_id is null then
    insert into public.exercise_pools (guild_id, title, shared, created_by)
    values (v_guild, btrim(p_title), coalesce(p_shared, false), auth.uid())
    returning id into v_id;
  else
    update public.exercise_pools
    set title = btrim(p_title), shared = coalesce(p_shared, shared)
    where id = p_id and guild_id = v_guild
    returning id into v_id;
    if v_id is null then
      raise exception 'Pool not found';
    end if;
    delete from public.exercise_pool_items where pool_id = v_id;
  end if;

  if p_exercise_ids is not null then
    foreach v_exercise in array p_exercise_ids loop
      if not exists (
        select 1 from public.exercises
        where id = v_exercise and guild_id = v_guild and status = 'approved'
      ) then
        raise exception 'Pool exercises must be approved';
      end if;
      insert into public.exercise_pool_items (pool_id, exercise_id) values (v_id, v_exercise);
    end loop;
  end if;
  return v_id;
end;
$$;

create or replace function public.player_can_use_pool(p_pool_id uuid, p_character_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.exercise_pools p
    join public.characters c on c.guild_id = p.guild_id
    where p.id = p_pool_id
      and c.id = p_character_id
      and (
        p.shared
        or exists (
          select 1
          from public.template_assignments a
          join public.workout_templates t on t.id = a.template_id
          where a.character_id = p_character_id
            and a.ended_at is null
            and t.pool_id = p.id
        )
        or exists (
          select 1 from public.player_workouts w
          where w.character_id = p_character_id and w.pool_id = p.id
        )
      )
  );
$$;

create or replace function public.save_player_workout(
  p_pool_id uuid,
  p_title text,
  p_exercises jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_character uuid;
  v_workout uuid;
  v_item jsonb;
  v_index int := 0;
  v_exercise uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  select id into v_character from public.characters where user_id = auth.uid();
  if v_character is null then
    raise exception 'Create a character first';
  end if;
  if not public.player_can_use_pool(p_pool_id, v_character) then
    raise exception 'That pool is not on your menu';
  end if;
  if p_title is null or length(btrim(p_title)) = 0 then
    raise exception 'Workout title is required';
  end if;

  delete from public.player_workouts where character_id = v_character;
  insert into public.player_workouts (character_id, pool_id, title)
  values (v_character, p_pool_id, btrim(p_title))
  returning id into v_workout;

  if p_exercises is not null and jsonb_typeof(p_exercises) = 'array' then
    for v_item in select * from jsonb_array_elements(p_exercises) loop
      v_exercise := (v_item->>'exercise_id')::uuid;
      if not exists (
        select 1 from public.exercise_pool_items
        where pool_id = p_pool_id and exercise_id = v_exercise
      ) then
        raise exception 'That exercise is not in this pool';
      end if;
      if not exists (
        select 1 from public.exercises where id = v_exercise and status = 'approved'
      ) then
        raise exception 'That exercise is not approved';
      end if;
      v_index := v_index + 1;
      insert into public.player_workout_exercises (
        player_workout_id, exercise_id, position, target_sets, target_reps, target_weight
      ) values (
        v_workout,
        v_exercise,
        v_index,
        nullif(v_item->>'target_sets', '')::int,
        nullif(v_item->>'target_reps', '')::int,
        nullif(v_item->>'target_weight', '')::numeric
      );
    end loop;
  end if;
  return v_workout;
end;
$$;

create or replace function public.assign_template(p_template_id uuid, p_character_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guild uuid;
  v_character_guild uuid;
  v_id uuid;
begin
  if not public.is_curator() then
    raise exception 'A curator assigns templates';
  end if;
  select guild_id into v_guild from public.workout_templates where id = p_template_id;
  select guild_id into v_character_guild from public.characters where id = p_character_id;
  if v_guild is null or v_guild is distinct from v_character_guild or not public.is_member(v_guild) then
    raise exception 'Template not found';
  end if;
  update public.template_assignments
  set ended_at = now()
  where character_id = p_character_id and ended_at is null;
  insert into public.template_assignments (template_id, character_id, assigned_by)
  values (p_template_id, p_character_id, auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.log_lifting_session(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_character uuid;
  v_date date;
  v_share boolean;
  v_session uuid;
  v_log uuid;
  v_item jsonb;
  v_index int := 0;
  v_exercise uuid;
  v_weight numeric;
  v_awarded int := 0;
  v_approve boolean;
  v_impact jsonb;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;
  select id into v_character from public.characters where user_id = v_user;
  if v_character is null then
    raise exception 'Create a character first';
  end if;
  if p_payload is null or jsonb_typeof(p_payload->'sets') <> 'array' then
    raise exception 'A lifting session needs sets';
  end if;

  if nullif(p_payload->>'date', '') is not null then
    v_date := (p_payload->>'date')::date;
  else
    v_date := public.company_today();
  end if;
  if v_date > public.company_today() then
    raise exception 'Future workout dates are rejected';
  end if;

  select share_lifting_default, award_requires_approval
    into v_share, v_approve
  from public.scoring_config where id = 1;
  if p_payload ? 'share_with_squad' then
    v_share := (p_payload->>'share_with_squad')::boolean;
  end if;

  insert into public.workout_logs (
    character_id, date, type, exercise, notes, is_custom, award_track, status, points_awarded
  ) values (
    v_character, v_date, 'lifting', 'Lifting session', nullif(p_payload->>'notes', ''),
    false, 'lifting', 'none', 0
  )
  returning id into v_log;

  insert into public.lifting_sessions (
    character_id, player_workout_id, template_id, workout_log_id, date, notes, share_with_squad, points_awarded
  ) values (
    v_character,
    nullif(p_payload->>'player_workout_id', '')::uuid,
    nullif(p_payload->>'template_id', '')::uuid,
    v_log,
    v_date,
    nullif(p_payload->>'notes', ''),
    coalesce(v_share, true),
    0
  )
  returning id into v_session;

  for v_item in select * from jsonb_array_elements(p_payload->'sets') loop
    v_exercise := (v_item->>'exercise_id')::uuid;
    if not exists (
      select 1 from public.exercises e
      join public.characters c on c.guild_id = e.guild_id
      where e.id = v_exercise and e.status = 'approved' and c.id = v_character
    ) then
      raise exception 'Sets use approved exercises';
    end if;
    v_weight := nullif(v_item->>'weight', '')::numeric;
    v_index := v_index + 1;
    insert into public.lifting_sets (session_id, exercise_id, set_number, reps, weight, notes, is_pr)
    values (
      v_session,
      v_exercise,
      v_index,
      nullif(v_item->>'reps', '')::int,
      v_weight,
      nullif(v_item->>'notes', ''),
      v_weight is not null and v_weight > coalesce((
        select max(ls.weight)
        from public.lifting_sets ls
        join public.lifting_sessions s on s.id = ls.session_id
        where s.character_id = v_character
          and ls.exercise_id = v_exercise
          and s.id <> v_session
      ), -1)
    );
  end loop;

  if v_index = 0 then
    raise exception 'A lifting session needs sets';
  end if;

  if v_approve then
    perform set_config('emc.progression_write', 'on', true);
    update public.workout_logs set status = 'pending' where id = v_log;
    perform set_config('emc.progression_write', 'off', true);
    v_awarded := 0;
  else
    perform set_config('emc.internal_award', 'on', true);
    v_awarded := public.award_attribute_points(v_character, 'workout', v_log, v_date, 'Lifting session');
    perform set_config('emc.internal_award', 'off', true);
    perform set_config('emc.progression_write', 'on', true);
    update public.lifting_sessions set points_awarded = v_awarded where id = v_session;
    perform set_config('emc.progression_write', 'off', true);
  end if;

  v_impact := public.character_impact(v_character);
  return v_impact || jsonb_build_object(
    'kind', 'lifting',
    'log_id', v_log,
    'session_id', v_session,
    'points_delta', v_awarded,
    'pool', 'physical',
    'status', case
      when v_approve then 'pending'
      when v_awarded > 0 then 'awarded'
      else 'none'
    end
  );
end;
$$;

create or replace function public.set_exercise_flag(
  p_exercise_id uuid,
  p_goal_id uuid,
  p_period_start date,
  p_period_end date,
  p_reward_hook text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guild uuid;
  v_id uuid;
begin
  if not public.is_curator() then
    raise exception 'A curator flags exercises';
  end if;
  select guild_id into v_guild from public.exercises where id = p_exercise_id;
  if v_guild is null or not public.is_member(v_guild) then
    raise exception 'Exercise not found';
  end if;
  insert into public.exercise_flags (
    exercise_id, guild_id, goal_id, period_start, period_end, reward_hook, created_by
  ) values (
    p_exercise_id, v_guild, p_goal_id, p_period_start, p_period_end, nullif(p_reward_hook, ''), auth.uid()
  )
  returning id into v_id;
  return v_id;
end;
$$;
