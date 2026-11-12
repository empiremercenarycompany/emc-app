-- Leak checks for The Sirath. Disposable database only. Accounts are @example.test.

insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'sirath-a@example.test'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'sirath-b@example.test'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 'sirath-dm@example.test');

select set_config('emc.profile_admin', 'on', false);
update public.profiles set app_role = 'dm' where email = 'sirath-dm@example.test';
select set_config('emc.profile_admin', 'off', false);

select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
set role authenticated;
select public.create_character('Sirath A', 'Ash', 'Smith', 'smith', 'athletics', 'human', 10, 9, 8, 8, 8, 8);
reset role;

select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', false);
set role authenticated;
select public.create_character('Sirath B', 'Ash', 'Smith', 'smith', 'athletics', 'human', 10, 9, 8, 8, 8, 8);
reset role;

select set_config('emc.staff_write', 'on', false);
select set_config('emc.progression_write', 'on', false);

insert into public.squads (id, guild_id, name) values
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', '11111111-1111-4111-8111-111111111111', 'Squad A example'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', '11111111-1111-4111-8111-111111111111', 'Squad B example');

update public.characters
set squad_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    intelligence = 14,
    profession_skill = 'arcana'
where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';

update public.characters
set squad_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
    intelligence = 14
where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';

insert into public.sessions (id, guild_id, squad_id, title) values
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc1', '11111111-1111-4111-8111-111111111111', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'Book 2 muster');

insert into public.story_entries (id, guild_id, kind, display_name, hearsay, voice_line, public_name, editorial_status) values
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd1', '11111111-1111-4111-8111-111111111111', 'place', 'Open Square', 'A square.', 'We know this square.', false, 'canon'),
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd2', '11111111-1111-4111-8111-111111111111', 'place', 'The Harbour', 'A harbour.', 'We know the docks.', true, 'canon'),
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd3', '11111111-1111-4111-8111-111111111111', 'person', 'Hidden Courier', 'A courier.', 'We do not name him.', false, 'canon');

insert into public.story_entries_dm (entry_id, true_identity) values
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd3', 'SENTINEL_TRUE_NAME');

insert into public.story_fact_public (id, guild_id, entry_id, tier, skill, culture_key, dc, dc_is_placeholder, teaser, editorial_status) values
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1', '11111111-1111-4111-8111-111111111111', 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1', 'common', null, null, null, false, null, 'canon'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2', '11111111-1111-4111-8111-111111111111', 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1', 'baseline', 'alchemy', null, 14, true, 'A sealed baseline.', 'canon'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee3', '11111111-1111-4111-8111-111111111111', 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1', 'roll', 'alchemy', null, 18, true, 'What was scavenged.', 'canon'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee4', '11111111-1111-4111-8111-111111111111', 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1', 'baseline', 'culture', 'halflings', 14, true, 'A people nearby.', 'canon'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee5', '11111111-1111-4111-8111-111111111111', 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1', 'discovery', null, null, null, false, null, 'canon');

insert into public.story_fact_text (fact_id, body) values
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1', 'Trade passes {{dddddddd-dddd-4ddd-8ddd-ddddddddddd2|The Harbour}} and nobody asks {{dddddddd-dddd-4ddd-8ddd-ddddddddddd3|Hidden Courier}}.'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2', 'ALCHEMY_BASELINE_OPEN'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee3', 'SCAVENGE_SENTINEL_BODY'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee4', 'HALFLING_GARDEN_SENTINEL'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee5', 'SENTINEL_DISCOVERY_BODY');

insert into public.story_fact_staff (fact_id, canon_ref) values
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee3', 'SENTINEL_CANON_REF');

insert into public.story_reveals (guild_id, scope, scope_id, entry_id, source, source_session_id) values
  ('11111111-1111-4111-8111-111111111111', 'squad', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1', 'meeting', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1');

insert into public.story_facets (guild_id, target_id, facet, note) values
  ('11111111-1111-4111-8111-111111111111', 'dddddddd-dddd-4ddd-8ddd-ddddddddddd3', 'weird', 'SENTINEL_FACET_TAG');

insert into public.story_links_dm (guild_id, from_entry_id, to_entry_id, label) values
  ('11111111-1111-4111-8111-111111111111', 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1', 'dddddddd-dddd-4ddd-8ddd-ddddddddddd3', 'SENTINEL_DM_LINK');

insert into public.story_links (guild_id, from_entry_id, to_entry_id, link_type, label, editorial_status) values
  ('11111111-1111-4111-8111-111111111111', 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1', 'dddddddd-dddd-4ddd-8ddd-ddddddddddd2', 'other', 'Near', 'canon');

insert into public.character_knowledge (character_id, guild_id, cultures, languages)
select id, guild_id, array['halflings'], array['Halfling']
from public.characters where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';

insert into public.story_reveals (guild_id, scope, scope_id, entry_id, source) 
select '11111111-1111-4111-8111-111111111111', 'character', id, 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1', 'dm'
from public.characters where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';

-- History roll must not open the alchemy fact.
insert into public.story_checks (guild_id, character_id, entry_id, session_id, kind, skill, total)
select '11111111-1111-4111-8111-111111111111', id, 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1', 'roll', 'history', 20
from public.characters where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'story_fact_public' and column_name in ('body', 'canon_ref', 'pull_quote')
  ) then
    raise exception 'player fact table has a hidden column';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'story_entries' and column_name in ('true_identity', 'past', 'body_dm', 'canon_refs')
  ) then
    raise exception 'player entry table has a DM column';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'story_links' and column_name = 'dm_only'
  ) then
    raise exception 'dm_only is a column instead of its own table';
  end if;
end $$;

select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', false);
set role authenticated;

