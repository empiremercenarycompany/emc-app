-- The public anon key must not read a signup by email.
-- A matching billing write secret of at least 16 characters is required.

create table public.site_signups (
  email text not null,
  created_at timestamptz not null default now(),
  gym_membership_status text,
  membership_number text,
  preferred_slot text,
  preferred_slot_2 text,
  waitlist_for text,
  age_group text,
  teen_waitlist text,
  joining_with_friend text,
  friend_name text,
  invited_by text,
  signup_src text,
  writ_number text,
  heard_from text
);

insert into public.site_signups (
  email, gym_membership_status, membership_number, preferred_slot, age_group,
  friend_name, invited_by, signup_src, writ_number, heard_from
) values (
  'recruit@example.test', 'current', 'ESF-9', 'morning', 'adult',
  'Sam Friend', 'Pat', 'fb-gamegrid', 'GG-12', 'Game Grid'
);

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'site_signup_for_checkout'
      and p.pronargs = 1
  ) then
    raise exception 'one-argument site_signup_for_checkout still exists';
  end if;
  if has_function_privilege('anon', 'public.site_signup_for_checkout_inner(text)', 'execute')
     or has_function_privilege('authenticated', 'public.site_signup_for_checkout_inner(text)', 'execute') then
    raise exception 'the inner signup lookup is granted';
  end if;
  if not has_function_privilege('anon', 'public.site_signup_for_checkout(text, text)', 'execute') then
    raise exception 'anon cannot call the gated signup lookup';
  end if;
end $$;

update public.billing_runtime set write_secret = 'short-secret' where id = 1;

set role anon;

do $$
declare
  v jsonb;
begin
  v := public.site_signup_for_checkout('short-secret', 'recruit@example.test');
  if v is not null then
    raise exception 'a short secret returned a signup';
  end if;
  v := public.site_signup_for_checkout('not-the-secret', 'recruit@example.test');
  if v is not null then
    raise exception 'a wrong secret returned a signup';
  end if;
  v := public.site_signup_for_checkout(null, 'recruit@example.test');
  if v is not null then
    raise exception 'a null secret returned a signup';
  end if;
  begin
    perform public.site_signup_for_checkout_inner('recruit@example.test');
    raise exception 'anon called the inner signup lookup';
  exception
    when insufficient_privilege then
      null;
  end;
end $$;

reset role;

update public.billing_runtime set write_secret = 'checkout-secret-ok' where id = 1;

set role anon;

do $$
declare
  v jsonb;
begin
  v := public.site_signup_for_checkout('not-the-secret-value', 'recruit@example.test');
  if v is not null then
    raise exception 'a wrong long secret returned a signup';
  end if;
  v := public.site_signup_for_checkout('checkout-secret-ok', 'recruit@example.test');
  if v->>'membership_number' is distinct from 'ESF-9'
     or v->>'friend_name' is distinct from 'Sam Friend'
     or v->>'writ_number' is distinct from 'GG-12'
     or v->>'age_group' is distinct from 'adult'
     or v->>'invited_by' is distinct from 'Pat'
     or v->>'signup_src' is distinct from 'fb-gamegrid' then
    raise exception 'the right secret did not return the signup, got %', v;
  end if;
end $$;

reset role;

drop table public.site_signups;
