-- Test-mode membership billing.
-- Staff can select these rows. Players cannot. A player reads their own
-- membership through my_billing(). Writes go through apply_billing_event,
-- which checks billing_runtime.write_secret. That value must match
-- EMC_STRIPE_WEBHOOK_SECRET. The app calls the function with the anon key
-- after Stripe's signature checks out. There is no service-role client.
--
-- gym_share_cents and gym_partner copy price metadata for a later payout
-- option. This migration does not transfer, connect, or pay anyone.
--
-- After this file is applied, set the write secret in SQL. Do not commit it:
--   update public.billing_runtime
--   set write_secret = '<EMC_STRIPE_WEBHOOK_SECRET>'
--   where id = 1;

create table if not exists public.billing_customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  signup_id uuid,
  stripe_customer_id text not null,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_customers_stripe_id_key unique (stripe_customer_id),
  constraint billing_customers_email_len check (email is null or char_length(email) <= 320)
);

comment on table public.billing_customers is
  'Stripe customer for an app user, or a site signup id once the site checkout is wired. Staff select only.';

comment on column public.billing_customers.signup_id is
  'Reserved for the site enlist id. The app leaves it null and stores the auth uid in user_id.';

create table if not exists public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.billing_customers (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  stripe_subscription_id text not null,
  plan_lookup_key text not null,
  status text not null,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  wanderlust boolean not null default false,
  gym_share_cents int,
  gym_partner text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_subscriptions_stripe_id_key unique (stripe_subscription_id),
  constraint billing_subscriptions_plan_len check (char_length(plan_lookup_key) between 1 and 200),
  constraint billing_subscriptions_status_len check (char_length(status) between 1 and 40),
  constraint billing_subscriptions_gym_cents check (gym_share_cents is null or gym_share_cents >= 0),
  constraint billing_subscriptions_gym_partner_len check (gym_partner is null or char_length(gym_partner) <= 40)
);

comment on table public.billing_subscriptions is
  'Subscription state copied from Stripe. gym_share_cents is informational metadata. No payout is sent.';

comment on column public.billing_subscriptions.gym_share_cents is
  'Copy of the price metadata gym_share_cents, in cents. Stored so a later payout can be added without rewriting history.';

comment on column public.billing_subscriptions.wanderlust is
  'True when the subscription includes the wanderlust_addon_monthly price.';

create table if not exists public.billing_events (
  event_id text primary key,
  event_type text not null,
  stripe_created timestamptz,
  received_at timestamptz not null default now(),
  payload jsonb not null,
  constraint billing_events_type_len check (char_length(event_type) between 1 and 80)
);

comment on table public.billing_events is
  'One row per Stripe event id. A replay finds the id and does not apply side effects again. Payload is for staff audit, not for logs.';

create table if not exists public.billing_runtime (
  id int primary key check (id = 1),
  write_secret text
);

comment on table public.billing_runtime is
  'The webhook write secret. It must equal EMC_STRIPE_WEBHOOK_SECRET. No API role can read this table.';

insert into public.billing_runtime (id, write_secret)
values (1, null)
on conflict (id) do nothing;

create index if not exists billing_customers_user_idx on public.billing_customers (user_id);
create index if not exists billing_customers_signup_idx on public.billing_customers (signup_id) where signup_id is not null;
create index if not exists billing_subscriptions_user_idx on public.billing_subscriptions (user_id);
create index if not exists billing_subscriptions_customer_idx on public.billing_subscriptions (customer_id);

alter table public.billing_customers enable row level security;
alter table public.billing_subscriptions enable row level security;
alter table public.billing_events enable row level security;
alter table public.billing_runtime enable row level security;

create policy billing_customers_staff_select on public.billing_customers
  for select to authenticated
  using (public.is_staff());

create policy billing_subscriptions_staff_select on public.billing_subscriptions
  for select to authenticated
  using (public.is_staff());

create policy billing_events_staff_select on public.billing_events
  for select to authenticated
  using (public.is_staff());

revoke all on public.billing_customers from public, anon, authenticated, service_role;
revoke all on public.billing_subscriptions from public, anon, authenticated, service_role;
revoke all on public.billing_events from public, anon, authenticated, service_role;
revoke all on public.billing_runtime from public, anon, authenticated, service_role;

