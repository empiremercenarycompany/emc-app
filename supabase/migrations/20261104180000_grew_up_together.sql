-- Not applied. A shared starting proficiency requested by two recruits.
-- Names only. No rules text is stored. Existing characters are not updated until a DM approves.
-- A second run is safe: tables and policies are created only when missing.

create table if not exists public.grew_up_requests (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds (id) on delete cascade,
  requester_character_id uuid not null references public.characters (id) on delete cascade,
  partner_character_id uuid references public.characters (id) on delete cascade,
  requested_by uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('tool', 'language', 'instrument', 'gaming')),
  option_id text not null,
  note text not null check (char_length(btrim(note)) between 1 and 280),
  status text not null default 'pending' check (status in ('pending', 'approved', 'withdrawn')),
  resolved_by uuid references public.profiles (id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  check (partner_character_id is null or partner_character_id <> requester_character_id)
);

create table if not exists public.character_proficiencies (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters (id) on delete cascade,
  request_id uuid not null references public.grew_up_requests (id) on delete cascade,
  kind text not null,
  option_id text not null,
  unique (character_id, request_id)
);

create index if not exists idx_grew_up_requester on public.grew_up_requests (requester_character_id);
create index if not exists idx_grew_up_partner on public.grew_up_requests (partner_character_id);
create index if not exists idx_character_proficiencies_character on public.character_proficiencies (character_id);

alter table public.grew_up_requests enable row level security;
alter table public.character_proficiencies enable row level security;

do $$
begin
  if not exists (select 1 from pg_policy where polname = 'grew_up_select') then
    create policy grew_up_select on public.grew_up_requests
      for select to authenticated
      using (
        public.is_staff()
        or requested_by = (select auth.uid())
        or public.owns_character(requester_character_id)
        or public.owns_character(partner_character_id)
      );
  end if;
  if not exists (select 1 from pg_policy where polname = 'character_proficiencies_select') then
    create policy character_proficiencies_select on public.character_proficiencies
      for select to authenticated
      using (
        public.owns_character(character_id)
        or public.is_staff()
        or exists (
          select 1 from public.characters c
          where c.id = character_proficiencies.character_id
            and public.is_member(c.guild_id)
        )
      );
  end if;
end $$;

create or replace function public.grew_up_option_ok(p_kind text, p_option text)
returns boolean
language sql
immutable
as $$
  select case p_kind
    when 'tool' then p_option in (
      'alchemist','brewer','calligrapher','carpenter','cartographer','cobbler','cook','glassblower',
      'jeweler','leatherworker','mason','painter','potter','smith','tinker','weaver','woodcarver',
      'disguise','forgery','herbalism','navigator','poisoner','thieves'
    )
    when 'language' then p_option in (
      'common','common_sign','draconic','dwarvish','elvish','giant','gnomish','goblin','halfling','orc'
    )
    when 'instrument' then p_option in (
      'bagpipes','drum','dulcimer','flute','horn','lute','lyre','pan_flute','shawm','viol'
    )
    when 'gaming' then p_option in ('dice','dragonchess','cards','three_dragon_ante')
    else false
  end;
$$;

