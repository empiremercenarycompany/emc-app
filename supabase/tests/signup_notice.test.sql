-- The one-time new-account flag. Run only against a disposable database.

insert into auth.users (id, email) values
  ('12121212-1212-4212-8212-121212121212', 'notice@example.com'),
  ('12121212-1212-4212-8212-121212121213', 'notice-other@example.com');

do $$
declare
  v_nullable text;
  v_default text;
  v_flag timestamptz;
begin
  select is_nullable, column_default into v_nullable, v_default
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'profiles'
    and column_name = 'signup_notified_at';
  if v_nullable is distinct from 'YES' or v_default is not null then
    raise exception 'signup_notified_at should be nullable with no default (nullable %, default %)', v_nullable, v_default;
  end if;
  if not has_column_privilege('authenticated', 'public.profiles', 'signup_notified_at', 'UPDATE') then
    raise exception 'authenticated cannot claim signup_notified_at';
  end if;
  if not has_column_privilege('authenticated', 'public.profiles', 'last_seen_at', 'UPDATE') then
    raise exception 'authenticated cannot update last_seen_at';
  end if;
  if has_column_privilege('anon', 'public.profiles', 'signup_notified_at', 'UPDATE')
     or has_column_privilege('anon', 'public.profiles', 'last_seen_at', 'UPDATE') then
    raise exception 'anon can update profile visit columns';
  end if;
  if has_column_privilege('authenticated', 'public.profiles', 'email', 'UPDATE') then
    raise exception 'authenticated can update email';
  end if;
  select signup_notified_at into v_flag
  from public.profiles
  where id = '12121212-1212-4212-8212-121212121212';
  if v_flag is not null then
    raise exception 'a new profile was marked notified';
  end if;
end $$;

select set_config('request.jwt.claim.sub', '12121212-1212-4212-8212-121212121212', false);
set role authenticated;

do $$
begin
  update public.profiles
  set last_seen_at = now()
  where id = auth.uid();
  if not found then
    raise exception 'last_seen was not updated';
  end if;
  if (select signup_notified_at from public.profiles where id = auth.uid()) is not null then
    raise exception 'last_seen set the notice flag';
  end if;

  update public.profiles
  set signup_notified_at = now()
  where id = auth.uid()
    and signup_notified_at is null;
  if not found then
    raise exception 'notice claim missed';
  end if;

  update public.profiles
  set signup_notified_at = now()
  where id = auth.uid()
    and signup_notified_at is null;
  if found then
    raise exception 'notice claim ran twice';
  end if;
end $$;

do $$
begin
  update public.profiles
  set signup_notified_at = null
  where id = auth.uid();
  raise exception 'notice flag was cleared';
exception
  when others then
    if sqlerrm not ilike '%recorded once%' then
      raise;
    end if;
end $$;

select set_config('request.jwt.claim.sub', '12121212-1212-4212-8212-121212121213', false);

do $$
begin
  update public.profiles
  set signup_notified_at = now()
  where id = '12121212-1212-4212-8212-121212121212';
  if found then
    raise exception 'another account claimed the notice';
  end if;
end $$;

reset role;

do $$
declare
  v_flag timestamptz;
begin
  select signup_notified_at into v_flag
  from public.profiles
  where id = '12121212-1212-4212-8212-121212121212';
  if v_flag is null then
    raise exception 'notice flag did not stick';
  end if;
end $$;

set role anon;
do $$
begin
  update public.profiles
  set last_seen_at = now()
  where id = '12121212-1212-4212-8212-121212121212';
  raise exception 'anon updated last_seen';
exception
  when insufficient_privilege then null;
end $$;
reset role;
