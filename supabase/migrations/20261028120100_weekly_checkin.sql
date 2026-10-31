-- Weekly check-in. Compliance tracking beside the attribute bank, not a second bank.

create table public.weekly_checkins (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds (id) on delete cascade,
  character_id uuid not null references public.characters (id) on delete cascade,
  squad_id uuid references public.squads (id) on delete set null,
  week_start date not null,
  workouts int not null check (workouts >= 0),
  bonus_count int not null default 0 check (bonus_count >= 0),
  bonus_activities text,
  wis boolean not null default false,
  int_mark boolean not null default false,
  cha boolean not null default false,
  note text,
  injury_sub boolean not null default false,
  score int not null check (score between 0 and 2),
  override_score int check (override_score is null or override_score between 0 and 2),
  override_note text,
  created_at timestamptz not null default now(),
  unique (character_id, week_start)
);

create table public.compliance_tiers (
  id text primary key,
  kind text not null check (kind in ('depth', 'clearance')),
  threshold int not null,
  unlocks text not null default ''
);

alter table public.weekly_checkins enable row level security;
alter table public.compliance_tiers enable row level security;

create index idx_weekly_checkins_character on public.weekly_checkins (character_id);
create index idx_weekly_checkins_squad on public.weekly_checkins (squad_id);
create index idx_weekly_checkins_guild_week on public.weekly_checkins (guild_id, week_start);

create policy weekly_checkins_select on public.weekly_checkins
  for select to authenticated
  using (
    public.owns_character(character_id)
    or public.is_staff()
    or (
      squad_id is not null
      and exists (
        select 1 from public.characters mine
        where mine.user_id = (select auth.uid())
          and mine.squad_id = weekly_checkins.squad_id
      )
    )
  );

create policy weekly_checkins_insert on public.weekly_checkins
  for insert to authenticated
  with check (public.owns_character(character_id));

create policy compliance_tiers_select on public.compliance_tiers
  for select to authenticated using (true);

create policy compliance_tiers_write on public.compliance_tiers
  for insert to authenticated
  with check (public.is_dm() or public.is_admin());

create policy compliance_tiers_update on public.compliance_tiers
  for update to authenticated
  using (public.is_dm() or public.is_admin())
  with check (public.is_dm() or public.is_admin());

insert into public.compliance_tiers (id, kind, threshold, unlocks) values
  ('depth-60', 'depth', 60, ''),
  ('depth-70', 'depth', 70, ''),
  ('depth-80', 'depth', 80, ''),
  ('depth-90', 'depth', 90, ''),
  ('depth-100', 'depth', 100, ''),
  ('clearance-10', 'clearance', 10, ''),
  ('clearance-25', 'clearance', 25, ''),
  ('clearance-50', 'clearance', 50, ''),
  ('clearance-75', 'clearance', 75, ''),
  ('clearance-100', 'clearance', 100, '');

create or replace function public.checkin_score(
  p_workouts int,
  p_wis boolean,
  p_int boolean,
  p_cha boolean
) returns int
language sql
immutable
set search_path = public
as $$
  select case
    when p_workouts <= 1 then 0
    else greatest(0, 2 - (
      (case when p_workouts = 2 then 1 else 0 end)
      + (case when p_wis then 0 else 1 end)
      + (case when p_int then 0 else 1 end)
      + (case when p_cha then 0 else 1 end)
    ))
  end;
$$;

