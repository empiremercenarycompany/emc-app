-- DM dashboard tables. Not a player glossary.
-- dm_only is required and defaults to true so a missed flag stays closed.
-- Permissive and restrictive policies allow is_dm() or is_admin() in the same company.
-- Players, curators, and every other role cannot select these rows, including
-- when dm_only is false. A player-facing view is a later explicit change and
-- has to set (security_invoker = true, security_barrier = true). A view without
-- security_invoker runs as its owner and skips row security.
-- Do not copy a [DM-ONLY] section into a player-visible column.

create or replace function public.text_has_dm_only_marker(p_text text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select coalesce(p_text, '') ~* '\[\s*dm-only\s*\]';
$$;

comment on function public.text_has_dm_only_marker(text) is
  'True when text contains a [DM-ONLY] section marker. An open row cannot store one.';

create table public.glossary_entries (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds (id) on delete cascade,
  kind text not null check (kind in ('npc', 'session', 'map-room', 'beat', 'check')),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  summary text not null default '',
  dm_only boolean not null default true,
  source text check (source is null or source in ('obsidian', 'manual')),
  source_path text,
  imported_at timestamptz,
  review_status text not null default 'unreviewed' check (review_status in ('unreviewed', 'reviewed')),
  example boolean not null default false,
  created_at timestamptz not null default now(),
  unique (guild_id, slug),
  constraint glossary_entries_closed_marker check (
    dm_only or not public.text_has_dm_only_marker(summary)
  )
);

comment on table public.glossary_entries is
  'Shared front for a vault note. dm_only defaults true. Players have no select policy.';
comment on column public.glossary_entries.dm_only is
  'Required. Defaults true (fail closed). Only a DM or an admin can read the row. A false flag does not show it to players.';
comment on column public.glossary_entries.summary is
  'Short description. Blank stays blank. An open row cannot contain a [DM-ONLY] marker.';
comment on column public.glossary_entries.example is
  'True when the row is example data, not a person or place from the table.';
comment on column public.glossary_entries.source_path is
  'Path inside the private vault. Not a player file.';

create table public.glossary_dossiers (
  entry_id uuid primary key references public.glossary_entries (id) on delete cascade,
  personality text not null default '',
  voice text not null default '',
  looks text not null default '',
  encounters text not null default '',
  secrets text not null default '',
  banter text[] not null default '{}',
  dm_only boolean not null default true,
  constraint glossary_dossiers_closed_marker check (
    dm_only
    or (
      not public.text_has_dm_only_marker(personality)
      and not public.text_has_dm_only_marker(voice)
      and not public.text_has_dm_only_marker(looks)
      and not public.text_has_dm_only_marker(encounters)
      and not public.text_has_dm_only_marker(secrets)
      and not public.text_has_dm_only_marker(array_to_string(banter, E'\n'))
    )
  )
);

comment on table public.glossary_dossiers is
  'DM file for one glossary entry. Blank text stays blank. dm_only defaults true.';
comment on column public.glossary_dossiers.secrets is
  'DM file. Not player copy. A [DM-ONLY] marker cannot sit on an open row.';
comment on column public.glossary_dossiers.banter is
  'Short lines. Empty array when none are written.';
comment on column public.glossary_dossiers.dm_only is
  'Required. Defaults true (fail closed). Only a DM or an admin can read the row. A false flag does not show it to players.';

create table public.glossary_entry_bodies (
  entry_id uuid primary key references public.glossary_entries (id) on delete cascade,
  markdown_body text not null default '',
  rendered_checksum text,
  imported_at timestamptz,
  dm_only boolean not null default true,
  constraint glossary_entry_bodies_closed_marker check (
    dm_only or not public.text_has_dm_only_marker(markdown_body)
  )
);

comment on table public.glossary_entry_bodies is
  'Wiki body. markdown_body may contain [DM-ONLY] sections. dm_only defaults true, and the check rejects an open row that still contains the marker. Only a DM or an admin can select a row, including one with dm_only false, until a later explicit player view. That view must set (security_invoker = true, security_barrier = true) and must not copy a [DM-ONLY] section into a player-visible column. A view without security_invoker runs as its owner and skips row security.';
comment on column public.glossary_entry_bodies.dm_only is
  'Required. Defaults true (fail closed). Only a DM or an admin can read the row. A false flag does not show it to players.';
comment on column public.glossary_entry_bodies.markdown_body is
  'Full note text. May contain [DM-ONLY] sections. Those sections stay on a closed row.';

create table public.glossary_links (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references public.glossary_entries (id) on delete cascade,
  to_slug text not null check (char_length(btrim(to_slug)) between 1 and 160),
  to_id uuid references public.glossary_entries (id) on delete set null,
  dm_only boolean not null default true,
  unique (from_id, to_slug),
  constraint glossary_links_closed_marker check (
    dm_only or not public.text_has_dm_only_marker(to_slug)
  )
);

comment on table public.glossary_links is
  'Wiki link between notes. dm_only defaults true. A closed source or target stays hidden from non-DM roles.';
comment on column public.glossary_links.dm_only is
  'Required. Defaults true (fail closed). Only a DM or an admin can read the row. A false flag does not show it to players.';

create table public.npc_proficiencies (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.glossary_entries (id) on delete cascade,
  kind text not null check (kind in ('skill', 'tool', 'weapon', 'language', 'instrument', 'gaming')),
  option_id text not null check (char_length(btrim(option_id)) between 1 and 80),
  dm_only boolean not null default true,
  unique (entry_id, kind, option_id),
  constraint npc_proficiencies_closed_marker check (
    dm_only or not public.text_has_dm_only_marker(option_id)
  )
);

comment on table public.npc_proficiencies is
  'NPC skill, tool, weapon, or language ids. Same shape as character proficiencies. dm_only defaults true.';
comment on column public.npc_proficiencies.dm_only is
  'Required. Defaults true (fail closed). Only a DM or an admin can read the row. A false flag does not show it to players.';

create table public.vault_import_runs (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds (id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  inserted_count int not null default 0 check (inserted_count >= 0),
  updated_count int not null default 0 check (updated_count >= 0),
  skipped_count int not null default 0 check (skipped_count >= 0),
  error_count int not null default 0 check (error_count >= 0),
  errors jsonb not null default '[]'::jsonb,
  created_by uuid references public.profiles (id),
  constraint vault_import_runs_errors_array check (jsonb_typeof(errors) = 'array')
);

comment on table public.vault_import_runs is
  'One vault import. DM only. errors stores short messages, never note bodies, [DM-ONLY] sections, or player addresses.';
comment on column public.vault_import_runs.errors is
  'Short messages only. Do not store note text or a [DM-ONLY] section.';

create index glossary_entries_guild_kind on public.glossary_entries (guild_id, kind);
create index glossary_links_from on public.glossary_links (from_id);
create index glossary_links_to on public.glossary_links (to_id);
create index npc_proficiencies_entry on public.npc_proficiencies (entry_id);
create index vault_import_runs_guild on public.vault_import_runs (guild_id, started_at desc);

alter table public.glossary_entries enable row level security;
alter table public.glossary_dossiers enable row level security;
alter table public.glossary_entry_bodies enable row level security;
alter table public.glossary_links enable row level security;
alter table public.npc_proficiencies enable row level security;
alter table public.vault_import_runs enable row level security;

create policy glossary_entries_dm on public.glossary_entries
  as permissive
  for all
  to authenticated
  using ((public.is_dm() or public.is_admin()) and public.is_member(guild_id))
  with check ((public.is_dm() or public.is_admin()) and public.is_member(guild_id));

create policy glossary_entries_closed on public.glossary_entries
  as restrictive
  for all
  to authenticated
  using ((public.is_dm() or public.is_admin()))
  with check ((public.is_dm() or public.is_admin()));

create policy glossary_dossiers_dm on public.glossary_dossiers
  as permissive
  for all
  to authenticated
  using (
    (public.is_dm() or public.is_admin())
    and exists (
      select 1
      from public.glossary_entries as entry
      where entry.id = glossary_dossiers.entry_id
        and public.is_member(entry.guild_id)
    )
  )
  with check (
    (public.is_dm() or public.is_admin())
    and exists (
      select 1
      from public.glossary_entries as entry
      where entry.id = glossary_dossiers.entry_id
        and public.is_member(entry.guild_id)
    )
  );

create policy glossary_dossiers_closed on public.glossary_dossiers
  as restrictive
  for all
  to authenticated
  using ((public.is_dm() or public.is_admin()))
  with check ((public.is_dm() or public.is_admin()));

create policy glossary_entry_bodies_dm on public.glossary_entry_bodies
  as permissive
  for all
  to authenticated
  using (
    (public.is_dm() or public.is_admin())
    and exists (
      select 1
      from public.glossary_entries as entry
      where entry.id = glossary_entry_bodies.entry_id
        and public.is_member(entry.guild_id)
    )
  )
  with check (
    (public.is_dm() or public.is_admin())
    and exists (
      select 1
      from public.glossary_entries as entry
      where entry.id = glossary_entry_bodies.entry_id
        and public.is_member(entry.guild_id)
    )
  );

create policy glossary_entry_bodies_closed on public.glossary_entry_bodies
  as restrictive
  for all
  to authenticated
  using ((public.is_dm() or public.is_admin()))
  with check ((public.is_dm() or public.is_admin()));

create policy glossary_links_dm on public.glossary_links
  as permissive
  for all
  to authenticated
  using (
    (public.is_dm() or public.is_admin())
    and exists (
      select 1
      from public.glossary_entries as entry
      where entry.id = glossary_links.from_id
        and public.is_member(entry.guild_id)
    )
  )
  with check (
    (public.is_dm() or public.is_admin())
    and exists (
      select 1
      from public.glossary_entries as entry
      where entry.id = glossary_links.from_id
        and public.is_member(entry.guild_id)
    )
  );

create policy glossary_links_closed on public.glossary_links
  as restrictive
  for all
  to authenticated
  using ((public.is_dm() or public.is_admin()))
  with check ((public.is_dm() or public.is_admin()));

create policy npc_proficiencies_dm on public.npc_proficiencies
  as permissive
  for all
  to authenticated
  using (
    (public.is_dm() or public.is_admin())
    and exists (
      select 1
      from public.glossary_entries as entry
      where entry.id = npc_proficiencies.entry_id
        and public.is_member(entry.guild_id)
    )
  )
  with check (
    (public.is_dm() or public.is_admin())
    and exists (
      select 1
      from public.glossary_entries as entry
      where entry.id = npc_proficiencies.entry_id
        and public.is_member(entry.guild_id)
    )
  );

create policy npc_proficiencies_closed on public.npc_proficiencies
  as restrictive
  for all
  to authenticated
  using ((public.is_dm() or public.is_admin()))
  with check ((public.is_dm() or public.is_admin()));

create policy vault_import_runs_dm on public.vault_import_runs
  as permissive
  for all
  to authenticated
  using ((public.is_dm() or public.is_admin()) and public.is_member(guild_id))
  with check ((public.is_dm() or public.is_admin()) and public.is_member(guild_id));

create policy vault_import_runs_closed on public.vault_import_runs
  as restrictive
  for all
  to authenticated
  using ((public.is_dm() or public.is_admin()))
  with check ((public.is_dm() or public.is_admin()));

revoke all on function public.text_has_dm_only_marker(text) from public, anon;
grant execute on function public.text_has_dm_only_marker(text) to authenticated;

revoke all on public.glossary_entries from public, anon, authenticated;
revoke all on public.glossary_dossiers from public, anon, authenticated;
revoke all on public.glossary_entry_bodies from public, anon, authenticated;
revoke all on public.glossary_links from public, anon, authenticated;
revoke all on public.npc_proficiencies from public, anon, authenticated;
revoke all on public.vault_import_runs from public, anon, authenticated;

grant select, insert, update, delete on public.glossary_entries to authenticated;
grant select, insert, update, delete on public.glossary_dossiers to authenticated;
grant select, insert, update, delete on public.glossary_entry_bodies to authenticated;
grant select, insert, update, delete on public.glossary_links to authenticated;
grant select, insert, update, delete on public.npc_proficiencies to authenticated;
grant select, insert, update, delete on public.vault_import_runs to authenticated;
