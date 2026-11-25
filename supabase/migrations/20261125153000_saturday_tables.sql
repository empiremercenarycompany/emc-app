-- Saturday tables. Adds placement columns and a request on intake.
-- Running this file does not update characters, profiles, or existing intake rows.
-- The public site calls the 2 to 5 PM block daytime. The app id is afternoon.
-- daytime is accepted on save and stored as afternoon. No daytime row is inserted.

alter table public.squads
  add column if not exists timeslot_id text references public.session_timeslots (id) on delete set null,
  add column if not exists starts_on date;

alter table public.squads drop constraint if exists squads_starts_on_check;
alter table public.squads
  add constraint squads_starts_on_check
  check (starts_on is null or starts_on in (date '2027-01-02', date '2027-01-09'));

create unique index if not exists squads_one_table
  on public.squads (guild_id, timeslot_id, starts_on)
  where timeslot_id is not null and starts_on is not null;

comment on column public.squads.timeslot_id is
  'App slot id: morning, afternoon, or evening. Null until staff place this existing squad on a Saturday table.';
comment on column public.squads.starts_on is
  'First Saturday for this squad, 2027-01-02 or 2027-01-09. The squad then plays every other Saturday.';

alter table public.player_intake
  add column if not exists preferred_squad_id uuid references public.squads (id) on delete set null,
  add column if not exists table_starts_on date,
  add column if not exists table_request text,
  add column if not exists any_open_table boolean,
  add column if not exists with_friend boolean,
  add column if not exists friend_name text;

alter table public.player_intake drop constraint if exists player_intake_table_request_check;
alter table public.player_intake
  add constraint player_intake_table_request_check
  check (table_request is null or table_request in ('seat', 'waitlist', 'ask_staff'));

alter table public.player_intake drop constraint if exists player_intake_table_starts_check;
alter table public.player_intake
  add constraint player_intake_table_starts_check
  check (table_starts_on is null or table_starts_on in (date '2027-01-02', date '2027-01-09'));

alter table public.player_intake drop constraint if exists player_intake_friend_name_len;
alter table public.player_intake
  add constraint player_intake_friend_name_len
  check (friend_name is null or char_length(friend_name) between 1 and 80);

comment on column public.player_intake.table_request is
  'seat, waitlist, or ask_staff. A request, not a booked seat. Null keeps the stored value when omitted.';
comment on column public.player_intake.preferred_squad_id is
  'Existing squad on the requested table, when one is already placed. No name is invented here.';

create index if not exists idx_player_intake_squad on public.player_intake (preferred_squad_id);

create or replace function public.normalize_timeslot_id(p_slot text)
returns text
language sql
immutable
as $$
  select case lower(btrim(coalesce(p_slot, '')))
    when 'morning' then 'morning'
    when 'afternoon' then 'afternoon'
    when 'daytime' then 'afternoon'
    when 'evening' then 'evening'
    else null
  end;
$$;

comment on function public.normalize_timeslot_id(text) is
  'Maps a slot id to morning, afternoon, or evening. The public site uses daytime for 2 to 5 PM. The app id is afternoon. daytime is stored as afternoon. Unknown ids return null. This does not rewrite existing rows.';

revoke all on function public.normalize_timeslot_id(text) from public;
grant execute on function public.normalize_timeslot_id(text) to anon, authenticated;

create or replace function public.saturday_table_board()
returns table (
  squad_id uuid,
  squad_name text,
  timeslot_id text,
  starts_on date,
  placed int
)
language sql
stable
security definer
set search_path = public
as $$
  select
    case when auth.uid() is null then null else s.id end,
    case when auth.uid() is null then null else nullif(btrim(s.name), '') end,
    s.timeslot_id,
    s.starts_on,
    (
      select count(*)::int
      from public.characters c
      where c.squad_id = s.id
    ) as placed
  from public.squads s
  where s.timeslot_id in ('morning', 'afternoon', 'evening')
    and s.starts_on in (date '2027-01-02', date '2027-01-09');
$$;

comment on function public.saturday_table_board() is
  'Placed seats only: characters already assigned to a squad. Squad names are returned only for a signed-in caller. No player names and no emails.';

