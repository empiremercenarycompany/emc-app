-- DM glossary and wiki rows. Disposable database only. Example names, no roster.

insert into auth.users (id, email) values
  ('88888888-8888-4888-8888-888888888881', 'dm-dash@example.test'),
  ('88888888-8888-4888-8888-888888888882', 'player-dash@example.test'),
  ('88888888-8888-4888-8888-888888888883', 'admin-dash@example.test'),
  ('88888888-8888-4888-8888-888888888884', 'curator-dash@example.test');

select set_config('emc.profile_admin', 'on', false);
update public.profiles set app_role = 'dm' where id = '88888888-8888-4888-8888-888888888881';
update public.profiles set app_role = 'admin' where id = '88888888-8888-4888-8888-888888888883';
update public.profiles set app_role = 'curator' where id = '88888888-8888-4888-8888-888888888884';
select set_config('emc.profile_admin', 'off', false);

do $$
declare
  v_table text;
  v_nullable text;
  v_default text;
begin
  if not public.text_has_dm_only_marker('before [DM-ONLY] after') then
    raise exception 'marker was missed';
  end if;
  if not public.text_has_dm_only_marker('before [ DM-ONLY ] after') then
    raise exception 'spaced marker was missed';
  end if;
  if public.text_has_dm_only_marker('no marker here') then
    raise exception 'plain text looked closed';
  end if;

  foreach v_table in array array[
    'glossary_entries',
    'glossary_dossiers',
    'glossary_entry_bodies',
    'glossary_links',
    'npc_proficiencies'
  ]
  loop
    select is_nullable, column_default into v_nullable, v_default
    from information_schema.columns
    where table_schema = 'public' and table_name = v_table and column_name = 'dm_only';
    if v_nullable is distinct from 'NO' or v_default not ilike '%true%' then
      raise exception '% dm_only nullable % default %', v_table, v_nullable, v_default;
    end if;
  end loop;

  if not exists (
    select 1 from pg_policy
    where polrelid = 'public.glossary_entry_bodies'::regclass
      and not polpermissive
      and pg_get_expr(polqual, polrelid) ilike '%dm_or_open_child%'
  ) then
    raise exception 'body rows have no restrictive dm_only policy';
  end if;
end $$;

select set_config('request.jwt.claim.sub', '88888888-8888-4888-8888-888888888881', false);
set role authenticated;

insert into public.glossary_entries (id, guild_id, kind, name, slug, example)
values (
  '88888888-8888-4888-8888-8888888888a1',
  '11111111-1111-4111-8111-111111111111',
  'npc',
  'Example NPC',
  'example-npc',
  true
);

insert into public.glossary_entries (id, guild_id, kind, name, slug, summary, dm_only, example)
values (
  '88888888-8888-4888-8888-8888888888a2',
  '11111111-1111-4111-8111-111111111111',
  'npc',
  'Published example',
  'published-example',
  'Published example',
  false,
  true
);

insert into public.glossary_dossiers (entry_id, secrets, banter)
values (
  '88888888-8888-4888-8888-8888888888a1',
  'closed example secret',
  array['example line']
);

insert into public.glossary_dossiers (entry_id, dm_only)
values ('88888888-8888-4888-8888-8888888888a2', false);

insert into public.glossary_entry_bodies (entry_id, markdown_body)
values (
  '88888888-8888-4888-8888-8888888888a1',
  E'Visible line\n[DM-ONLY]\nHidden line'
);

insert into public.glossary_entry_bodies (entry_id, markdown_body, dm_only)
values (
  '88888888-8888-4888-8888-8888888888a2',
  'No closed section.',
  false
);

insert into public.glossary_links (from_id, to_slug, to_id)
values (
  '88888888-8888-4888-8888-8888888888a1',
  'example-npc',
  '88888888-8888-4888-8888-8888888888a1'
);

insert into public.glossary_links (from_id, to_slug, to_id, dm_only)
values (
  '88888888-8888-4888-8888-8888888888a2',
  'published-example',
  '88888888-8888-4888-8888-8888888888a2',
  false
);

insert into public.npc_proficiencies (entry_id, kind, option_id)
values ('88888888-8888-4888-8888-8888888888a1', 'skill', 'stealth');

insert into public.npc_proficiencies (entry_id, kind, option_id, dm_only)
values ('88888888-8888-4888-8888-8888888888a2', 'skill', 'perception', false);

insert into public.vault_import_runs (guild_id, errors)
values (
  '11111111-1111-4111-8111-111111111111',
  '["skipped closed section"]'::jsonb
);

do $$
declare
  v_closed boolean;