create or replace function public.request_grew_up(
  p_partner text,
  p_kind text,
  p_option text,
  p_note text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_mine uuid;
  v_guild uuid;
  v_partner uuid;
  v_id uuid;
  v_count int;
begin
  if v_user is null then
    raise exception 'Sign in first';
  end if;
  if not public.grew_up_option_ok(p_kind, p_option) then
    raise exception 'Choose a proficiency from the list';
  end if;
  if p_note is null or char_length(btrim(p_note)) < 1 or char_length(btrim(p_note)) > 280 then
    raise exception 'Write a short note';
  end if;
  select id, guild_id into v_mine, v_guild
  from public.characters where user_id = v_user;
  if v_mine is null then
    raise exception 'Create a character first';
  end if;

  select count(*) into v_count
  from public.characters
  where guild_id = v_guild
    and id <> v_mine
    and lower(btrim(name)) = lower(btrim(p_partner));
  if v_count > 1 then
    raise exception 'More than one character has that name';
  elsif v_count = 1 then
    select id into v_partner
    from public.characters
    where guild_id = v_guild
      and id <> v_mine
      and lower(btrim(name)) = lower(btrim(p_partner));
  else
    select count(*) into v_count
    from public.characters c
    join public.profiles p on p.id = c.user_id
    where c.guild_id = v_guild
      and c.id <> v_mine
      and lower(btrim(p.display_name)) = lower(btrim(p_partner));
    if v_count <> 1 then
      raise exception 'That character is not in the Company yet';
    end if;
    select c.id into v_partner
    from public.characters c
    join public.profiles p on p.id = c.user_id
    where c.guild_id = v_guild
      and c.id <> v_mine
      and lower(btrim(p.display_name)) = lower(btrim(p_partner));
  end if;

  if exists (
    select 1 from public.grew_up_requests r
    where r.status in ('pending', 'approved')
      and (
        r.requester_character_id in (v_mine, v_partner)
        or r.partner_character_id in (v_mine, v_partner)
      )
  ) then
    raise exception 'A character can only have one shared start';
  end if;

  insert into public.grew_up_requests (
    guild_id, requester_character_id, partner_character_id, requested_by, kind, option_id, note
  ) values (
    v_guild, v_mine, v_partner, v_user, p_kind, p_option, btrim(p_note)
  )
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.withdraw_grew_up(p_request uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_status text;
begin
  if v_user is null then
    raise exception 'Sign in first';
  end if;
  select status into v_status
  from public.grew_up_requests
  where id = p_request
    and (
      requested_by = v_user
      or public.owns_character(requester_character_id)
      or public.owns_character(partner_character_id)
    )
  for update;
  if v_status is null then
    raise exception 'That request is not yours';
  end if;
  if v_status <> 'pending' then
    raise exception 'Only a pending request can be withdrawn';
  end if;
  update public.grew_up_requests
  set status = 'withdrawn', resolved_by = v_user, resolved_at = now()
  where id = p_request;
end;
$$;

create or replace function public.approve_grew_up(p_request uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_row public.grew_up_requests%rowtype;
begin
  if not public.is_log_approver() then
    raise exception 'Staff role required';
  end if;
  select * into v_row from public.grew_up_requests where id = p_request for update;
  if v_row.id is null then
    raise exception 'Request not found';
  end if;
  if v_row.status <> 'pending' or v_row.partner_character_id is null then
    raise exception 'That request is not waiting';
  end if;
  insert into public.character_proficiencies (character_id, request_id, kind, option_id)
  values
    (v_row.requester_character_id, v_row.id, v_row.kind, v_row.option_id),
    (v_row.partner_character_id, v_row.id, v_row.kind, v_row.option_id);
  update public.grew_up_requests
  set status = 'approved', resolved_by = v_user, resolved_at = now()
  where id = v_row.id;
end;
$$;

revoke all on function public.grew_up_option_ok(text, text) from public, anon;
revoke all on function public.request_grew_up(text, text, text, text) from public, anon;
revoke all on function public.withdraw_grew_up(uuid) from public, anon;
revoke all on function public.approve_grew_up(uuid) from public, anon;
grant execute on function public.grew_up_option_ok(text, text) to authenticated;
grant execute on function public.request_grew_up(text, text, text, text) to authenticated;
grant execute on function public.withdraw_grew_up(uuid) to authenticated;
grant execute on function public.approve_grew_up(uuid) to authenticated;

revoke all on public.grew_up_requests from public, anon;
revoke all on public.character_proficiencies from public, anon;
grant select on public.grew_up_requests to authenticated;
grant select on public.character_proficiencies to authenticated;
