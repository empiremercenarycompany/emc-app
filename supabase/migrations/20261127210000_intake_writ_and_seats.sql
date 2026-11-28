-- Optional membership number, Game Grid writ, under-16 clears the rate.
-- Additive to existing rows. Review and apply by hand. Not applied to live Supabase by this change.

alter table public.player_intake
  add column if not exists writ_number text;

alter table public.player_intake drop constraint if exists player_intake_writ_number_len;
alter table public.player_intake
  add constraint player_intake_writ_number_len
  check (writ_number is null or char_length(writ_number) <= 20);

drop function if exists public.save_player_intake(text, text, text[], text, boolean, text, text, text, text, text, text, text, text, text, uuid, date, text, boolean, boolean, text);

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
  p_friend_name text default null,
  p_writ_number text default null
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
  v_writ text;
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
  v_number := nullif(btrim(regexp_replace(btrim(coalesce(p_gym_membership_number, '')), '^#+', '')), '');
  if v_number is not null and (
    char_length(v_number) > 40
    or v_number !~ '^[A-Za-z0-9][A-Za-z0-9 -]*$'
  ) then
    raise exception 'Use the membership number from Empire Strength and Fitness';
  end if;
  v_src := nullif(left(btrim(coalesce(p_signup_src, '')), 80), '');
  v_writ := nullif(upper(left(btrim(coalesce(p_writ_number, '')), 20)), '');
  if p_age_band = 'under_16' then
    v_gym := null;
    v_number := null;
    v_writ := null;
  elsif p_signup_src is not null and position('gamegrid' in lower(coalesce(v_src, ''))) = 0 then
    v_writ := null;
  end if;
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
    writ_number,
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
    case
      when p_age_band = 'under_16' then null
      when p_writ_number is null and p_signup_src is null then null
      else v_writ
    end,
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
      gym_member = case
        when p_age_band = 'under_16' then null
        when p_gym_member is null then player_intake.gym_member
        else excluded.gym_member
      end,
      gym_membership_number = case
        when p_age_band = 'under_16' then null
        when p_gym_membership_number is null then player_intake.gym_membership_number
        else excluded.gym_membership_number
      end,
      signup_src = case when p_signup_src is null then player_intake.signup_src else excluded.signup_src end,
      writ_number = case
        when p_age_band = 'under_16' then null
        when p_signup_src is not null and position('gamegrid' in lower(coalesce(v_src, ''))) = 0 then null
        when p_writ_number is null then player_intake.writ_number
        else excluded.writ_number
      end,
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


revoke all on function public.save_player_intake(text, text, text[], text, boolean, text, text, text, text, text, text, text, text, text, uuid, date, text, boolean, boolean, text, text) from public, anon;
grant execute on function public.save_player_intake(text, text, text[], text, boolean, text, text, text, text, text, text, text, text, text, uuid, date, text, boolean, boolean, text, text) to authenticated;

create or replace function public.set_checkout_plan(p_user_id uuid, p_plan text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text;
begin
  if auth.uid() is null then
    raise exception 'Sign in first';
  end if;
  if not public.is_staff() then
    raise exception 'Staff only';
  end if;
  v_plan := nullif(btrim(coalesce(p_plan, '')), '');
  if v_plan is not null and v_plan not in ('member', 'standard') then
    raise exception 'Choose a price';
  end if;
  if v_plan = 'member' and not exists (
    select 1 from public.player_intake
    where user_id = p_user_id and gym_member = 'current' and membership_verified
  ) then
    raise exception 'Verify membership before sending the $60 link';
  end if;
  update public.player_intake
  set checkout_plan = v_plan, updated_at = now()
  where user_id = p_user_id;
  if not found then
    raise exception 'No enlistment for that player';
  end if;
end;
$$;

create or replace function public.saturday_pending_seats()
returns table (timeslot_id text, starts_on date, pending int)
language sql
stable
security definer
set search_path = public
as $$
  select i.timeslot_id, i.table_starts_on, count(*)::int
  from public.player_intake i
  where i.table_request = 'seat'
    and i.timeslot_id is not null
    and i.table_starts_on is not null
    and coalesce(i.teen_waitlist, false) = false
    and not exists (
      select 1 from public.characters c
      join public.squads s on s.id = c.squad_id
      where c.user_id = i.user_id
        and s.timeslot_id = i.timeslot_id
        and s.starts_on = i.table_starts_on
    )
  group by i.timeslot_id, i.table_starts_on;
$$;

revoke all on function public.saturday_pending_seats() from public;
grant execute on function public.saturday_pending_seats() to anon, authenticated;
