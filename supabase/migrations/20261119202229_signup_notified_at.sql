-- One staff "New account" email per profile.
-- Profiles that already exist are stamped now, including accounts whose
-- last_seen_at is still null. A profile created after this migration stays
-- null until the app claims the send.

alter table public.profiles
  add column if not exists signup_notified_at timestamptz;

comment on column public.profiles.signup_notified_at is
  'When the one-time new-account staff email was claimed. Null until then. Profiles that existed before this column were stamped so they are not emailed.';

create or replace function public.protect_profile_write()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_setting('emc.profile_admin', true) = 'on' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if current_setting('emc.profile_insert', true) is distinct from 'on' then
      raise exception 'Profiles are created at signup';
    end if;
    if new.can_approve_lore then
      raise exception 'Lore approval is set by an admin in SQL';
    end if;
    return new;
  end if;
  if new.app_role is distinct from old.app_role
     or new.id is distinct from old.id
     or new.email is distinct from old.email
     or new.can_approve_lore is distinct from old.can_approve_lore
  then
    raise exception 'Role and identity are changed by company functions';
  end if;
  if old.signup_notified_at is not null
     and new.signup_notified_at is distinct from old.signup_notified_at
  then
    raise exception 'Signup notice is recorded once';
  end if;
  return new;
end;
$$;

revoke all on function public.protect_profile_write() from public, anon, authenticated;

update public.profiles
set signup_notified_at = now()
where signup_notified_at is null;

grant update (signup_notified_at) on public.profiles to authenticated;