revoke all on function public.saturday_table_board() from public;
grant execute on function public.saturday_table_board() to anon, authenticated;

create or replace function public.set_squad_table(p_squad_id uuid, p_timeslot text, p_starts_on date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guild uuid;
  v_slot text;
begin
  if not public.is_staff() then
    raise exception 'Staff only';
  end if;
  select guild_id into v_guild from public.squads where id = p_squad_id;
  if v_guild is null or not public.is_member(v_guild) then
    raise exception 'That squad is in another company';
  end if;
  if p_timeslot is null and p_starts_on is null then
    update public.squads
    set timeslot_id = null, starts_on = null
    where id = p_squad_id;
    return;
  end if;
  v_slot := public.normalize_timeslot_id(p_timeslot);
  if v_slot is null or p_starts_on is null or p_starts_on not in (date '2027-01-02', date '2027-01-09') then
    raise exception 'Pick your Saturday table';
  end if;
  update public.squads
  set timeslot_id = v_slot, starts_on = p_starts_on
  where id = p_squad_id;
exception
  when unique_violation then
    raise exception 'That table already has a squad.';
end;
$$;

revoke all on function public.set_squad_table(uuid, text, date) from public;
grant execute on function public.set_squad_table(uuid, text, date) to authenticated;

comment on function public.set_squad_table(uuid, text, date) is
  'Staff place an existing squad on a Saturday table. It does not rename the squad and does not move players.';

drop function if exists public.save_player_intake(text, text, text[], text, boolean, text, text, text, text, text, text, text, text, text);

create function public.save_player_intake(
  p_dnd text,
  p_gym text,
  p_goals text[],
  p_timeslot text,
  p_reminders boolean,
  p_phone text default null,
  p_species_idea text default null,
  p_class_idea text default null,
  p_backstory_idea text default null,
  p_fitness_experience text default null,
  p_age_band text default null,
  p_gym_member text default null,
  p_signup_src text default null,
  p_gym_membership_number text default null,
  p_squad_id uuid default null,
  p_starts_on date default null,
  p_table_request text default null,
  p_any_open boolean default null,
  p_with_friend boolean default null,
  p_friend_name text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot text;
  v_gym text;
  v_src text;
  v_number text;
  v_request text;
  v_friend text;
  v_squad uuid;
  v_placed int;
  v_left int;
  v_keep_table boolean;
begin
  if auth.uid() is null then
    raise exception 'Sign in first';
  end if;
  if p_dnd not in ('never', 'a_few', 'lots') then
    raise exception 'Say whether you have played before';
  end if;
  if p_gym not in ('new', 'some', 'regular') then
    raise exception 'Say how the gym feels';
  end if;
  if p_goals is null or cardinality(p_goals) < 1 then
    raise exception 'Pick at least one first goal';
  end if;
  if p_age_band is not null and p_age_band not in ('under_16', '16_17', '18_plus') then
    raise exception 'Say your age';
  end if;
  v_gym := nullif(btrim(coalesce(p_gym_member, '')), '');
  if v_gym is not null and v_gym not in ('current', 'former', 'not_yet') then
    raise exception 'Say which rate is yours';
  end if;
  v_number := nullif(btrim(coalesce(p_gym_membership_number, '')), '');
  if v_number is not null and (
    char_length(v_number) > 40
    or v_number !~ '^[A-Za-z0-9][A-Za-z0-9 -]*$'
  ) then
    raise exception 'Use the membership number from Empire Strength and Fitness';
  end if;
  if v_gym = 'current' and v_number is null then
    raise exception 'Enter your Empire Strength and Fitness membership number';
  end if;
  v_src := nullif(left(btrim(coalesce(p_signup_src, '')), 80), '');
  v_friend := nullif(btrim(coalesce(p_friend_name, '')), '');
  if p_friend_name is not null and v_friend is not null and char_length(v_friend) > 80 then
    raise exception 'Use a shorter name';
  end if;

  v_slot := public.normalize_timeslot_id(p_timeslot);
  v_request := nullif(btrim(coalesce(p_table_request, '')), '');
  if v_request is not null and v_request not in ('seat', 'waitlist', 'ask_staff') then
    raise exception 'Pick your Saturday table';
  end if;
  v_keep_table := p_squad_id is null
    and p_starts_on is null
    and v_request is null
    and p_any_open is null
    and p_with_friend is null
    and p_friend_name is null;

  if p_age_band = 'under_16' then
    if v_slot is not null or v_request is not null then
      raise exception 'Under 16 joins the teen waitlist';
    end if;
  elsif p_age_band is null and v_slot is null and v_request is null and p_starts_on is null then
    null;
  elsif v_slot is null or not exists (select 1 from public.session_timeslots where id = v_slot) then
    raise exception 'Pick your Saturday table';
  elsif p_starts_on is not null and p_starts_on not in (date '2027-01-02', date '2027-01-09') then
    raise exception 'Pick your Saturday table';
  end if;

  if p_age_band is distinct from 'under_16' and v_request is not null then
    if p_starts_on is null then
      raise exception 'Pick your Saturday table';
    end if;
    v_squad := p_squad_id;
    if v_squad is not null and not exists (
      select 1 from public.squads s
      where s.id = v_squad
        and s.timeslot_id = v_slot
        and s.starts_on = p_starts_on
    ) then
      raise exception 'Pick your Saturday table';
    end if;
    if v_squad is null then
      select s.id into v_squad
      from public.squads s
      where s.timeslot_id = v_slot and s.starts_on = p_starts_on
      limit 1;
    end if;
    v_placed := 0;
    if v_squad is not null then
      select count(*)::int into v_placed from public.characters c where c.squad_id = v_squad;
    end if;
    v_left := greatest(0, 6 - coalesce(v_placed, 0));
    if v_request = 'seat' and v_left <= 0 then
      raise exception 'This table is full. You can join the waitlist, or pick a different table.';
    end if;
    if v_request = 'seat' and coalesce(p_with_friend, false) and v_left < 2 then
      raise exception 'This table has only one seat left, so we won''t split you up. Ask staff about this table, or pick a table with two open seats.';
    end if;
    if v_request = 'waitlist' and v_left > 0 then
      raise exception 'Pick your Saturday table';
    end if;
    if v_request = 'ask_staff' and not (coalesce(p_with_friend, false) and v_left = 1) then
      raise exception 'This table has only one seat left, so we won''t split you up. Ask staff about this table, or pick a table with two open seats.';
    end if;
  else
    v_squad := p_squad_id;
  end if;

  if p_phone is not null and btrim(p_phone) <> '' and (
    char_length(btrim(p_phone)) > 40
    or btrim(p_phone) !~ '^[0-9+(). -]{7,40}$'
  ) then
    raise exception 'Use a phone number, or leave it blank';
  end if;
  if p_species_idea is not null and char_length(btrim(p_species_idea)) > 80 then
    raise exception 'Use a shorter species idea';
  end if;
  if p_class_idea is not null and char_length(btrim(p_class_idea)) > 80 then
    raise exception 'Use a shorter class idea';
  end if;
  if p_fitness_experience is not null and char_length(btrim(p_fitness_experience)) > 600 then
    raise exception 'Use a shorter fitness note';
  end if;
  if p_backstory_idea is not null and char_length(btrim(p_backstory_idea)) > 2000 then
    raise exception 'Use a shorter backstory';
  end if;

  insert into public.player_intake (
    user_id,
    dnd_experience,
    gym_experience,
    first_goals,
    timeslot_id,
    session_reminders,
    phone,
    species_idea,
    class_idea,
    backstory_idea,
    fitness_experience,
    age_band,
    teen_waitlist,
    gym_member,
    gym_membership_number,
    signup_src,
    preferred_squad_id,
    table_starts_on,
    table_request,
    any_open_table,
    with_friend,
    friend_name,
    updated_at
  ) values (
    auth.uid(),
    p_dnd,
    p_gym,
    p_goals,
    case when p_age_band = 'under_16' then null else v_slot end,
    coalesce(p_reminders, false),
    nullif(btrim(p_phone), ''),
    nullif(btrim(p_species_idea), ''),
    nullif(btrim(p_class_idea), ''),
    nullif(btrim(p_backstory_idea), ''),
    nullif(btrim(p_fitness_experience), ''),
    p_age_band,
    coalesce(p_age_band = 'under_16', false),
    v_gym,
    case when p_gym_membership_number is null then null else v_number end,
    case when p_signup_src is null then null else v_src end,
    case when p_age_band = 'under_16' or v_keep_table then null else v_squad end,
    case when p_age_band = 'under_16' or v_keep_table then null else p_starts_on end,
    case when p_age_band = 'under_16' or v_keep_table then null else v_request end,
    case when p_age_band = 'under_16' then false else coalesce(p_any_open, false) end,
    case when p_age_band = 'under_16' then false else coalesce(p_with_friend, false) end,
    case when p_age_band = 'under_16' or not coalesce(p_with_friend, false) then null else v_friend end,
    now()
  )
  on conflict (user_id) do update
  set dnd_experience = excluded.dnd_experience,
      gym_experience = excluded.gym_experience,
      first_goals = excluded.first_goals,
      timeslot_id = case
        when p_age_band = 'under_16' then null
        when p_age_band is null and v_slot is null then player_intake.timeslot_id
        else excluded.timeslot_id
      end,
      session_reminders = excluded.session_reminders,
      phone = case when p_phone is null then player_intake.phone else excluded.phone end,
      species_idea = case when p_species_idea is null then player_intake.species_idea else excluded.species_idea end,
      class_idea = case when p_class_idea is null then player_intake.class_idea else excluded.class_idea end,
      backstory_idea = case when p_backstory_idea is null then player_intake.backstory_idea else excluded.backstory_idea end,
      fitness_experience = case when p_fitness_experience is null then player_intake.fitness_experience else excluded.fitness_experience end,
      age_band = case when p_age_band is null then player_intake.age_band else excluded.age_band end,
      teen_waitlist = case when p_age_band is null then player_intake.teen_waitlist else excluded.teen_waitlist end,
      gym_member = case when p_gym_member is null then player_intake.gym_member else excluded.gym_member end,
      gym_membership_number = case
        when p_gym_membership_number is null then player_intake.gym_membership_number
        else excluded.gym_membership_number
      end,
      signup_src = case when p_signup_src is null then player_intake.signup_src else excluded.signup_src end,
      preferred_squad_id = case
        when p_age_band = 'under_16' then null
        when v_keep_table then player_intake.preferred_squad_id
        else excluded.preferred_squad_id
      end,
      table_starts_on = case
        when p_age_band = 'under_16' then null
        when v_keep_table then player_intake.table_starts_on
        else excluded.table_starts_on
      end,
      table_request = case
        when p_age_band = 'under_16' then null
        when v_keep_table then player_intake.table_request
        else excluded.table_request
      end,
      any_open_table = case
        when p_age_band = 'under_16' then false
        when p_any_open is null then player_intake.any_open_table
        else excluded.any_open_table
      end,
      with_friend = case
        when p_age_band = 'under_16' then false
        when p_with_friend is null then player_intake.with_friend
        else excluded.with_friend
      end,
      friend_name = case
        when p_age_band = 'under_16' then null
        when p_friend_name is null then player_intake.friend_name
        when not coalesce(p_with_friend, player_intake.with_friend, false) then null
        else excluded.friend_name
      end,
      updated_at = now();
end;
$$;

revoke all on function public.save_player_intake(text, text, text[], text, boolean, text, text, text, text, text, text, text, text, text, uuid, date, text, boolean, boolean, text) from public, anon;
grant execute on function public.save_player_intake(text, text, text[], text, boolean, text, text, text, text, text, text, text, text, text, uuid, date, text, boolean, boolean, text) to authenticated;

comment on function public.save_player_intake(text, text, text[], text, boolean, text, text, text, text, text, text, text, text, text, uuid, date, text, boolean, boolean, text) is
  'Saves intake. daytime is stored as afternoon. Ages 16 and up may pick any Saturday table. A null table argument keeps the stored table. Under 16 clears the table and joins the teen waitlist.';