do $$
declare
  book jsonb;
  n int;
begin
  begin
    perform 1 from public.story_fact_text;
    raise exception 'player read fact bodies';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform 1 from public.story_links;
    raise exception 'player read raw links';
  exception
    when insufficient_privilege then null;
  end;

  select count(*) into n from public.story_entries_dm;
  if n <> 0 then
    raise exception 'player saw DM entry rows';
  end if;

  select count(*) into n from public.story_facets;
  if n <> 0 then
    raise exception 'player saw facets';
  end if;

  select count(*) into n from public.story_links_dm;
  if n <> 0 then
    raise exception 'player saw DM links';
  end if;

  select count(*) into n from public.story_fact_staff;
  if n <> 0 then
    raise exception 'player saw canon refs';
  end if;

  select count(*) into n from public.story_review_queue;
  if n <> 0 then
    raise exception 'player saw the review queue';
  end if;

  select count(*) into n from public.story_entries;
  if n <> 1 then
    raise exception 'player entry count was %', n;
  end if;

  if exists (select 1 from public.story_entries where display_name = 'Hidden Courier') then
    raise exception 'player selected the hidden entry';
  end if;

  if not exists (select 1 from public.story_fact_public where teaser = 'What was scavenged.') then
    raise exception 'sealed teaser was hidden';
  end if;

  if exists (select 1 from public.story_fact_public where teaser like '%SCAVENGE_SENTINEL_BODY%') then
    raise exception 'teaser contained the fact';
  end if;

  select public.sirath_book(id) into book from public.characters where user_id = auth.uid();
  if book::text like '%SCAVENGE_SENTINEL_BODY%' then
    raise exception 'sealed alchemy body leaked';
  end if;
  if book::text like '%HALFLING_GARDEN_SENTINEL%' then
    raise exception 'sealed culture body leaked';
  end if;
  if book::text like '%SENTINEL_DISCOVERY_BODY%' then
    raise exception 'discovery leaked';
  end if;
  if book::text like '%SENTINEL_TRUE_NAME%' or book::text like '%SENTINEL_FACET_TAG%'
     or book::text like '%SENTINEL_DM_LINK%' or book::text like '%SENTINEL_CANON_REF%' then
    raise exception 'DM sentinel leaked into sirath_book';
  end if;
  if book::text like '%Hidden Courier%' or book::text like '%dddddddd-dddd-4ddd-8ddd-ddddddddddd3%' then
    raise exception 'hidden person leaked';
  end if;
  if book::text not like '%{{!plain|The Harbour}}%' then
    raise exception 'public name was not plain text';
  end if;
  if book::text like '%dddddddd-dddd-4ddd-8ddd-ddddddddddd2%' then
    raise exception 'public entry id leaked';
  end if;
  if book::text not like '%ALCHEMY_BASELINE_OPEN%' then
    raise exception 'derived alchemy passive did not open its fact';
  end if;
  if book::text like '%Velryn%' or book::text like '%Dananir%' then
    raise exception 'banned name leaked';
  end if;

  begin
    perform public.sirath_book((select id from public.characters where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'));
    raise exception 'player opened another book';
  exception
    when others then
      if sqlerrm not ilike '%not allowed%' then raise; end if;
  end;

  begin
    insert into public.story_reveals (guild_id, scope, scope_id, entry_id, source)
    values ('11111111-1111-4111-8111-111111111111', 'character', (select id from public.characters where user_id = auth.uid()), 'dddddddd-dddd-4ddd-8ddd-ddddddddddd3', 'dm');
    raise exception 'player inserted a reveal';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.record_meeting('squad', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'dddddddd-dddd-4ddd-8ddd-ddddddddddd3', null);
    raise exception 'player recorded a meeting';
  exception
    when others then
      if sqlerrm not ilike '%not allowed%' then raise; end if;
  end;
end $$;

reset role;

-- Alchemy roll opens the sealed fact. A history 20 did not.
insert into public.story_checks (guild_id, character_id, entry_id, session_id, kind, skill, total)
select '11111111-1111-4111-8111-111111111111', id, 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1', 'roll', 'alchemy', 18
from public.characters where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';

select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', false);
set role authenticated;
do $$
declare
  book jsonb;
begin
  select public.sirath_book(id) into book from public.characters where user_id = auth.uid();
  if book::text not like '%SCAVENGE_SENTINEL_BODY%' then
    raise exception 'alchemy roll did not open its fact';
  end if;
  if book::text like '%Hidden Courier%' then
    raise exception 'opened fact still leaked a hidden name';
  end if;
end $$;
reset role;

select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', false);
set role authenticated;
do $$
declare
  book jsonb;
  n int;
begin
  select count(*) into n from public.story_entries where display_name = 'Open Square';
  if n <> 1 then
    raise exception 'character reveal did not show the entry';
  end if;
  select public.sirath_book(id) into book from public.characters where user_id = auth.uid();
  if book::text not like '%HALFLING_GARDEN_SENTINEL%' then
    raise exception 'culture bonus did not open the fact';
  end if;
  if book::text not like '%"total": 6%' and book::text not like '%"total":6%' then
    raise exception 'culture bonus was not +6';
  end if;
end $$;
reset role;

select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', false);
set role authenticated;
do $$
declare
  n int;
begin
  select count(*) into n from public.story_entries_dm where true_identity = 'SENTINEL_TRUE_NAME';
  if n <> 1 then
    raise exception 'DM could not read the DM table';
  end if;
end $$;
reset role;

select set_config('request.jwt.claim.sub', '', false);
select set_config('request.jwt.claim.role', '', false);
delete from auth.users where email in (
  'sirath-a@example.test',
  'sirath-b@example.test',
  'sirath-dm@example.test'
);
