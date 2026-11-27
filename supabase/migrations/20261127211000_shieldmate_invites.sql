-- Shieldmate invite codes. 14 days. Additive. Does not change existing grew_up rows.
-- Review and apply by hand. Not applied to live Supabase by this change.

create table if not exists public.shieldmate_invites (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_user_id uuid not null references public.profiles (id) on delete cascade,
  guest_user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  paired_at timestamptz,
  status text not null default 'open' check (status in ('open', 'paired', 'expired')),
  constraint shieldmate_invites_not_self check (guest_user_id is null or guest_user_id <> host_user_id)
);

create index if not exists shieldmate_invites_host_idx on public.shieldmate_invites (host_user_id);
create index if not exists shieldmate_invites_guest_idx on public.shieldmate_invites (guest_user_id);

alter table public.shieldmate_invites enable row level security;

drop policy if exists shieldmate_invites_select on public.shieldmate_invites;
create policy shieldmate_invites_select on public.shieldmate_invites
  for select to authenticated
  using (host_user_id = auth.uid() or guest_user_id = auth.uid() or public.is_staff());

revoke all on public.shieldmate_invites from public, anon;
grant select on public.shieldmate_invites to authenticated;

create or replace function public.create_shieldmate_invite()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_expires timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Sign in first';
  end if;
  update public.shieldmate_invites
  set status = 'expired'
  where host_user_id = auth.uid() and status = 'open' and expires_at <= now();
  select code, expires_at into v_code, v_expires
  from public.shieldmate_invites
  where host_user_id = auth.uid() and status in ('open', 'paired')
  order by created_at desc
  limit 1;
  if v_code is not null then
    return jsonb_build_object('code', v_code, 'expires_at', v_expires, 'status', (
      select status from public.shieldmate_invites where code = v_code
    ));
  end if;
  v_code := upper(substr(md5(gen_random_uuid()::text || clock_timestamp()::text), 1, 8));
  v_expires := now() + interval '14 days';
  insert into public.shieldmate_invites (code, host_user_id, expires_at)
  values (v_code, auth.uid(), v_expires);
  return jsonb_build_object('code', v_code, 'expires_at', v_expires, 'status', 'open');
end;
$$;

create or replace function public.accept_shieldmate_invite(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.shieldmate_invites%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Sign in first';
  end if;
  select * into v_row from public.shieldmate_invites where upper(code) = upper(btrim(coalesce(p_code, ''))) for update;
  if not found then
    raise exception 'That Shieldmate code was not found';
  end if;
  if v_row.host_user_id = auth.uid() then
    raise exception 'Send this code to your friend';
  end if;
  if v_row.expires_at <= now() and v_row.status <> 'paired' then
    update public.shieldmate_invites set status = 'expired' where id = v_row.id;
    raise exception 'This Shieldmate invite ended after 14 days';
  end if;
  if v_row.status = 'paired' and v_row.guest_user_id is distinct from auth.uid() then
    raise exception 'That Shieldmate code is already in use';
  end if;
  update public.shieldmate_invites
  set guest_user_id = auth.uid(),
      status = 'paired',
      paired_at = coalesce(paired_at, now())
  where id = v_row.id;
  return jsonb_build_object('code', v_row.code, 'expires_at', v_row.expires_at, 'status', 'paired');
end;
$$;

revoke all on function public.create_shieldmate_invite() from public, anon;
revoke all on function public.accept_shieldmate_invite(text) from public, anon;
grant execute on function public.create_shieldmate_invite() to authenticated;
grant execute on function public.accept_shieldmate_invite(text) to authenticated;