begin
  select dm_only into v_closed
  from public.glossary_entries
  where id = '88888888-8888-4888-8888-8888888888a1';
  if v_closed is distinct from true then
    raise exception 'omitted dm_only was %', v_closed;
  end if;

  begin
    update public.glossary_entry_bodies
    set markdown_body = 'See [DM-ONLY] this', dm_only = false
    where entry_id = '88888888-8888-4888-8888-8888888888a2';
    raise exception 'open body kept a closed section';
  exception
    when check_violation then null;
  end;

  begin
    insert into public.glossary_entries (guild_id, kind, name, slug, summary, dm_only, example)
    values (
      '11111111-1111-4111-8111-111111111111',
      'npc',
      'Example NPC',
      'bad-marker',
      'Note [ DM-ONLY ] hidden',
      false,
      true
    );
    raise exception 'open summary kept a closed section';
  exception
    when check_violation then null;
  end;
end $$;

reset role;

select set_config('request.jwt.claim.sub', '88888888-8888-4888-8888-888888888882', false);
set role authenticated;

do $$
declare
  v_n int;
begin
  select count(*) into v_n from public.glossary_entries;
  if v_n <> 0 then
    raise exception 'player saw % glossary rows', v_n;
  end if;
  select count(*) into v_n from public.glossary_dossiers;
  if v_n <> 0 then
    raise exception 'player saw % dossiers', v_n;
  end if;
  select count(*) into v_n from public.glossary_entry_bodies;
  if v_n <> 0 then
    raise exception 'player saw % bodies', v_n;
  end if;
  select count(*) into v_n from public.glossary_links;
  if v_n <> 0 then
    raise exception 'player saw % links', v_n;
  end if;
  select count(*) into v_n from public.npc_proficiencies;
  if v_n <> 0 then
    raise exception 'player saw % proficiencies', v_n;
  end if;
  select count(*) into v_n from public.vault_import_runs;
  if v_n <> 0 then
    raise exception 'player saw % import runs', v_n;
  end if;
  begin
    insert into public.glossary_entries (guild_id, kind, name, slug, dm_only, example)
    values (
      '11111111-1111-4111-8111-111111111111',
      'npc',
      'Example NPC',
      'player-row',
      false,
      true
    );
    raise exception 'player inserted a glossary row';
  exception
    when insufficient_privilege then null;
    when others then
      if sqlstate <> '42501' and sqlerrm not ilike '%row-level%' and sqlerrm not ilike '%policy%' then
        raise;
      end if;
  end;
end $$;

reset role;

select set_config('request.jwt.claim.sub', '88888888-8888-4888-8888-888888888883', false);
set role authenticated;
do $$
declare
  v_n int;
begin
  select count(*) into v_n from public.glossary_entry_bodies;
  if v_n <> 0 then
    raise exception 'admin saw % bodies', v_n;
  end if;
  select count(*) into v_n from public.glossary_dossiers where secrets = 'closed example secret';
  if v_n <> 0 then
    raise exception 'admin saw a closed secret';
  end if;
end $$;
reset role;

select set_config('request.jwt.claim.sub', '88888888-8888-4888-8888-888888888884', false);
set role authenticated;
do $$
declare
  v_n int;
begin
  select count(*) into v_n from public.glossary_entries;
  if v_n <> 0 then
    raise exception 'curator saw % glossary rows', v_n;
  end if;
end $$;
reset role;

select set_config('request.jwt.claim.sub', '', false);
set role anon;
do $$
begin
  perform 1 from public.glossary_entries;
  raise exception 'anon read glossary';
exception
  when insufficient_privilege then null;
end $$;
do $$
begin
  perform 1 from public.glossary_entry_bodies;
  raise exception 'anon read a wiki body';
exception
  when insufficient_privilege then null;
end $$;
reset role;

-- A later permissive policy must still hide closed rows and [DM-ONLY] text.
create policy glossary_entries_probe on public.glossary_entries
  as permissive for select to authenticated using (true);
create policy glossary_dossiers_probe on public.glossary_dossiers
  as permissive for select to authenticated using (true);
create policy glossary_entry_bodies_probe on public.glossary_entry_bodies
  as permissive for select to authenticated using (true);
create policy glossary_links_probe on public.glossary_links
  as permissive for select to authenticated using (true);
create policy npc_proficiencies_probe on public.npc_proficiencies
  as permissive for select to authenticated using (true);
create policy vault_import_runs_probe on public.vault_import_runs
  as permissive for select to authenticated using (true);

create view public.glossary_body_probe
with (security_invoker = true, security_barrier = true) as
select entry_id, markdown_body, dm_only
from public.glossary_entry_bodies;

grant select on public.glossary_body_probe to authenticated;

select set_config('request.jwt.claim.sub', '88888888-8888-4888-8888-888888888882', false);
set role authenticated;

do $$
declare
  v_n int;
  v_text text;
