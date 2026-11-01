-- Not applied. Staff hold starting goals by email until that person signs in
-- and has a character. No addresses and no phone numbers are stored.

create table public.pending_starting_goals (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(email) and position('@' in email) > 1),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 80),
  category text not null check (category in ('intelligence', 'wisdom', 'charisma', 'constitution')),
  goal_text text not null check (char_length(btrim(goal_text)) between 1 and 200),
  status text not null check (status in ('active', 'draft')),
  needs_cmart boolean not null default false,
  source text not null check (char_length(btrim(source)) between 1 and 80),
  claimed_by uuid references public.profiles (id),
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint pending_starting_goals_cmart check (needs_cmart = (status = 'draft'))
);

comment on table public.pending_starting_goals is
  'Staff-only starting goals, keyed by lower-cased email. Addresses and phone numbers are not stored.';

create index pending_starting_goals_email
  on public.pending_starting_goals (email)
  where claimed_at is null;

alter table public.pending_starting_goals enable row level security;

create policy pending_starting_goals_staff
  on public.pending_starting_goals
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

revoke all on public.pending_starting_goals from public, anon;
grant select, insert, update, delete on public.pending_starting_goals to authenticated;

-- Copies unclaimed rows for a verified email onto that user's character.
-- Mental rows (needs_cmart) are inactive drafts labelled needs CMART.
create or replace function public.claim_starting_goals(p_user_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_confirmed boolean := true;
  v_character uuid;
  v_row public.pending_starting_goals%rowtype;
  v_count int := 0;
begin
  if p_user_id is null then
    return 0;
  end if;
  if auth.uid() is not null
     and p_user_id is distinct from auth.uid()
     and current_setting('emc.claim_starting_goals', true) is distinct from 'on'
  then
    raise exception 'You can only claim your own starting goals';
  end if;

  select lower(email) into v_email from auth.users where id = p_user_id;
  if v_email is null or position('@' in v_email) < 2 then
    return 0;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'auth'
      and table_name = 'users'
      and column_name = 'email_confirmed_at'
  ) then
    execute 'select email_confirmed_at is not null from auth.users where id = $1'
      into v_confirmed
      using p_user_id;
    if not coalesce(v_confirmed, false) then
      return 0;
    end if;
  end if;

  select id into v_character from public.characters where user_id = p_user_id;
  if v_character is null then
    return 0;
  end if;

  for v_row in
    select *
    from public.pending_starting_goals
    where email = v_email
      and claimed_at is null
    for update
  loop
    insert into public.goals (character_id, category, title, description, is_active, is_long_term)
    values (
      v_character,
      v_row.category,
      btrim(v_row.goal_text),
      case when v_row.needs_cmart then 'needs CMART' else null end,
      not v_row.needs_cmart,
      false
    );
    update public.pending_starting_goals
    set claimed_by = p_user_id,
        claimed_at = now()
    where id = v_row.id;
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.claim_starting_goals(uuid) from public, anon;
grant execute on function public.claim_starting_goals(uuid) to authenticated;

create or replace function public.claim_starting_goals_from_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('emc.claim_starting_goals', 'on', true);
  perform public.claim_starting_goals(new.id);
  return new;
end;
$$;

create or replace function public.claim_starting_goals_from_character()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('emc.claim_starting_goals', 'on', true);
  perform public.claim_starting_goals(new.user_id);
  return new;
end;
$$;

drop trigger if exists claim_starting_goals_on_profile on public.profiles;
create trigger claim_starting_goals_on_profile
  after insert on public.profiles
  for each row execute function public.claim_starting_goals_from_profile();

drop trigger if exists claim_starting_goals_on_character on public.characters;
create trigger claim_starting_goals_on_character
  after insert on public.characters
  for each row execute function public.claim_starting_goals_from_character();

revoke all on function public.claim_starting_goals_from_profile() from public, anon, authenticated;
revoke all on function public.claim_starting_goals_from_character() from public, anon, authenticated;

update public.compliance_tiers
set label = 'Honoured'
where id = 'clearance-36' and label = 'Honored';
