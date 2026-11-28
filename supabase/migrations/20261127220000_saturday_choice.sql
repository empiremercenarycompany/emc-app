-- First and second Saturday choice. Availability is counts only.
-- Additive. Existing intake rows stay on their first table. Not applied to live Supabase.

alter table public.player_intake
  add column if not exists second_timeslot_id text,
  add column if not exists second_starts_on date,
  add column if not exists held_choice text;

alter table public.player_intake drop constraint if exists player_intake_held_choice_check;
alter table public.player_intake
  add constraint player_intake_held_choice_check
  check (held_choice is null or held_choice in ('first', 'second', 'waitlist'));

comment on column public.player_intake.held_choice is
  'first or second is the time they can pay for. waitlist means both were full. No charge until a seat opens.';

create or replace function public.saturday_availability()
returns table (timeslot_id text, starts_on date, open int, full boolean)
language sql
stable
security definer
set search_path = public
as $$
  with slots as (
    select * from (values
      ('morning'::text, date '2027-01-02'),
      ('afternoon', date '2027-01-02'),
      ('evening', date '2027-01-02'),
      ('morning', date '2027-01-09'),
      ('afternoon', date '2027-01-09'),
      ('evening', date '2027-01-09')
    ) as t(timeslot_id, starts_on)
  ),
  placed as (
    select s.timeslot_id, s.starts_on, count(c.id)::int as n
    from public.squads s
    left join public.characters c on c.squad_id = s.id
    where s.timeslot_id in ('morning', 'afternoon', 'evening')
      and s.starts_on in (date '2027-01-02', date '2027-01-09')
    group by s.timeslot_id, s.starts_on
  ),
  pending as (
    select
      case when i.held_choice = 'second' then i.second_timeslot_id else i.timeslot_id end as timeslot_id,
      case when i.held_choice = 'second' then i.second_starts_on else i.table_starts_on end as starts_on,
      sum(case when coalesce(i.with_friend, false) then 2 else 1 end)::int as n
    from public.player_intake i
    where i.table_request = 'seat'
      and coalesce(i.teen_waitlist, false) = false
      and case when i.held_choice = 'second' then i.second_timeslot_id else i.timeslot_id end is not null
    group by 1, 2
  ),
  paid as (
    select
      split_part(sold.slot, ':', 1) as timeslot_id,
      split_part(sold.slot, ':', 2)::date as starts_on,
      sum(sold.seats)::int as n
    from (
      select
        regexp_replace(
          case
            when coalesce(r.metadata->>'checkout_slot', '') = 'second' then coalesce(r.metadata->>'preferred_slot_2', '')
            else coalesce(r.metadata->>'preferred_slot', '')
          end,
          '^daytime:',
          'afternoon:'
        ) as slot,
        case
          when coalesce(r.metadata->>'joining_with_friend', '') in ('true', 't', 'yes', '1') then 2
          else 1
        end as seats
      from public.site_checkout_records r
      where r.status = 'paid'
        and not exists (
          select 1
          from public.profiles p
          join public.player_intake i on i.user_id = p.id
          where lower(p.email) = r.email
            and i.table_request = 'seat'
        )
    ) sold
    where sold.slot ~ '^(morning|afternoon|evening):2027-01-0[29]$'
    group by 1, 2
  )
  select
    slots.timeslot_id,
    slots.starts_on,
    greatest(0, 6 - coalesce(placed.n, 0) - coalesce(pending.n, 0) - coalesce(paid.n, 0))::int as open,
    (coalesce(placed.n, 0) + coalesce(pending.n, 0) + coalesce(paid.n, 0)) >= 6 as full
  from slots
  left join placed on placed.timeslot_id = slots.timeslot_id and placed.starts_on = slots.starts_on
  left join pending on pending.timeslot_id = slots.timeslot_id and pending.starts_on = slots.starts_on
  left join paid on paid.timeslot_id = slots.timeslot_id and paid.starts_on = slots.starts_on;
