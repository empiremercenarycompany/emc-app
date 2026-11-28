-- Site checkout is matched by email. There is no signup id in Stripe metadata.
-- Additive. Existing billing rows are unchanged. This does not refund anyone.
-- Review and apply by hand. Do not point this at a database you have not chosen.

alter table public.player_intake
  add column if not exists writ_number text;

create table if not exists public.site_checkout_records (
  email text primary key,
  status text not null check (status in ('paid')),
  plan text,
  stripe_customer_id text,
  stripe_subscription_id text,
  checkout_session_id text,
  metadata jsonb not null default '{}'::jsonb,
  invited_at timestamptz,
  paid_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint site_checkout_records_email_len check (char_length(email) between 3 and 320)
);

comment on table public.site_checkout_records is
  'Paid site checkout, keyed by lower-case signup email. Metadata is the contract fields only.';

alter table public.site_checkout_records enable row level security;

drop policy if exists site_checkout_records_staff on public.site_checkout_records;
create policy site_checkout_records_staff on public.site_checkout_records
  for select to authenticated
  using (public.is_staff());

revoke all on public.site_checkout_records from public, anon, authenticated;
grant select on public.site_checkout_records to authenticated;

create or replace function public.record_site_checkout(p_secret text, p_record jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expected text;
  v_email text;
  v_invite boolean := false;
begin
  select btrim(write_secret) into v_expected from public.billing_runtime where id = 1;
  if v_expected is null or length(v_expected) < 16 or p_secret is distinct from v_expected then
    raise exception 'billing write refused';
  end if;
  v_email := lower(btrim(coalesce(p_record->>'email', '')));
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'billing event refused';
  end if;
  if coalesce(p_record->>'status', '') <> 'paid' then
    return jsonb_build_object('invite', false);
  end if;
  insert into public.site_checkout_records (
    email, status, plan, stripe_customer_id, stripe_subscription_id, checkout_session_id, metadata, paid_at, updated_at
  ) values (
    v_email,
    'paid',
    nullif(btrim(coalesce(p_record->>'plan', '')), ''),
    nullif(p_record->>'stripe_customer_id', ''),
    nullif(p_record->>'stripe_subscription_id', ''),
    nullif(p_record->>'checkout_session_id', ''),
    coalesce(p_record->'metadata', '{}'::jsonb),
    now(),
    now()
  )
  on conflict (email) do update
  set status = 'paid',
      plan = coalesce(excluded.plan, public.site_checkout_records.plan),
      stripe_customer_id = coalesce(excluded.stripe_customer_id, public.site_checkout_records.stripe_customer_id),
      stripe_subscription_id = coalesce(excluded.stripe_subscription_id, public.site_checkout_records.stripe_subscription_id),
      checkout_session_id = coalesce(excluded.checkout_session_id, public.site_checkout_records.checkout_session_id),
      metadata = public.site_checkout_records.metadata || excluded.metadata,
      paid_at = coalesce(public.site_checkout_records.paid_at, now()),
      updated_at = now();
  if coalesce(p_record->>'invite', '') = 'true' then
    update public.site_checkout_records
    set invited_at = now(), updated_at = now()
    where email = v_email and invited_at is null;
    v_invite := found;
  end if;
  return jsonb_build_object('invite', v_invite);
end;
$$;

revoke all on function public.record_site_checkout(text, jsonb) from public, anon, authenticated;
grant execute on function public.record_site_checkout(text, jsonb) to anon;

comment on function public.record_site_checkout(text, jsonb) is
  'Webhook write for a paid site checkout. The secret matches billing_runtime. Keyed by email.';

create or replace function public.site_signup_for_checkout(p_email text)
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

revoke all on function public.site_signup_for_checkout(text) from public, anon, authenticated;

comment on function public.site_signup_for_checkout(text) is
  'Signup fields by email. Not granted. The secret-gated wrapper replaces this signature.';

create or replace function public.claim_paid_site_signup()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_meta jsonb;
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
  insert into public.player_intake (
    user_id, dnd_experience, gym_experience, first_goals, timeslot_id, session_reminders,
    age_band, teen_waitlist, gym_member, gym_membership_number, signup_src, writ_number,
    with_friend, friend_name, updated_at
  ) values (
    auth.uid(),
    'never',
    'new',
    array['Sleep 7 hours'],
    case
      when coalesce(v_meta->>'age_group', '') = 'under_16' or coalesce(v_meta->>'teen_waitlist', '') in ('true', 't') then null
      else public.normalize_timeslot_id(coalesce(v_meta->>'preferred_slot', ''))
    end,
    false,
    case coalesce(v_meta->>'age_group', '')
      when 'adult' then '18_plus'
      when 'age_16_17' then '16_17'
      when 'under_16' then 'under_16'
      else null
    end,
    coalesce(v_meta->>'age_group', '') = 'under_16' or coalesce(v_meta->>'teen_waitlist', '') in ('true', 't'),
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
end;
$$;

revoke all on function public.claim_paid_site_signup() from public, anon;
grant execute on function public.claim_paid_site_signup() to authenticated;

comment on function public.claim_paid_site_signup() is
  'Links a paid site checkout to the signed-in player by email and seeds intake once. It does not charge.';