begin
  select count(*) into v_n from public.glossary_entries where dm_only;
  if v_n <> 0 then
    raise exception 'player saw % closed entries through a wide policy', v_n;
  end if;
  select count(*) into v_n from public.glossary_entries where slug = 'published-example';
  if v_n <> 1 then
    raise exception 'player missed the open example, saw %', v_n;
  end if;
  select string_agg(coalesce(summary, ''), E'\n') into v_text from public.glossary_entries;
  if v_text ~* '\[\s*dm-only\s*\]' then
    raise exception 'summary leaked a closed section';
  end if;

  select count(*) into v_n from public.glossary_dossiers where secrets = 'closed example secret';
  if v_n <> 0 then
    raise exception 'player saw a closed secret through a wide policy';
  end if;
  select count(*) into v_n from public.glossary_dossiers where 'example line' = any (banter);
  if v_n <> 0 then
    raise exception 'player saw closed banter';
  end if;

  select string_agg(coalesce(markdown_body, ''), E'\n') into v_text from public.glossary_entry_bodies;
  if v_text ~* '\[\s*dm-only\s*\]' or v_text ilike '%hidden line%' then
    raise exception 'body leaked a closed section';
  end if;
  select count(*) into v_n from public.glossary_entry_bodies where markdown_body = 'No closed section.';
  if v_n <> 1 then
    raise exception 'player missed the open body';
  end if;

  select count(*) into v_n
  from public.glossary_body_probe
  where dm_only or markdown_body ~* '\[\s*dm-only\s*\]' or markdown_body ilike '%hidden line%';
  if v_n <> 0 then
    raise exception 'security invoker view leaked % closed bodies', v_n;
  end if;
  select count(*) into v_n from public.glossary_body_probe;
  if v_n <> 1 then
    raise exception 'security invoker view returned % bodies', v_n;
  end if;

  select count(*) into v_n from public.glossary_links where to_slug = 'example-npc';
  if v_n <> 0 then
    raise exception 'player saw a closed link';
  end if;
  select count(*) into v_n from public.npc_proficiencies where option_id = 'stealth';
  if v_n <> 0 then
    raise exception 'player saw a closed proficiency';
  end if;
  select count(*) into v_n from public.npc_proficiencies where option_id = 'perception';
  if v_n <> 1 then
    raise exception 'player missed the open proficiency';
  end if;
  select count(*) into v_n from public.vault_import_runs;
  if v_n <> 0 then
    raise exception 'player saw an import run through a wide policy';
  end if;
end $$;

reset role;

select set_config('request.jwt.claim.sub', '88888888-8888-4888-8888-888888888883', false);
set role authenticated;
do $$
declare
  v_n int;
begin
  select count(*) into v_n from public.glossary_entry_bodies where markdown_body ilike '%hidden line%';
  if v_n <> 0 then
    raise exception 'admin read a closed section through a wide policy';
  end if;
  select count(*) into v_n from public.glossary_dossiers where secrets = 'closed example secret';
  if v_n <> 0 then
    raise exception 'admin read a closed secret through a wide policy';
  end if;
end $$;
reset role;

drop view public.glossary_body_probe;
drop policy glossary_entries_probe on public.glossary_entries;
drop policy glossary_dossiers_probe on public.glossary_dossiers;
drop policy glossary_entry_bodies_probe on public.glossary_entry_bodies;
drop policy glossary_links_probe on public.glossary_links;
drop policy npc_proficiencies_probe on public.npc_proficiencies;
drop policy vault_import_runs_probe on public.vault_import_runs;

select set_config('request.jwt.claim.sub', '88888888-8888-4888-8888-888888888882', false);
set role authenticated;
do $$
declare
  v_n int;
begin
  select count(*) into v_n from public.glossary_entries;
  if v_n <> 0 then
    raise exception 'player still saw glossary rows after the probe';
  end if;
  select count(*) into v_n from public.glossary_entry_bodies;
  if v_n <> 0 then
    raise exception 'player still saw bodies after the probe';
  end if;
end $$;
reset role;

select set_config('request.jwt.claim.sub', '88888888-8888-4888-8888-888888888881', false);
set role authenticated;
do $$
declare
  v_n int;
begin
  select count(*) into v_n from public.glossary_entry_bodies where markdown_body ~* '\[\s*dm-only\s*\]';
  if v_n <> 1 then
    raise exception 'DM could not read the closed section';
  end if;
  select count(*) into v_n from public.glossary_dossiers where secrets = 'closed example secret';
  if v_n <> 1 then
    raise exception 'DM could not read the example secret';
  end if;
end $$;
reset role;

delete from public.glossary_entries
where id in (
  '88888888-8888-4888-8888-8888888888a1',
  '88888888-8888-4888-8888-8888888888a2'
);
delete from public.vault_import_runs
where guild_id = '11111111-1111-4111-8111-111111111111'
  and errors = '["skipped closed section"]'::jsonb;
delete from auth.users where id in (
  '88888888-8888-4888-8888-888888888881',
  '88888888-8888-4888-8888-888888888882',
  '88888888-8888-4888-8888-888888888883',
  '88888888-8888-4888-8888-888888888884'
);