$$;

revoke all on function public.saturday_availability() from public;
grant execute on function public.saturday_availability() to anon, authenticated;

comment on function public.saturday_availability() is
  'Open seats per Saturday table. Counts only. No names and no emails.';

create or replace function public.saturday_slot_open_raw(p_slot text, p_exclude uuid default null)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select 6 - coalesce((
    select count(*)::int from public.characters c
    join public.squads s on s.id = c.squad_id
    where s.timeslot_id = split_part(p_slot, ':', 1)
      and s.starts_on = split_part(p_slot, ':', 2)::date
      and (p_exclude is null or c.user_id is distinct from p_exclude)
  ), 0) - coalesce((
    select coalesce(sum(case when coalesce(i.with_friend, false) then 2 else 1 end), 0)::int from public.player_intake i
    where i.table_request = 'seat'
      and coalesce(i.teen_waitlist, false) = false
      and (p_exclude is null or i.user_id is distinct from p_exclude)
      and (
        (coalesce(i.held_choice, 'first') <> 'second' and i.timeslot_id = split_part(p_slot, ':', 1) and i.table_starts_on = split_part(p_slot, ':', 2)::date)
        or (i.held_choice = 'second' and i.second_timeslot_id = split_part(p_slot, ':', 1) and i.second_starts_on = split_part(p_slot, ':', 2)::date)
      )
  ), 0) - coalesce((
    select coalesce(sum(case
      when coalesce(r.metadata->>'joining_with_friend', '') in ('true', 't', 'yes', '1') then 2
      else 1
    end), 0)::int from public.site_checkout_records r
    where r.status = 'paid'
      and regexp_replace(
        case
          when coalesce(r.metadata->>'checkout_slot', '') = 'second' then coalesce(r.metadata->>'preferred_slot_2', '')
          else coalesce(r.metadata->>'preferred_slot', '')
        end,
        '^daytime:',
        'afternoon:'
      ) = p_slot
      and not exists (
        select 1 from public.profiles p
        join public.player_intake i on i.user_id = p.id
        where lower(p.email) = r.email and i.table_request = 'seat'
      )
      and (p_exclude is null or not exists (
        select 1 from public.profiles p where p.id = p_exclude and lower(p.email) = r.email
      ))
  ), 0);
$$;

revoke all on function public.saturday_slot_open_raw(text, uuid) from public, anon, authenticated;

