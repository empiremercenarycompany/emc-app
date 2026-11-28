-- Public availability is counts only. Oversold payments stay paid and flag the newest hold.

do $$
declare
  v_count int;
  v_keys text;
  v_open int;
  v_full boolean;
begin
  if not has_function_privilege('anon', 'public.saturday_availability()', 'execute') then
    raise exception 'anon cannot read Saturday availability';
  end if;
  if has_function_privilege('anon', 'public.saturday_slot_open_raw(text, uuid)', 'execute') then
    raise exception 'anon can read the raw seat counter';
  end if;
  select count(*) into v_count from public.saturday_availability();
  if v_count <> 6 then
    raise exception 'availability returned % tables', v_count;
  end if;
  select pg_get_function_result(p.oid) into v_keys
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'saturday_availability';
  if v_keys ilike '%email%' or v_keys ilike '%name%' then
    raise exception 'availability exposes personal columns: %', v_keys;
  end if;
  if v_keys not like '%open%' or v_keys not like '%full%' then
    raise exception 'availability is missing open or full: %', v_keys;
  end if;
  select open, "full" into v_open, v_full
  from public.saturday_availability()
  where timeslot_id = 'morning' and starts_on = date '2027-01-02';
  if v_open <> 6 or v_full then
    raise exception 'empty morning table is % full %', v_open, v_full;
  end if;
  if has_function_privilege('anon', 'public.prefer_first_waitlist()', 'execute') then
    raise exception 'anon can drop a seat hold';
  end if;
  if not has_function_privilege('authenticated', 'public.prefer_first_waitlist()', 'execute') then
    raise exception 'a player cannot wait for the first choice';
  end if;
  if public.note_oversold_payment('wrong-secret', 'one@example.test', 'morning:2027-01-02') then
    raise exception 'a bad secret flagged a payment';
  end if;
end $$;

update public.billing_runtime set write_secret = 'choice-secret' where id = 1;

insert into public.site_checkout_records (email, status, plan, metadata, paid_at)
select
  'seat' || n || '@example.test',
  'paid',
  'emc_gym_monthly',
  jsonb_build_object(
    'preferred_slot', 'morning:2027-01-02',
    'preferred_slot_2', 'evening:2027-01-09',
    'checkout_slot', 'first'
  ),
  timestamp '2027-01-01' + (n || ' hours')::interval
from generate_series(1, 7) as n;

do $$
declare
  v_open int;
  v_full boolean;
begin
  select open, "full" into v_open, v_full
  from public.saturday_availability()
  where timeslot_id = 'morning' and starts_on = date '2027-01-02';
  if v_open <> 0 or v_full is distinct from true then
    raise exception 'seven payments should fill the table, open % full %', v_open, v_full;
  end if;
  if public.saturday_slot_open_raw('morning:2027-01-02') <> -1 then
    raise exception 'raw open should show the extra payment';
  end if;
  if public.note_oversold_payment('choice-secret', 'seat1@example.test', 'morning:2027-01-02') then
    raise exception 'the first payment was flagged';
  end if;
  if not public.note_oversold_payment('choice-secret', 'seat7@example.test', 'morning:2027-01-02') then
    raise exception 'the seventh payment was not flagged';
  end if;
  if (
    select count(*) from public.saturday_availability() where open < 0
  ) <> 0 then
    raise exception 'public availability exposed a negative count';
  end if;
end $$;
