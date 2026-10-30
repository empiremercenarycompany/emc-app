-- Player NPC notes. A lore approver confirms them. Other staff can read and send them back.
-- can_approve_lore is false until an admin sets it in SQL.

alter table public.profiles
  add column can_approve_lore boolean not null default false;

comment on column public.profiles.can_approve_lore is
  'False until an admin sets it in SQL with emc.profile_admin. Only this flag approves player NPC notes.';

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
  return new;
end;
$$;

create table public.character_npcs (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  relationship text not null default '',
  likeness text not null default '',
  status text not null default 'draft' check (status in ('draft', 'pending', 'approved')),
  review_note text,
  approved_by uuid references public.profiles (id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint character_npcs_story_len check (char_length(relationship) + char_length(likeness) <= 500)
);

alter table public.character_npcs enable row level security;

create policy character_npcs_select on public.character_npcs
  for select to authenticated
  using (
    public.owns_character(character_id)
    or exists (
      select 1 from public.characters c
      where c.id = character_id
        and public.is_member(c.guild_id)
        and public.is_staff()
    )
  );

create index idx_character_npcs_character on public.character_npcs (character_id, status);

create or replace function public.is_lore_approver()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    join public.staff_grant_roles r on r.app_role = p.app_role
    where p.id = auth.uid()
      and p.can_approve_lore
  );
$$;

create or replace function public.save_character_npc(
  p_id uuid,
  p_name text,
  p_relationship text,
  p_likeness text,
  p_submit boolean
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_character uuid;
  v_status text;
  v_next text;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in first';
  end if;
  if p_name is null or char_length(btrim(p_name)) < 1 or char_length(btrim(p_name)) > 80 then
    raise exception 'Give them a name';
  end if;
  if char_length(coalesce(p_relationship, '')) + char_length(coalesce(p_likeness, '')) > 500 then
    raise exception 'Relationship and description stay within 500 characters';
  end if;
  select id into v_character from public.characters where user_id = auth.uid();
  if v_character is null then
    raise exception 'Sign the Recruit Oath first';
  end if;
  v_next := case when coalesce(p_submit, false) then 'pending' else 'draft' end;
  if p_id is null then
    insert into public.character_npcs (character_id, name, relationship, likeness, status)
    values (v_character, btrim(p_name), coalesce(p_relationship, ''), coalesce(p_likeness, ''), v_next)
    returning id into v_id;
    return v_id;
  end if;
  select status into v_status
  from public.character_npcs
  where id = p_id and character_id = v_character
  for update;
  if v_status is null then
    raise exception 'That note is not yours';
  end if;
  if v_status = 'approved' then
    raise exception 'An approved note stays. Ask a DM to send it back.';
  end if;
  if v_status = 'pending' and v_next = 'draft' then
    v_next := 'pending';
  end if;
  update public.character_npcs
  set name = btrim(p_name),
      relationship = coalesce(p_relationship, ''),
      likeness = coalesce(p_likeness, ''),
      status = v_next,
      updated_at = now()
  where id = p_id;
  return p_id;
end;
$$;

create or replace function public.approve_character_npc(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_character uuid;
  v_owner uuid;
begin
  if not public.is_lore_approver() then
    raise exception 'A lore approver confirms this note';
  end if;
  select n.character_id, c.user_id into v_character, v_owner
  from public.character_npcs n
  join public.characters c on c.id = n.character_id
  where n.id = p_id
  for update of n;
  if v_character is null then
    raise exception 'Note not found';
  end if;
  if not public.is_member((select guild_id from public.characters where id = v_character)) then
    raise exception 'A lore approver confirms this note';
  end if;
  if v_owner = auth.uid() then
    raise exception 'You cannot approve your own note';
  end if;
  update public.character_npcs
  set status = 'approved',
      approved_by = auth.uid(),
      approved_at = now(),
      updated_at = now()
  where id = p_id;
end;
$$;

create or replace function public.return_character_npc(p_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_character uuid;
begin
  if not public.is_staff() then
    raise exception 'A DM sends a note back';
  end if;
  if p_note is null or char_length(btrim(p_note)) < 1 then
    raise exception 'Say what to change';
  end if;
  select n.character_id into v_character
  from public.character_npcs n
  join public.characters c on c.id = n.character_id
  where n.id = p_id
    and public.is_member(c.guild_id)
  for update of n;
  if v_character is null then
    raise exception 'Note not found';
  end if;
  update public.character_npcs
  set status = 'draft',
      review_note = btrim(p_note),
      approved_by = null,
      approved_at = null,
      updated_at = now()
  where id = p_id;
end;
$$;

revoke all on function public.is_lore_approver() from public, anon;
revoke all on function public.save_character_npc(uuid, text, text, text, boolean) from public, anon;
revoke all on function public.approve_character_npc(uuid) from public, anon;
revoke all on function public.return_character_npc(uuid, text) from public, anon;
grant execute on function public.is_lore_approver() to authenticated;
grant execute on function public.save_character_npc(uuid, text, text, text, boolean) to authenticated;
grant execute on function public.approve_character_npc(uuid) to authenticated;
grant execute on function public.return_character_npc(uuid, text) to authenticated;

revoke all on public.character_npcs from public, anon;
grant select on public.character_npcs to authenticated;