grant select on public.billing_customers to authenticated;
grant select on public.billing_subscriptions to authenticated;
grant select on public.billing_events to authenticated;

create or replace function public.billing_uuid(p_value text)
returns uuid
language plpgsql
immutable
set search_path = public
as $$
begin
  if p_value is null or btrim(p_value) = '' then
    return null;
  end if;
  return btrim(p_value)::uuid;
exception
  when invalid_text_representation then
    return null;
end;
$$;

create or replace function public.billing_upsert_customer(
  p_stripe_customer_id text,
  p_user_id uuid,
  p_signup_id uuid,
  p_email text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_email text;
begin
  if p_stripe_customer_id is null or p_stripe_customer_id !~ '^cus_[A-Za-z0-9]+$' then
    return null;
  end if;
  if p_user_id is not null and not exists (select 1 from public.profiles where id = p_user_id) then
    p_user_id := null;
  end if;
  v_email := nullif(left(btrim(coalesce(p_email, '')), 320), '');
  insert into public.billing_customers (user_id, signup_id, stripe_customer_id, email)
  values (p_user_id, p_signup_id, p_stripe_customer_id, v_email)
  on conflict (stripe_customer_id) do update
  set
    user_id = coalesce(excluded.user_id, public.billing_customers.user_id),
    signup_id = coalesce(excluded.signup_id, public.billing_customers.signup_id),
    email = coalesce(excluded.email, public.billing_customers.email),
    updated_at = now()
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.apply_billing_event(p_secret text, p_event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expected text;
  v_id text;
  v_type text;
  v_inserted text;
  v_created timestamptz;
  v_customer_id uuid;
  v_sub_customer text;
  v_sub_id text;
  v_plan text;
  v_status text;
  v_period timestamptz;
  v_cents int;
  v_partner text;
  v_user_id uuid;
  v_signup_id uuid;
begin
  select btrim(write_secret) into v_expected from public.billing_runtime where id = 1;
  if v_expected is null or length(v_expected) < 16 or p_secret is distinct from v_expected then
    raise exception 'billing write refused';
  end if;
  if p_event is null or jsonb_typeof(p_event) <> 'object' or octet_length(p_event::text) > 1000000 then
    raise exception 'billing event refused';
  end if;

  v_id := p_event->>'id';
  v_type := p_event->>'type';
  if v_id is null or v_id !~ '^evt_[A-Za-z0-9]+$' then
    raise exception 'billing event id refused';
  end if;
  if v_type not in (
    'checkout.session.completed',
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'invoice.paid',
    'invoice.payment_failed'
  ) then
    raise exception 'billing event type refused';
  end if;

  if coalesce(p_event->>'created', '') ~ '^\d+(\.\d+)?$' then
    v_created := to_timestamp((p_event->>'created')::double precision);
  end if;

  insert into public.billing_events (event_id, event_type, stripe_created, payload)
  values (v_id, v_type, v_created, coalesce(p_event->'raw', '{}'::jsonb))
  on conflict (event_id) do nothing
  returning event_id into v_inserted;

  if v_inserted is null then
    return jsonb_build_object('applied', false);
  end if;

  if jsonb_typeof(p_event->'customer') = 'object' then
    perform public.billing_upsert_customer(
      nullif(p_event #>> '{customer,stripe_customer_id}', ''),
      public.billing_uuid(p_event #>> '{customer,user_id}'),
      public.billing_uuid(p_event #>> '{customer,signup_id}'),
      p_event #>> '{customer,email}'
    );
  end if;

  if jsonb_typeof(p_event->'subscription') = 'object' then
    v_sub_customer := nullif(p_event #>> '{subscription,stripe_customer_id}', '');
    v_sub_id := nullif(p_event #>> '{subscription,stripe_subscription_id}', '');
    v_plan := nullif(btrim(coalesce(p_event #>> '{subscription,plan_lookup_key}', '')), '');
    v_status := nullif(btrim(coalesce(p_event #>> '{subscription,status}', '')), '');
    v_user_id := public.billing_uuid(p_event #>> '{subscription,user_id}');
    v_signup_id := public.billing_uuid(p_event #>> '{subscription,signup_id}');
    if v_user_id is not null and not exists (select 1 from public.profiles where id = v_user_id) then
      v_user_id := null;
    end if;
    if coalesce(p_event #>> '{subscription,current_period_end}', '') ~ '^\d{4}-\d{2}-\d{2}T' then
      v_period := (p_event #>> '{subscription,current_period_end}')::timestamptz;
    end if;
    if coalesce(p_event #>> '{subscription,gym_share_cents}', '') ~ '^\d{1,9}$' then
      v_cents := (p_event #>> '{subscription,gym_share_cents}')::int;
    end if;
    v_partner := nullif(left(btrim(coalesce(p_event #>> '{subscription,gym_partner}', '')), 40), '');
    if v_sub_id ~ '^sub_[A-Za-z0-9]+$'
       and v_sub_customer ~ '^cus_[A-Za-z0-9]+$'
       and v_plan is not null
       and v_status is not null
    then
      v_customer_id := public.billing_upsert_customer(v_sub_customer, v_user_id, v_signup_id, null);
      if v_customer_id is not null then
        insert into public.billing_subscriptions (
          customer_id,
          user_id,
          stripe_subscription_id,
          plan_lookup_key,
          status,
          current_period_end,
          cancel_at_period_end,
          wanderlust,
          gym_share_cents,
          gym_partner
        ) values (
          v_customer_id,
          v_user_id,
          v_sub_id,
          left(v_plan, 200),
          left(v_status, 40),
          v_period,
          p_event #>> '{subscription,cancel_at_period_end}' in ('true', 't', '1'),
          p_event #>> '{subscription,wanderlust}' in ('true', 't', '1'),
          v_cents,
          v_partner
        )
        on conflict (stripe_subscription_id) do update
        set
          customer_id = excluded.customer_id,
          user_id = coalesce(excluded.user_id, public.billing_subscriptions.user_id),
          plan_lookup_key = case
            when excluded.plan_lookup_key = 'unknown' then public.billing_subscriptions.plan_lookup_key
            else excluded.plan_lookup_key
          end,
          status = excluded.status,
          current_period_end = coalesce(excluded.current_period_end, public.billing_subscriptions.current_period_end),
          cancel_at_period_end = excluded.cancel_at_period_end,
          wanderlust = excluded.wanderlust,
          gym_share_cents = excluded.gym_share_cents,
          gym_partner = excluded.gym_partner,
          updated_at = now();
      end if;
    end if;
  end if;

  return jsonb_build_object('applied', true);
end;
$$;

create or replace function public.my_billing()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_stripe_customer_id text;
  v_sub public.billing_subscriptions%rowtype;
  v_has_sub boolean;
begin
  if auth.uid() is null then
    raise exception 'Sign in first';
  end if;

  select id, stripe_customer_id
  into v_customer_id, v_stripe_customer_id
  from public.billing_customers
  where user_id = auth.uid()
  order by updated_at desc
  limit 1;

  select * into v_sub
  from public.billing_subscriptions
  where user_id = auth.uid()
     or (v_customer_id is not null and customer_id = v_customer_id)
  order by updated_at desc
  limit 1;
  v_has_sub := found;

  return jsonb_build_object(
    'customer',
    case
      when v_customer_id is null then null
      else jsonb_build_object('stripe_customer_id', v_stripe_customer_id)
    end,
    'subscription',
    case
      when not v_has_sub then null
      else jsonb_build_object(
        'stripe_subscription_id', v_sub.stripe_subscription_id,
        'plan_lookup_key', v_sub.plan_lookup_key,
        'status', v_sub.status,
        'current_period_end', v_sub.current_period_end,
        'cancel_at_period_end', v_sub.cancel_at_period_end,
        'wanderlust', v_sub.wanderlust
      )
    end
  );
end;
$$;

revoke all on function public.billing_uuid(text) from public, anon, authenticated, service_role;
revoke all on function public.billing_upsert_customer(text, uuid, uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.apply_billing_event(text, jsonb) from public, anon, authenticated, service_role;
revoke all on function public.my_billing() from public, anon, authenticated, service_role;

grant execute on function public.apply_billing_event(text, jsonb) to anon;
grant execute on function public.my_billing() to authenticated;