create or replace function public.submit_weekly_checkin(
  p_week_start date,
  p_workouts int,
  p_bonus_count int,
  p_bonus_activities text,
  p_wis boolean,
  p_int boolean,
  p_cha boolean,
  p_note text,
  p_injury boolean
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_character uuid;
  v_guild uuid;
  v_squad uuid;
  v_score int;
  v_id uuid;
  v_tz text;
  v_now timestamp;
  v_cutoff timestamp;
begin
  select id, guild_id, squad_id into v_character, v_guild, v_squad
  from public.characters where user_id = auth.uid();
  if v_character is null then
    raise exception 'Create a character first';
  end if;
  select checkin_time_zone into v_tz from public.scoring_config where id = 1;
  v_now := timezone(v_tz, now());
  v_cutoff := (p_week_start + 4) + time '23:59';
  if v_now > v_cutoff and not public.is_log_approver() then
    raise exception 'Check-in is closed for that week';
  end if;
  v_score := public.checkin_score(p_workouts, p_wis, p_int, p_cha);
  insert into public.weekly_checkins (
    guild_id, character_id, squad_id, week_start, workouts, bonus_count, bonus_activities,
    wis, int_mark, cha, note, injury_sub, score
  ) values (
    v_guild, v_character, v_squad, p_week_start, p_workouts, coalesce(p_bonus_count, 0),
    nullif(p_bonus_activities, ''), p_wis, p_int, p_cha, nullif(p_note, ''),
    coalesce(p_injury, false), v_score
  )
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.override_checkin(p_id uuid, p_score int, p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_character uuid;
begin
  if not (public.is_dm() or public.is_admin()) then
    raise exception 'Staff role required';
  end if;
  if p_note is null or length(btrim(p_note)) = 0 then
    raise exception 'An audit note is required';
  end if;
  update public.weekly_checkins
  set override_score = p_score, override_note = btrim(p_note)
  where id = p_id
  returning character_id into v_character;
  if v_character is null then
    raise exception 'Check-in not found';
  end if;
  perform public.write_award_audit(v_character, 'checkin', null, p_score, btrim(p_note));
end;
$$;

alter table public.award_audit drop constraint award_audit_kind_check;
alter table public.award_audit add constraint award_audit_kind_check
  check (kind in (
    'grant', 'approval', 'spend', 'muster', 'attendance', 'workout', 'goal', 'bonus', 'checkin'
  ));

create or replace function public.compliance_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_weeks int;
  v_company_roster int;
  v_company_earned int;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  select count(distinct week_start), coalesce(sum(coalesce(override_score, score)), 0)
    into v_weeks, v_company_earned
  from public.weekly_checkins;
  select count(*) into v_company_roster
  from public.characters where squad_id is not null;
  return jsonb_build_object(
    'company', jsonb_build_object(
      'earned', v_company_earned,
      'roster', v_company_roster,
      'weeks', v_weeks,
      'ratio', case
        when v_company_roster = 0 or v_weeks = 0 then null
        else v_company_earned::numeric / (2 * v_company_roster * v_weeks)
      end
    ),
    'squads', coalesce((
      select jsonb_agg(jsonb_build_object(
        'squad', s.name,
        'earned', coalesce(sum(coalesce(c.override_score, c.score)), 0),
        'roster', (select count(*) from public.characters ch where ch.squad_id = s.id)
      ) order by s.name)
      from public.squads s
      left join public.weekly_checkins c on c.squad_id = s.id
      group by s.id, s.name
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.export_checkins()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'Staff role required';
  end if;
  return coalesce((
    select jsonb_agg(to_jsonb(c) order by c.week_start, c.created_at)
    from public.weekly_checkins c
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.checkin_score(int, boolean, boolean, boolean) from public, anon;
revoke all on function public.submit_weekly_checkin(date, int, int, text, boolean, boolean, boolean, text, boolean) from public, anon;
revoke all on function public.override_checkin(uuid, int, text) from public, anon;
revoke all on function public.compliance_summary() from public, anon;
revoke all on function public.export_checkins() from public, anon;

grant execute on function public.checkin_score(int, boolean, boolean, boolean) to authenticated;
grant execute on function public.submit_weekly_checkin(date, int, int, text, boolean, boolean, boolean, text, boolean) to authenticated;
grant execute on function public.override_checkin(uuid, int, text) to authenticated;
grant execute on function public.compliance_summary() to authenticated;
grant execute on function public.export_checkins() to authenticated;

revoke all on public.weekly_checkins from public, anon;
revoke all on public.compliance_tiers from public, anon;
grant select, insert on public.weekly_checkins to authenticated;
grant select, insert, update on public.compliance_tiers to authenticated;