create or replace function public.assign_saturday_choices(p_second_slot text, p_second_start date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_first_slot text;
  v_first_start date;
  v_friend boolean;
  v_teen boolean;
  v_need int;
  v_first_open int;
  v_second_open int;
  v_second text;
  v_outcome text;
begin
  if auth.uid() is null then
    raise exception 'Sign in first';
  end if;
  select timeslot_id, table_starts_on, coalesce(with_friend, false), coalesce(teen_waitlist, false)
    into v_first_slot, v_first_start, v_friend, v_teen
  from public.player_intake
  where user_id = auth.uid();
  if v_teen or v_first_slot is null then
    return jsonb_build_object('outcome', 'waitlist', 'teen', v_teen);
  end if;
  if v_first_start is null then
    update public.player_intake
    set held_choice = 'first',
        table_request = 'seat',
        updated_at = now()
    where user_id = auth.uid();
    return jsonb_build_object('outcome', 'first');
  end if;
  v_second := nullif(btrim(coalesce(p_second_slot, '')), '');
  if v_second is not null and p_second_start is not null
     and v_second = v_first_slot and p_second_start = v_first_start then
    raise exception 'Pick a different second time';
  end if;
  v_need := case when v_friend then 2 else 1 end;
  v_first_open := public.saturday_slot_open_raw(v_first_slot || ':' || v_first_start::text, auth.uid());
  v_second_open := case
    when v_second is null or p_second_start is null then null
    else public.saturday_slot_open_raw(v_second || ':' || p_second_start::text, auth.uid())
  end;
  if v_first_open >= v_need then
    v_outcome := 'first';
  elsif v_second_open is not null and v_second_open >= v_need then
    v_outcome := 'second';
  else
    v_outcome := 'waitlist';
  end if;
  update public.player_intake
  set second_timeslot_id = v_second,
      second_starts_on = case when v_second is null then null else p_second_start end,
      held_choice = v_outcome,
      table_request = case when v_outcome = 'waitlist' then 'waitlist' else 'seat' end,
      updated_at = now()
  where user_id = auth.uid();
  return jsonb_build_object(
    'outcome', v_outcome,
    'first_open', v_first_open,
    'second_open', v_second_open
  );
end;
$$;

revoke all on function public.assign_saturday_choices(text, date) from public, anon;
grant execute on function public.assign_saturday_choices(text, date) to authenticated;

create or replace function public.open_waitlist_seat(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_first text;
  v_second text;
  v_friend boolean;
  v_need int;
  v_first_open int;
  v_second_open int;
  v_outcome text;
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'Staff only';
  end if;
  select p.email,
         i.timeslot_id || ':' || i.table_starts_on::text,
         case when i.second_timeslot_id is null then null else i.second_timeslot_id || ':' || i.second_starts_on::text end,
         coalesce(i.with_friend, false)
    into v_email, v_first, v_second, v_friend
  from public.player_intake i
  join public.profiles p on p.id = i.user_id
  where i.user_id = p_user_id;
  if v_email is null then
    raise exception 'No enlistment for that player';
  end if;
  v_need := case when v_friend then 2 else 1 end;
  v_first_open := public.saturday_slot_open_raw(v_first);
  v_second_open := case when v_second is null then null else public.saturday_slot_open_raw(v_second) end;
  if v_first_open >= v_need then
    v_outcome := 'first';
  elsif v_second_open is not null and v_second_open >= v_need then
    v_outcome := 'second';
  else
    raise exception 'Neither time has a seat yet';
  end if;
  update public.player_intake
  set held_choice = v_outcome,
      table_request = 'seat',
      updated_at = now()
  where user_id = p_user_id;
  return jsonb_build_object('email', v_email, 'outcome', v_outcome);
end;
$$;

revoke all on function public.open_waitlist_seat(uuid) from public, anon;
grant execute on function public.open_waitlist_seat(uuid) to authenticated;

-- preferred_slot stays the first choice. preferred_slot_2 is the second.
-- checkout_slot says which one this session is paying for.
-- A wrong secret returns the same allowed:false as a missing row.
create or replace function public.resume_checkout_gate(p_secret text, p_email text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_expected text;
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_held text;
  v_first text;
  v_second text;
  v_teen boolean := false;
  v_paid boolean;
  v_friend boolean := false;
  v_need int;
  v_first_open int;
  v_second_open int;
  v_row jsonb;
begin
  select btrim(write_secret) into v_expected from public.billing_runtime where id = 1;
  if v_expected is null or btrim(coalesce(p_secret, '')) is distinct from v_expected then
    return jsonb_build_object('allowed', false);
  end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    return jsonb_build_object('allowed', false);
  end if;
  select exists (
    select 1 from public.site_checkout_records r where r.email = v_email and r.status = 'paid'
  ) into v_paid;
  if v_paid then
    return jsonb_build_object('allowed', false);
  end if;
  select coalesce(i.teen_waitlist, false),
         i.held_choice,
         case when i.timeslot_id is null or i.table_starts_on is null then '' else i.timeslot_id || ':' || i.table_starts_on::text end,
         case when i.second_timeslot_id is null or i.second_starts_on is null then '' else i.second_timeslot_id || ':' || i.second_starts_on::text end,
         coalesce(i.with_friend, false)
    into v_teen, v_held, v_first, v_second, v_friend
  from public.player_intake i
  join public.profiles p on p.id = i.user_id
  where lower(p.email) = v_email
  limit 1;
  if v_teen or v_held = 'waitlist' then
    return jsonb_build_object('allowed', false);
  end if;
  if v_held = 'second' then
    return jsonb_build_object('allowed', true, 'preferred_slot', v_first, 'preferred_slot_2', v_second, 'checkout_slot', 'second');
  end if;
  if v_held = 'first' then
    return jsonb_build_object('allowed', true, 'preferred_slot', v_first, 'preferred_slot_2', coalesce(v_second, ''), 'checkout_slot', 'first');
  end if;
  if to_regclass('public.site_signups') is null then
    return jsonb_build_object('allowed', false);
  end if;
  select to_jsonb(s) into v_row
  from public.site_signups s
  where lower(s.email) = v_email
  order by s.created_at desc
  limit 1;
  if v_row is null then
    return jsonb_build_object('allowed', false);
  end if;
  if coalesce(v_row->>'age_group', '') = 'under_16' or coalesce(v_row->>'teen_waitlist', '') in ('true', 't', '1', 'yes') then
    return jsonb_build_object('allowed', false);
  end if;
  v_first := regexp_replace(coalesce(v_row->>'preferred_slot', ''), '^daytime:', 'afternoon:');
  v_second := regexp_replace(coalesce(v_row->>'preferred_slot_2', ''), '^daytime:', 'afternoon:');
  v_friend := coalesce(v_row->>'joining_with_friend', '') in ('true', 't', 'yes', '1');
  v_need := case when v_friend then 2 else 1 end;
  if v_first !~ '^(morning|afternoon|evening):[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    return jsonb_build_object('allowed', true, 'preferred_slot', v_first, 'preferred_slot_2', v_second, 'checkout_slot', 'first');
  end if;
  v_first_open := public.saturday_slot_open_raw(v_first);
  v_second_open := case
    when v_second ~ '^(morning|afternoon|evening):[0-9]{4}-[0-9]{2}-[0-9]{2}$' then public.saturday_slot_open_raw(v_second)
    else null
  end;
  if v_first_open >= v_need then
    return jsonb_build_object('allowed', true, 'preferred_slot', v_first, 'preferred_slot_2', v_second, 'checkout_slot', 'first');
  end if;
  if v_second_open is not null and v_second_open >= v_need then
    return jsonb_build_object('allowed', true, 'preferred_slot', v_first, 'preferred_slot_2', v_second, 'checkout_slot', 'second');
  end if;
  return jsonb_build_object('allowed', false);
end;
$$;

revoke all on function public.resume_checkout_gate(text, text) from public;
grant execute on function public.resume_checkout_gate(text, text) to anon, authenticated;

create or replace function public.note_oversold_payment(p_secret text, p_email text, p_slot text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expected text;
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_slot text := btrim(coalesce(p_slot, ''));
  v_time text;
  v_start date;
  v_over boolean := false;
  v_user uuid;
begin
  select btrim(write_secret) into v_expected from public.billing_runtime where id = 1;
  if v_expected is null or btrim(coalesce(p_secret, '')) is distinct from v_expected then
    return false;
  end if;
  if v_slot !~ '^(morning|afternoon|evening):[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    return false;
  end if;
  v_time := split_part(v_slot, ':', 1);
  v_start := split_part(v_slot, ':', 2)::date;
  with holds as (
    select lower(p.email) as email, 1 as seats, timestamp '2020-01-01' as at, 0 as tie
    from public.characters c
    join public.squads s on s.id = c.squad_id
    left join public.profiles p on p.id = c.user_id
    where s.timeslot_id = v_time and s.starts_on = v_start
    union all
    select lower(pr.email),
           case when coalesce(i.with_friend, false) then 2 else 1 end,
           i.updated_at,
           1
    from public.player_intake i
    join public.profiles pr on pr.id = i.user_id
    where i.table_request = 'seat'
      and coalesce(i.teen_waitlist, false) = false
      and (
        (coalesce(i.held_choice, 'first') <> 'second' and i.timeslot_id = v_time and i.table_starts_on = v_start)
        or (i.held_choice = 'second' and i.second_timeslot_id = v_time and i.second_starts_on = v_start)
      )
      and not exists (
        select 1 from public.characters c
        join public.squads s on s.id = c.squad_id
        where c.user_id = i.user_id and s.timeslot_id = v_time and s.starts_on = v_start
      )
    union all
    select r.email,
           case when coalesce(r.metadata->>'joining_with_friend', '') in ('true', 't', 'yes', '1') then 2 else 1 end,
           coalesce(r.paid_at, r.updated_at),
           2
    from public.site_checkout_records r
    where r.status = 'paid'
      and regexp_replace(
        case
          when coalesce(r.metadata->>'checkout_slot', '') = 'second' then coalesce(r.metadata->>'preferred_slot_2', '')
          else coalesce(r.metadata->>'preferred_slot', '')
        end,
        '^daytime:',
        'afternoon:'
      ) = v_slot
      and not exists (
        select 1 from public.profiles p
        join public.player_intake i on i.user_id = p.id
        where lower(p.email) = r.email and i.table_request = 'seat'
      )
  ),
  ordered as (
    select email, sum(seats) over (order by at, tie, email) as running
    from holds
    where email is not null
  )
  select (running > 6) into v_over
  from ordered
  where email = v_email
  order by running desc
  limit 1;
  if coalesce(v_over, false) then
    select id into v_user from public.profiles where lower(email) = v_email limit 1;
    if v_user is not null then
      update public.player_intake
      set placement_status = 'no_time',
          placement_marked_at = now()
      where user_id = v_user
        and placement_status is null;
    end if;
    return true;
  end if;
  return false;
end;
$$;

revoke all on function public.note_oversold_payment(text, text, text) from public;
grant execute on function public.note_oversold_payment(text, text, text) to anon, authenticated;

create or replace function public.saturday_pending_seats()
returns table (timeslot_id text, starts_on date, pending int)
language sql
stable
security definer
set search_path = public
as $$
  with intake_holds as (
    select
      case when i.held_choice = 'second' then i.second_timeslot_id else i.timeslot_id end as timeslot_id,
      case when i.held_choice = 'second' then i.second_starts_on else i.table_starts_on end as starts_on,
      case when coalesce(i.with_friend, false) then 2 else 1 end as seats
    from public.player_intake i
    where i.table_request = 'seat'
      and coalesce(i.teen_waitlist, false) = false
      and case when i.held_choice = 'second' then i.second_timeslot_id else i.timeslot_id end is not null
      and case when i.held_choice = 'second' then i.second_starts_on else i.table_starts_on end is not null
      and not exists (
        select 1 from public.characters c
        join public.squads s on s.id = c.squad_id
        where c.user_id = i.user_id
          and s.timeslot_id = case when i.held_choice = 'second' then i.second_timeslot_id else i.timeslot_id end
          and s.starts_on = case when i.held_choice = 'second' then i.second_starts_on else i.table_starts_on end
      )
  ),
  paid_holds as (
    select
      split_part(sold.slot, ':', 1) as timeslot_id,
      split_part(sold.slot, ':', 2)::date as starts_on,
      sold.seats
    from (
      select
        regexp_replace(
          case
            when coalesce(r.metadata->>'checkout_slot', '') = 'second' then coalesce(r.metadata->>'preferred_slot_2', '')
            else coalesce(r.metadata->>'preferred_slot', '')
          end,
          '^daytime:',
          'afternoon:'
        ) as slot,
        case
          when coalesce(r.metadata->>'joining_with_friend', '') in ('true', 't', 'yes', '1') then 2
          else 1
        end as seats
      from public.site_checkout_records r
      where r.status = 'paid'
        and not exists (
          select 1 from public.profiles p
          join public.player_intake i on i.user_id = p.id
          where lower(p.email) = r.email and i.table_request = 'seat'
        )
    ) sold
    where sold.slot ~ '^(morning|afternoon|evening):[0-9]{4}-[0-9]{2}-[0-9]{2}$'
  )
  select timeslot_id, starts_on, sum(seats)::int as pending
  from (
    select * from intake_holds
    union all
    select * from paid_holds
  ) holds
  group by timeslot_id, starts_on;
$$;

revoke all on function public.saturday_pending_seats() from public;
grant execute on function public.saturday_pending_seats() to anon, authenticated;

drop function if exists public.site_signup_for_checkout(text);

create or replace function public.site_signup_for_checkout_inner(p_email text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_row jsonb;
  v_paid boolean := false;
begin
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    return null;
  end if;
  select exists (
    select 1 from public.site_checkout_records r where r.email = v_email and r.status = 'paid'
  ) into v_paid;
  if to_regclass('public.site_signups') is null then
    return case when v_paid then jsonb_build_object('paid', true, 'email', v_email) else null end;
  end if;
  select to_jsonb(s) into v_row
  from public.site_signups s
  where lower(s.email) = v_email
  order by s.created_at desc
  limit 1;
  if v_row is null then
    if v_paid then
      select metadata into v_row from public.site_checkout_records where email = v_email;
      return coalesce(v_row, '{}'::jsonb) || jsonb_build_object('paid', true, 'email', v_email);
    end if;
    return null;
  end if;
  return jsonb_build_object(
    'paid', v_paid,
    'email', coalesce(v_row->>'email', v_email),
    'gym_member', coalesce(v_row->>'gym_membership_status', v_row->>'gym_member', ''),
    'membership_number', coalesce(v_row->>'membership_number', v_row->>'gym_membership_number', ''),
    'preferred_slot', coalesce(v_row->>'preferred_slot', ''),
    'preferred_slot_2', coalesce(v_row->>'preferred_slot_2', ''),
    'waitlist_for', coalesce(v_row->>'waitlist_for', ''),
    'age_group', coalesce(v_row->>'age_group', ''),
    'teen_waitlist', coalesce(v_row->>'teen_waitlist', 'false'),
    'joining_with_friend', coalesce(v_row->>'joining_with_friend', ''),
    'friend_name', coalesce(v_row->>'friend_name', ''),
    'invited_by', coalesce(v_row->>'invited_by', ''),
    'signup_src', coalesce(v_row->>'signup_src', ''),
    'writ_number', coalesce(v_row->>'writ_number', ''),
    'heard_from', coalesce(v_row->>'heard_from', '')
  );
end;
$$;

revoke all on function public.site_signup_for_checkout_inner(text) from public, anon, authenticated;

create or replace function public.site_signup_for_checkout(p_secret text, p_email text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_expected text;
begin
  select btrim(write_secret) into v_expected from public.billing_runtime where id = 1;
  if v_expected is null
     or length(v_expected) < 16
     or btrim(coalesce(p_secret, '')) is distinct from v_expected then
    return null;
  end if;
  return public.site_signup_for_checkout_inner(p_email);
end;
$$;

revoke all on function public.site_signup_for_checkout(text, text) from public;
grant execute on function public.site_signup_for_checkout(text, text) to anon, authenticated;

comment on function public.site_signup_for_checkout(text, text) is
  'Signup fields for a resumable checkout. The secret must match billing_runtime. A mismatch returns null.';

create or replace function public.claim_paid_site_signup()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_meta jsonb;
  v_teen boolean;
  v_first text;
  v_second text;
  v_first_slot text;
  v_second_slot text;
  v_first_on date;
  v_second_on date;
begin
  if auth.uid() is null then
    return;
  end if;
  select lower(btrim(email)) into v_email from public.profiles where id = auth.uid();
  if v_email is null or v_email = '' then
    select lower(btrim(email)) into v_email from auth.users where id = auth.uid();
  end if;
  if v_email is null or v_email = '' then
    return;
  end if;
  update public.billing_customers
  set user_id = auth.uid(), updated_at = now()
  where user_id is null and lower(email) = v_email;
  update public.billing_subscriptions s
  set user_id = auth.uid(), updated_at = now()
  from public.billing_customers c
  where s.customer_id = c.id and c.user_id = auth.uid() and s.user_id is null;
  if exists (select 1 from public.player_intake where user_id = auth.uid()) then
    return;
  end if;
  select metadata into v_meta from public.site_checkout_records where email = v_email;
  if v_meta is null and to_regclass('public.site_signups') is not null then
    select to_jsonb(s) into v_meta
    from public.site_signups s
    where lower(s.email) = v_email
    order by s.created_at desc
    limit 1;
  end if;
  if v_meta is null then
    return;
  end if;
  v_teen := coalesce(v_meta->>'age_group', '') = 'under_16'
    or coalesce(v_meta->>'teen_waitlist', '') in ('true', 't', '1', 'yes');
  v_first := regexp_replace(coalesce(v_meta->>'preferred_slot', ''), '^daytime:', 'afternoon:');
  v_second := regexp_replace(coalesce(v_meta->>'preferred_slot_2', ''), '^daytime:', 'afternoon:');
  v_first_slot := public.normalize_timeslot_id(split_part(v_first, ':', 1));
  v_second_slot := public.normalize_timeslot_id(split_part(v_second, ':', 1));
  v_first_on := case
    when split_part(v_first, ':', 2) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then split_part(v_first, ':', 2)::date
    else null
  end;
  v_second_on := case
    when split_part(v_second, ':', 2) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then split_part(v_second, ':', 2)::date
    else null
  end;
  if v_second_slot is not distinct from v_first_slot and v_second_on is not distinct from v_first_on then
    v_second_slot := null;
    v_second_on := null;
  end if;
  insert into public.player_intake (
    user_id, dnd_experience, gym_experience, first_goals, timeslot_id, table_starts_on,
    second_timeslot_id, second_starts_on, session_reminders,
    age_band, teen_waitlist, gym_member, gym_membership_number, signup_src, writ_number,
    with_friend, friend_name, updated_at
  ) values (
    auth.uid(),
    'never',
    'new',
    array['Sleep 7 hours'],
    case when v_teen then null else v_first_slot end,
    case when v_teen then null else v_first_on end,
    case when v_teen then null else v_second_slot end,
    case when v_teen then null else v_second_on end,
    false,
    case coalesce(v_meta->>'age_group', '')
      when 'adult' then '18_plus'
      when 'age_16_17' then '16_17'
      when 'under_16' then 'under_16'
      else null
    end,
    v_teen,
    case
      when coalesce(v_meta->>'gym_member', v_meta->>'gym_membership_status', '') in ('current', 'former', 'not_yet')
        then coalesce(v_meta->>'gym_member', v_meta->>'gym_membership_status')
      when coalesce(v_meta->>'gym_member', '') = 'true' then 'current'
      else null
    end,
    nullif(btrim(coalesce(v_meta->>'membership_number', v_meta->>'gym_membership_number', '')), ''),
    nullif(left(btrim(coalesce(v_meta->>'signup_src', '')), 80), ''),
    case
      when position('gamegrid' in lower(coalesce(v_meta->>'signup_src', ''))) > 0
        then nullif(upper(left(btrim(coalesce(v_meta->>'writ_number', '')), 20)), '')
      else null
    end,
    coalesce(v_meta->>'joining_with_friend', '') in ('true', 't', 'yes', '1'),
    nullif(btrim(coalesce(v_meta->>'friend_name', '')), ''),
    now()
  )
  on conflict (user_id) do nothing;
  if not v_teen and v_first_slot is not null then
    perform public.assign_saturday_choices(v_second_slot, v_second_on);
  end if;
end;
$$;

revoke all on function public.claim_paid_site_signup() from public, anon;
grant execute on function public.claim_paid_site_signup() to authenticated;
