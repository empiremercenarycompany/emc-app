-- The Sirath (story book). Not applied by this change.
-- Player tables hold only what a member may eventually see.
-- DM-only rows live in separate tables. Fact bodies live apart from teasers,
-- and members cannot select bodies directly: sirath_book() scrubs them.

create schema if not exists sirath_internal;

revoke all on schema sirath_internal from public, anon, authenticated;
grant usage on schema sirath_internal to postgres;

-- ============================================================
-- RULES (one row)
-- ============================================================

create table public.story_rules (
  id int primary key check (id = 1),
  culture_bonus_own int not null default 4 check (culture_bonus_own >= 0),
  culture_bonus_language int not null default 2 check (culture_bonus_language >= 0),
  culture_bonus_stacks boolean not null default true,
  culture_language jsonb not null default '{"halflings":"Halfling"}'::jsonb,
  chit_note text not null default 'Chits from allied factions, or from inside the same overall faction, trade 2 for 1 (R-118).'
);

comment on table public.story_rules is
  'One config row. Culture bonuses stack (John, 2026-11-12): +4 own culture and +2 language, up to +6. culture_language maps a culture key to a 2024 language name. halflings has no story entry yet.';

insert into public.story_rules (id) values (1);

-- Staff-set knowledge. skill_mods null means derive from the sheet.
-- cultures is not filled from species. That map is not ruled.
create table public.character_knowledge (
  character_id uuid primary key references public.characters (id) on delete cascade,
  guild_id uuid not null references public.guilds (id) on delete cascade,
  skill_mods jsonb,
  cultures text[] not null default '{}',
  languages text[] not null default '{}'
);

comment on column public.character_knowledge.cultures is
  'Sirath culture keys, set by staff. Do not infer these from species.';
comment on column public.character_knowledge.skill_mods is
  'Optional override of the six knowledge modifiers. Null keys are derived: ability modifier plus proficiency when trained. Alchemy reads the Arcana skill (shown as Alchemy). Culture reads the Religion skill (shown as Culture). Expertise is not stored.';

-- ============================================================
-- ENTRIES
-- ============================================================

create table public.story_entries (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds (id) on delete cascade,
  kind text not null check (kind in ('person', 'place', 'faction', 'thing', 'event', 'creature')),
  display_name text not null,
  aliases text[] not null default '{}',
  tags text[] not null default '{}',
  hearsay text not null default '',
  voice_line text not null default '',
  image jsonb,
  ward text,
  faction_hint_id uuid references public.story_entries (id) on delete set null,
  public_name boolean not null default false,
  editorial_status text not null default 'draft' check (editorial_status in ('draft', 'canon')),
  created_by uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);

comment on column public.story_entries.public_name is
  'Default false (smudged). True shows the display name as plain text before the entry is learned, with no link and no id.';
comment on table public.story_entries is
  'Player-facing canon columns only. True identity, past, and canon refs are in story_entries_dm.';

create table public.story_entries_dm (
  entry_id uuid primary key references public.story_entries (id) on delete cascade,
  true_identity text,
  past text,
  body_dm text,
  public_name_basis text,
  canon_refs text[] not null default '{}',
  slug text
);

create unique index story_entries_dm_slug on public.story_entries_dm (slug) where slug is not null;

comment on table public.story_entries_dm is
  'Staff only. Never joined into a player payload.';

create table public.story_fact_public (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds (id) on delete cascade,
  entry_id uuid not null references public.story_entries (id) on delete cascade,
  tier text not null check (tier in ('common', 'baseline', 'roll', 'discovery')),
  skill text check (skill in ('history', 'medicine', 'culture', 'alchemy', 'nature', 'survival')),
  culture_key text,
  dc int,
  dc_is_placeholder boolean not null default true,
  teaser text,
  editorial_status text not null default 'draft' check (editorial_status in ('draft', 'canon')),
  constraint story_fact_skill_required check (
    (tier in ('baseline', 'roll') and skill is not null)
    or (tier in ('common', 'discovery') and skill is null)
  ),
  constraint story_fact_culture_key check (skill = 'culture' or culture_key is null)
);

comment on column public.story_fact_public.culture_key is
  'Reserved culture id. halflings has no entry yet, so this is text and not a foreign key.';
comment on column public.story_fact_public.teaser is
  'Shown while a baseline or roll fact is sealed. It must not contain the fact.';

create table public.story_fact_text (
  fact_id uuid primary key references public.story_fact_public (id) on delete cascade,
  body text not null,
  pull_quote text,
  adds_aliases text[] not null default '{}'
);

comment on table public.story_fact_text is
  'Bodies and pull quotes. Members have no select grant. sirath_book() returns a body only when the fact is known, with hidden names scrubbed.';

create table public.story_fact_staff (
  fact_id uuid primary key references public.story_fact_public (id) on delete cascade,
  canon_ref text,
  skill_tag_reason text
);

comment on table public.story_fact_staff is
  'Staff only. Canon refs never ride along on a player fact.';

create table public.story_links (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds (id) on delete cascade,
  from_entry_id uuid not null references public.story_entries (id) on delete cascade,
  to_entry_id uuid not null references public.story_entries (id) on delete cascade,
  link_type text not null check (link_type in ('owns', 'associates', 'holds_position', 'based_in', 'runs', 'other')),
  label text not null,
  editorial_status text not null default 'draft' check (editorial_status in ('draft', 'canon'))
);

comment on table public.story_links is
  'Player links only. A link that must stay hidden goes in story_links_dm instead of a flag on this table.';

create table public.story_links_dm (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds (id) on delete cascade,
  from_entry_id uuid references public.story_entries (id) on delete cascade,
  to_entry_id uuid references public.story_entries (id) on delete cascade,
  link_type text not null default 'other',
  label text not null,
  note text
);

comment on table public.story_links_dm is
  'Staff only. Hidden links belong here and nowhere a player can select.';

create table public.story_reveals (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds (id) on delete cascade,
  scope text not null check (scope in ('character', 'squad')),
  scope_id uuid not null,
  entry_id uuid references public.story_entries (id) on delete cascade,
  fact_id uuid references public.story_fact_public (id) on delete cascade,
  link_id uuid,
  source text not null check (source in ('meeting', 'passive', 'roll', 'dm')),
  skill text check (skill in ('history', 'medicine', 'culture', 'alchemy', 'nature', 'survival')),
  source_session_id uuid references public.sessions (id) on delete set null,
  revealed_by uuid references public.profiles (id),
  revealed_at timestamptz not null default now(),
  constraint story_reveals_one_target check (num_nonnulls(entry_id, fact_id, link_id) = 1)
);

comment on table public.story_reveals is
  'Insert only. A correction does not delete a reveal.';

create table public.story_checks (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds (id) on delete cascade,
  character_id uuid not null references public.characters (id) on delete cascade,
  entry_id uuid not null references public.story_entries (id) on delete cascade,
  session_id uuid references public.sessions (id) on delete set null,
  kind text not null check (kind in ('passive', 'roll')),
  skill text not null check (skill in ('history', 'medicine', 'culture', 'alchemy', 'nature', 'survival')),
  total int not null,
  recorded_by uuid references public.profiles (id),
  recorded_at timestamptz not null default now()
);

comment on column public.story_checks.total is
  'd20 plus the skill modifier, as rolled. Culture bonus is not included.';

create table public.story_facets (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds (id) on delete cascade,
  target_kind text not null default 'entry',
  target_id uuid not null,
  facet text not null check (facet in ('good', 'bad', 'weird')),
  note text
);

comment on table public.story_facets is
  'Staff only. Never a label, sort, colour, or filter.';

create table public.story_canon_changes (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds (id) on delete cascade,
  target_kind text not null,
  target_id uuid not null,
  from_status text,
  to_status text,
  change_tier text not null default 'small' check (change_tier in ('small', 'middle', 'big')),
  review_note text,
  approver_role text,
  approver_id uuid references public.profiles (id),
  approved_at timestamptz not null default now()
);

create table public.story_review_queue (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds (id) on delete cascade,
  squad_id uuid references public.squads (id) on delete set null,
  character_id uuid references public.characters (id) on delete set null,
  session_id uuid references public.sessions (id) on delete set null,
  recap_id uuid,
  proposed jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'approved', 'editing', 'held')),
  drafted_by text not null default 'system',
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz
);

comment on table public.story_review_queue is
  'Staff only. Players see nothing in here until approval writes reveals or checks.';

create table public.story_notes (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds (id) on delete cascade,
  entry_id uuid not null references public.story_entries (id) on delete cascade,
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  character_id uuid references public.characters (id) on delete cascade,
  body text not null default '',
  updated_at timestamptz not null default now(),
  unique (entry_id, owner_profile_id)
);

comment on table public.story_notes is
  'Private to the owner. Staff cannot select these unless that rule changes.';

create table public.story_badge_seen (
  character_id uuid not null references public.characters (id) on delete cascade,
  session_id uuid not null references public.sessions (id) on delete cascade,
  seen_at timestamptz not null default now(),
  primary key (character_id, session_id)
);

create index story_reveals_scope on public.story_reveals (scope, scope_id);
create index story_reveals_entry on public.story_reveals (entry_id);
create index story_fact_public_entry on public.story_fact_public (entry_id);
create index story_checks_character on public.story_checks (character_id, entry_id, skill);

-- ============================================================
-- INTERNAL GATE
-- ============================================================

create or replace function sirath_internal.skill_modifier(p_character uuid, p_skill text)
returns int
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  c public.characters;
  sheet_id text;
  ability int;
  trained boolean;
  bonus int;
  override jsonb;
begin
  select * into c from public.characters where id = p_character;
  if not found then
    return 0;
  end if;
  select skill_mods into override from public.character_knowledge where character_id = p_character;
  if override is not null and override ? p_skill then
    return (override ->> p_skill)::int;
  end if;
  sheet_id := case p_skill
    when 'alchemy' then 'arcana'
    when 'culture' then 'religion'
    else p_skill
  end;
  ability := case sheet_id
    when 'history' then c.intelligence
    when 'arcana' then c.intelligence
    when 'religion' then c.intelligence
    when 'nature' then c.intelligence
    when 'medicine' then c.wisdom
    when 'survival' then c.wisdom
    else 10
  end;
  trained := sheet_id = c.profession_skill
    or sheet_id = any (coalesce(c.granted_skills, '{}'))
    or sheet_id = any (coalesce(c.background_skills, '{}'))
    or exists (
      select 1 from public.character_proficiencies p
      where p.character_id = c.id and p.kind = 'skill' and p.option_id = sheet_id
    );
  bonus := 2 + floor((least(20, greatest(1, c.level)) - 1) / 4.0)::int;
  return floor((ability - 10) / 2.0)::int + case when trained then bonus else 0 end;
end;
$$;

create or replace function sirath_internal.culture_extra(p_character uuid, p_skill text, p_culture_key text)
returns int
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  rules public.story_rules;
  cultures text[] := '{}';
  languages text[] := '{}';
  granted text[];
  wanted text;
  own int := 0;
  knows int := 0;
begin
  if p_skill is distinct from 'culture' or p_culture_key is null then
    return 0;
  end if;
  select * into rules from public.story_rules where id = 1;
  select k.cultures, k.languages into cultures, languages
  from public.character_knowledge k where k.character_id = p_character;
  cultures := coalesce(cultures, '{}');
  languages := coalesce(languages, '{}');
  select coalesce(c.granted_languages, '{}') into granted from public.characters c where c.id = p_character;
  wanted := rules.culture_language ->> p_culture_key;
  if p_culture_key = any (cultures) then
    own := rules.culture_bonus_own;
  end if;
  if wanted is not null and exists (
    select 1 from unnest(languages || coalesce(granted, '{}')) as lang
    where lower(lang) = lower(wanted)
  ) then
    knows := rules.culture_bonus_language;
  end if;
  if rules.culture_bonus_stacks then
    return own + knows;
  end if;
  return greatest(own, knows);
end;
$$;

create or replace function sirath_internal.best_roll(p_character uuid, p_entry uuid, p_skill text)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select max(total) from public.story_checks
  where character_id = p_character and entry_id = p_entry and skill = p_skill and kind = 'roll';
$$;

-- True when this character may read the fact body.
create or replace function sirath_internal.character_knows_fact(p_character uuid, p_fact uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  f public.story_fact_public;
  squad uuid;
  passive int;
  extra int;
  roll int;
begin
  select * into f from public.story_fact_public where id = p_fact;
  if not found or f.editorial_status <> 'canon' then
    return false;
  end if;
  select squad_id into squad from public.characters where id = p_character;
  if f.tier = 'common' then
    return exists (
      select 1 from public.story_reveals r
      where r.entry_id = f.entry_id
        and ((r.scope = 'character' and r.scope_id = p_character) or (r.scope = 'squad' and r.scope_id is not distinct from squad))
    );
  end if;
  if f.tier = 'discovery' then
    return exists (
      select 1 from public.story_reveals r
      where r.fact_id = f.id
        and ((r.scope = 'character' and r.scope_id = p_character) or (r.scope = 'squad' and r.scope_id is not distinct from squad))
    );
  end if;
  extra := sirath_internal.culture_extra(p_character, f.skill, f.culture_key);
  passive := 10 + sirath_internal.skill_modifier(p_character, f.skill) + extra;
  roll := sirath_internal.best_roll(p_character, f.entry_id, f.skill);
  if f.tier = 'baseline' and passive >= coalesce(f.dc, 99) then
    return true;
  end if;
  if roll is not null and roll + extra >= coalesce(f.dc, 99) then
    return true;
  end if;
  return false;
end;
$$;

create or replace function sirath_internal.caller_knows_fact(p_fact uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  cid uuid;
begin
  if public.is_dm() or public.is_staff() then
    return true;
  end if;
  select id into cid from public.characters where user_id = auth.uid();
  if cid is null then
    return false;
  end if;
  return sirath_internal.character_knows_fact(cid, p_fact);
end;
$$;

create or replace function sirath_internal.entry_visible_to(p_entry uuid, p_character uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.story_reveals r
    join public.story_entries e on e.id = r.entry_id
    join public.characters c on c.id = p_character
    where r.entry_id = p_entry
      and e.editorial_status = 'canon'
      and (
        (r.scope = 'character' and r.scope_id = c.id)
        or (r.scope = 'squad' and r.scope_id is not distinct from c.squad_id)
      )
  );
$$;

revoke all on function sirath_internal.skill_modifier(uuid, text) from public, anon, authenticated;
revoke all on function sirath_internal.culture_extra(uuid, text, text) from public, anon, authenticated;
revoke all on function sirath_internal.best_roll(uuid, uuid, text) from public, anon, authenticated;
revoke all on function sirath_internal.character_knows_fact(uuid, uuid) from public, anon, authenticated;
revoke all on function sirath_internal.caller_knows_fact(uuid) from public, anon, authenticated;
revoke all on function sirath_internal.entry_visible_to(uuid, uuid) from public, anon, authenticated;

-- ============================================================
-- PLAYER BOOK
-- ============================================================

-- Strip unfinished notes before a string can leave sirath_book().
create or replace function sirath_internal.player_text(p_text text)
returns text
language sql
immutable
as $$
  select nullif(
    btrim(regexp_replace(coalesce(p_text, ''), '[^.!?]*TBD[^.!?]*[.!?]?', '', 'gi')),
    ''
  );
$$;

create or replace function sirath_internal.scrub_player_json(p jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  key text;
  item jsonb;
  cleaned jsonb := '{}'::jsonb;
begin
  if p is null then
    return null;
  elsif jsonb_typeof(p) = 'string' then
    return to_jsonb(coalesce(sirath_internal.player_text(p #>> '{}'), ''));
  elsif jsonb_typeof(p) = 'array' then
    select coalesce(jsonb_agg(sirath_internal.scrub_player_json(value)), '[]'::jsonb)
      into cleaned
    from jsonb_array_elements(p);
    return cleaned;
  elsif jsonb_typeof(p) = 'object' then
    for key, item in select * from jsonb_each(p)
    loop
      cleaned := cleaned || jsonb_build_object(key, sirath_internal.scrub_player_json(item));
    end loop;
    return cleaned;
  end if;
  return p;
end;
$$;

create or replace function public.sirath_book(p_character_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, sirath_internal
as $$
declare
  c public.characters;
  squad_label text;
  mods jsonb := '{}'::jsonb;
  skill text;
  sessions_sq uuid[];
  latest uuid;
  seen uuid;
  result jsonb;
  entries jsonb := '[]'::jsonb;
  links jsonb := '[]'::jsonb;
  new_ids jsonb := '[]'::jsonb;
  check_ids jsonb := '[]'::jsonb;
  session_ids jsonb := '[]'::jsonb;
  tokens jsonb := '{}'::jsonb;
  token_n int := 0;
  e record;
  f record;
  ln record;
  facts jsonb;
  aliases text[];
  known boolean;
  extra int;
  passive int;
  roll int;
  how text;
  bonus jsonb;
  body text;
  entry_rank int;
  is_new boolean;
  from_session boolean;
  hint jsonb;
  chits text;
  last_meet jsonb;
  learned int := 0;
  passives jsonb := '{}'::jsonb;
  lead jsonb;
  last_session jsonb;
  latest_label jsonb;
begin
  if auth.uid() is null then
    raise exception 'not allowed';
  end if;
  select * into c from public.characters where id = p_character_id;
  if not found then
    raise exception 'not allowed';
  end if;
  if c.user_id is distinct from auth.uid() and not (public.is_dm() or public.is_staff()) then
    raise exception 'not allowed';
  end if;

  foreach skill in array array['history', 'medicine', 'culture', 'alchemy', 'nature', 'survival']
  loop
    mods := mods || jsonb_build_object(skill, sirath_internal.skill_modifier(c.id, skill));
    passives := passives || jsonb_build_object(skill, 10 + sirath_internal.skill_modifier(c.id, skill));
  end loop;

  select name into squad_label from public.squads where id = c.squad_id;
  select coalesce(array_agg(s.id order by s.created_at, s.id), '{}')
    into sessions_sq
  from public.sessions s
  where s.squad_id = c.squad_id and s.guild_id = c.guild_id;
  if array_length(sessions_sq, 1) is null then
    latest := null;
  else
    latest := sessions_sq[array_length(sessions_sq, 1)];
  end if;

  select seen_session into seen from (
    select session_id as seen_session from public.story_badge_seen
    where character_id = c.id and session_id = latest
  ) q;

  for e in
    select * from public.story_entries
    where guild_id = c.guild_id and editorial_status = 'canon'
      and sirath_internal.entry_visible_to(id, c.id)
    order by display_name
  loop
    learned := learned + 1;
    facts := '{"common":[],"recall":[],"sealed":[],"uncovered":[]}'::jsonb;
    aliases := coalesce(e.aliases, '{}');
    is_new := false;
    from_session := false;
    entry_rank := 0;

    if exists (
      select 1 from public.story_reveals r
      where r.entry_id = e.id and r.source_session_id = latest
        and ((r.scope = 'character' and r.scope_id = c.id) or (r.scope = 'squad' and r.scope_id is not distinct from c.squad_id))
    ) then
      is_new := latest is not null;
      from_session := latest is not null;
    end if;

    for f in
      select p.*, t.body, t.pull_quote, t.adds_aliases
      from public.story_fact_public p
      join public.story_fact_text t on t.fact_id = p.id
      where p.entry_id = e.id and p.editorial_status = 'canon'
      order by p.tier, p.id
    loop
      known := sirath_internal.character_knows_fact(c.id, f.id);
      if f.tier = 'common' then
        body := sirath_internal.scrub_body(f.body, c.id, tokens);
        -- scrub_body updates tokens via a session guc. See function.
        tokens := current_setting('sirath.tokens', true)::jsonb;
        facts := jsonb_set(facts, '{common}', (facts->'common') || jsonb_build_array(jsonb_build_object(
          'id', f.id, 'body', body, 'pull_quote', f.pull_quote
        )));
        aliases := aliases || coalesce(f.adds_aliases, '{}');
      elsif f.tier in ('baseline', 'roll') then
        extra := sirath_internal.culture_extra(c.id, f.skill, f.culture_key);
        passive := 10 + (mods ->> f.skill)::int + extra;
        roll := sirath_internal.best_roll(c.id, e.id, f.skill);
        how := null;
        if f.tier = 'baseline' and passive >= coalesce(f.dc, 99) then
          how := 'passive';
        elsif roll is not null and roll + extra >= coalesce(f.dc, 99) then
          how := 'roll';
        end if;
        if how is not null then
          if extra > 0 then
            bonus := jsonb_build_object(
              'own_culture', case when f.culture_key is not null and f.culture_key = any (coalesce((select cultures from public.character_knowledge where character_id = c.id), '{}')) then (select culture_bonus_own from public.story_rules where id = 1) else 0 end,
              'knows_language', extra - case when f.culture_key is not null and f.culture_key = any (coalesce((select cultures from public.character_knowledge where character_id = c.id), '{}')) then (select culture_bonus_own from public.story_rules where id = 1) else 0 end,
              'total', extra
            );
          else
            bonus := null;
          end if;
          body := sirath_internal.scrub_body(f.body, c.id, coalesce(nullif(current_setting('sirath.tokens', true), ''), '{}')::jsonb);
          tokens := current_setting('sirath.tokens', true)::jsonb;
          facts := jsonb_set(facts, '{recall}', (facts->'recall') || jsonb_build_array(jsonb_build_object(
            'id', f.id,
            'body', body,
            'skill', f.skill,
            'skill_label', initcap(f.skill),
            'how', how,
            'dc', f.dc,
            'bonus', bonus,
            'dc_is_placeholder', f.dc_is_placeholder,
            'pull_quote', f.pull_quote
          )));
          aliases := aliases || coalesce(f.adds_aliases, '{}');
        else
          facts := jsonb_set(facts, '{sealed}', (facts->'sealed') || jsonb_build_array(jsonb_build_object(
            'skill', f.skill,
            'skill_label', initcap(f.skill),
            'dc', f.dc,
            'dc_is_placeholder', f.dc_is_placeholder,
            'teaser', coalesce(nullif(f.teaser, ''), 'More you might recall.'),
            'opens_by', case when f.tier = 'roll'
              then initcap(f.skill) || ' roll'
              else initcap(f.skill) || ' roll (or a higher passive ' || initcap(f.skill) || ')'
            end
          )));
        end if;
      elsif f.tier = 'discovery' and known then
        body := sirath_internal.scrub_body(f.body, c.id, coalesce(nullif(current_setting('sirath.tokens', true), ''), '{}')::jsonb);
        tokens := current_setting('sirath.tokens', true)::jsonb;
        facts := jsonb_set(facts, '{uncovered}', (facts->'uncovered') || jsonb_build_array(jsonb_build_object(
          'id', f.id, 'body', body, 'pull_quote', f.pull_quote,
          'session', (
            select jsonb_build_object('id', s.id, 'label', s.title, 'date', s.scheduled_at)
            from public.story_reveals r
            left join public.sessions s on s.id = r.source_session_id
            where r.fact_id = f.id
              and ((r.scope = 'character' and r.scope_id = c.id) or (r.scope = 'squad' and r.scope_id is not distinct from c.squad_id))
            order by r.revealed_at desc
            limit 1
          )
        )));
        aliases := aliases || coalesce(f.adds_aliases, '{}');
        if exists (
          select 1 from public.story_reveals r
          where r.fact_id = f.id and r.source_session_id = latest
            and ((r.scope = 'character' and r.scope_id = c.id) or (r.scope = 'squad' and r.scope_id is not distinct from c.squad_id))
        ) then
          is_new := latest is not null;
          from_session := latest is not null;
        end if;
      end if;
    end loop;

    if latest is not null and exists (
      select 1 from public.story_checks ck
      where ck.character_id = c.id and ck.entry_id = e.id and ck.session_id = latest
    ) then
      is_new := true;
      check_ids := check_ids || to_jsonb(e.id);
    end if;
    if is_new then
      new_ids := new_ids || to_jsonb(e.id);
    end if;
    if from_session then
      session_ids := session_ids || to_jsonb(e.id);
    end if;

    hint := null;
    if e.faction_hint_id is not null and sirath_internal.entry_visible_to(e.faction_hint_id, c.id) then
      select jsonb_build_object('id', h.id, 'name', h.display_name) into hint
      from public.story_entries h where h.id = e.faction_hint_id;
    end if;

    select jsonb_build_object('id', s.id, 'label', s.title, 'date', to_char(s.scheduled_at, 'YYYY-MM-DD'))
      into last_meet
    from public.story_reveals r
    join public.sessions s on s.id = r.source_session_id
    where r.entry_id = e.id and r.source = 'meeting'
      and ((r.scope = 'character' and r.scope_id = c.id) or (r.scope = 'squad' and r.scope_id is not distinct from c.squad_id))
    order by r.revealed_at desc
    limit 1;

    entries := entries || jsonb_build_array(jsonb_build_object(
      'id', e.id,
      'kind', e.kind,
      'display_name', e.display_name,
      'aliases', to_jsonb(aliases),
      'tags', to_jsonb(coalesce(e.tags, '{}')),
      'hearsay', e.hearsay,
      'voice_line', e.voice_line,
      'image', e.image,
      'ward', e.ward,
      'faction_hint', hint,
      'chits', null,
      'last_encounter', last_meet,
      'learned_rank', entry_rank,
      'tiers', facts
    ));
  end loop;

  for ln in
    select * from public.story_links
    where guild_id = c.guild_id and editorial_status = 'canon'
      and (sirath_internal.entry_visible_to(from_entry_id, c.id) or sirath_internal.entry_visible_to(to_entry_id, c.id))
  loop
    links := links || jsonb_build_array(jsonb_build_object(
      'from', sirath_internal.link_end(ln.from_entry_id, c.id),
      'to', sirath_internal.link_end(ln.to_entry_id, c.id),
      'label', ln.label
    ));
  end loop;

  if latest is not null then
    select jsonb_build_object('id', s.id, 'label', s.title, 'date', to_char(s.scheduled_at, 'YYYY-MM-DD'))
      into latest_label
    from public.sessions s where s.id = latest;
  end if;

  select jsonb_agg(l.text) into lead from (
    select value as text from jsonb_array_elements_text('[]'::jsonb)
  ) l;
  lead := '[]'::jsonb;

  last_session := null;
  result := jsonb_build_object(
    'viewer', jsonb_build_object(
      'character_id', c.id,
      'label', c.name,
      'passive_history', (passives ->> 'history')::int,
      'passives', passives,
      'squad', coalesce(squad_label, '')
    ),
    'is_new_recruit', latest is null,
    'entries', entries,
    'links', links,
    'unknown_nouns', jsonb_build_object(
      'person', 'someone you haven''t identified',
      'place', 'a place you haven''t learned',
      'faction', 'a group you haven''t learned',
      'thing', 'something you haven''t identified',
      'event', 'something you haven''t learned',
      'creature', 'a creature you haven''t identified'
    ),
    'home', jsonb_build_object(
      'learned_count', learned,
      'latest_session', latest_label,
      'last_session', last_session,
      'open_leads', lead,
      'new_entry_ids', new_ids,
      'new_from_checkin_ids', check_ids,
      'new_from_session_ids', session_ids,
      'badge_cleared', seen is not null
    ),
    'chit_note', (select chit_note from public.story_rules where id = 1)
  );
  return sirath_internal.scrub_player_json(result);
end;
$$;

-- Token state is a transaction-local guc so scrub and link_end share one map.
create or replace function sirath_internal.scrub_body(p_body text, p_character uuid, p_tokens jsonb)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  tokens jsonb := coalesce(p_tokens, coalesce(nullif(current_setting('sirath.tokens', true), ''), '{}')::jsonb);
  out text := '';
  rest text := coalesce(p_body, '');
  pos int;
  close_at int;
  chunk text;
  inner_text text;
  eid text;
  label text;
  entry public.story_entries;
  token text;
  n int;
begin
  loop
    pos := position('{{' in rest);
    exit when pos = 0;
    out := out || substring(rest from 1 for pos - 1);
    close_at := position('}}' in substring(rest from pos));
    exit when close_at = 0;
    chunk := substring(rest from pos for close_at + 1);
    rest := substring(rest from pos + close_at + 1);
    inner_text := substring(chunk from 3 for length(chunk) - 4);
    eid := split_part(inner_text, '|', 1);
    label := split_part(inner_text, '|', 2);
    entry := null;
    if eid ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      select * into entry from public.story_entries where id = eid::uuid;
    end if;
    if entry.id is not null and sirath_internal.entry_visible_to(entry.id, p_character) then
      out := out || '{{' || eid || '|' || label || '}}';
    elsif coalesce(entry.public_name, false) then
      out := out || '{{!plain|' || label || '}}';
    else
      token := tokens ->> eid;
      if token is null then
        n := coalesce((tokens ->> '_n')::int, 0) + 1;
        token := 'u' || n::text;
        tokens := tokens || jsonb_build_object(eid, token, '_n', n);
      end if;
      out := out || '{{?' || token || '|' || coalesce(entry.kind, 'thing') || '}}';
    end if;
  end loop;
  out := out || rest;
  perform set_config('sirath.tokens', tokens::text, true);
  return out;
end;
$$;

create or replace function sirath_internal.link_end(p_entry uuid, p_character uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  entry public.story_entries;
  tokens jsonb := coalesce(nullif(current_setting('sirath.tokens', true), ''), '{}')::jsonb;
  token text;
  n int;
begin
  select * into entry from public.story_entries where id = p_entry;
  if entry is null then
    return jsonb_build_object('opaque', 'u0', 'kind', 'thing');
  end if;
  if sirath_internal.entry_visible_to(p_entry, p_character) then
    return jsonb_build_object('id', entry.id, 'name', entry.display_name, 'kind', entry.kind);
  end if;
  if entry.public_name then
    return jsonb_build_object('public_name', entry.display_name, 'kind', entry.kind);
  end if;
  token := tokens ->> entry.id::text;
  if token is null then
    n := coalesce((tokens ->> '_n')::int, 0) + 1;
    token := 'u' || n::text;
    tokens := tokens || jsonb_build_object(entry.id::text, token, '_n', n);
    perform set_config('sirath.tokens', tokens::text, true);
  end if;
  return jsonb_build_object('opaque', token, 'kind', entry.kind);
end;
$$;

create or replace function public.sirath_entry(p_character_id uuid, p_entry_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  book jsonb;
  found jsonb;
begin
  book := public.sirath_book(p_character_id);
  select value into found
  from jsonb_array_elements(book -> 'entries')
  where value ->> 'id' = p_entry_id::text
  limit 1;
  if found is null then
    return jsonb_build_object('status', 'not_in_book');
  end if;
  return jsonb_build_object('status', 'ok', 'entry', found, 'links', book -> 'links', 'unknown_nouns', book -> 'unknown_nouns');
end;
$$;

create or replace function public.sirath_mark_seen(p_character_id uuid, p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.characters;
begin
  select * into c from public.characters where id = p_character_id;
  if not found or c.user_id is distinct from auth.uid() then
    raise exception 'not allowed';
  end if;
  insert into public.story_badge_seen (character_id, session_id)
  values (p_character_id, p_session_id)
  on conflict do nothing;
end;
$$;

create or replace function public.record_meeting(
  p_scope text,
  p_scope_id uuid,
  p_entry_id uuid,
  p_session_id uuid
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_guild uuid;
begin
  if not (public.is_dm() or public.is_staff()) then
    raise exception 'not allowed';
  end if;
  if p_scope not in ('character', 'squad') then
    raise exception 'bad scope';
  end if;
  select guild_id into v_guild from public.story_entries where id = p_entry_id and editorial_status = 'canon';
  if v_guild is null then
    raise exception 'not canon';
  end if;
  insert into public.story_reveals (guild_id, scope, scope_id, entry_id, source, source_session_id, revealed_by)
  values (v_guild, p_scope, p_scope_id, p_entry_id, 'meeting', p_session_id, auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.record_knowledge_check(
  p_character_id uuid,
  p_entry_id uuid,
  p_skill text,
  p_total int,
  p_session_id uuid
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_guild uuid;
begin
  if not (public.is_dm() or public.is_staff()) then
    raise exception 'not allowed';
  end if;
  if p_skill not in ('history', 'medicine', 'culture', 'alchemy', 'nature', 'survival') then
    raise exception 'bad skill';
  end if;
  select guild_id into v_guild from public.characters where id = p_character_id;
  insert into public.story_checks (guild_id, character_id, entry_id, session_id, kind, skill, total, recorded_by)
  values (v_guild, p_character_id, p_entry_id, p_session_id, 'roll', p_skill, p_total, auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.set_public_name(p_entry_id uuid, p_public boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guild uuid;
  v_old boolean;
begin
  if not (public.is_dm() or public.is_staff()) then
    raise exception 'not allowed';
  end if;
  select guild_id, public_name into v_guild, v_old from public.story_entries where id = p_entry_id;
  if v_guild is null then
    raise exception 'missing entry';
  end if;
  update public.story_entries set public_name = p_public, updated_at = now() where id = p_entry_id;
  insert into public.story_canon_changes (guild_id, target_kind, target_id, from_status, to_status, change_tier, review_note, approver_role, approver_id)
  values (v_guild, 'entry', p_entry_id, v_old::text, p_public::text, 'small', 'public_name', 'staff', auth.uid());
end;
$$;

create or replace function public.approve_review_item(p_id uuid, p_edits jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  q public.story_review_queue;
  proposed jsonb;
  kind text;
begin
  if not (public.is_dm() or public.is_staff()) then
    raise exception 'not allowed';
  end if;
  select * into q from public.story_review_queue where id = p_id;
  if not found then
    raise exception 'missing item';
  end if;
  proposed := coalesce(p_edits, '{}'::jsonb) || q.proposed;
  kind := proposed ->> 'kind';
  if kind = 'reveal_entry' then
    perform public.record_meeting(
      coalesce(proposed ->> 'scope', 'squad'),
      coalesce((proposed ->> 'scope_id')::uuid, q.squad_id),
      (proposed ->> 'entry_id')::uuid,
      coalesce((proposed ->> 'session_id')::uuid, q.session_id)
    );
  elsif kind = 'reveal_fact' then
    insert into public.story_reveals (guild_id, scope, scope_id, fact_id, source, skill, source_session_id, revealed_by)
    values (
      q.guild_id,
      coalesce(proposed ->> 'scope', 'squad'),
      coalesce((proposed ->> 'scope_id')::uuid, q.squad_id),
      (proposed ->> 'fact_id')::uuid,
      coalesce(proposed ->> 'source', 'dm'),
      proposed ->> 'skill',
      coalesce((proposed ->> 'session_id')::uuid, q.session_id),
      auth.uid()
    );
  elsif kind = 'check' then
    perform public.record_knowledge_check(
      coalesce((proposed ->> 'character_id')::uuid, q.character_id),
      (proposed ->> 'entry_id')::uuid,
      proposed ->> 'skill',
      (proposed ->> 'total')::int,
      coalesce((proposed ->> 'session_id')::uuid, q.session_id)
    );
  end if;
  if proposed ? 'public_name' and proposed ? 'entry_id' then
    perform public.set_public_name((proposed ->> 'entry_id')::uuid, (proposed ->> 'public_name')::boolean);
  end if;
  update public.story_review_queue
  set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_id;
end;
$$;

create or replace function public.set_character_knowledge(
  p_character_id uuid,
  p_cultures text[],
  p_languages text[],
  p_skill_mods jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guild uuid;
begin
  if not (public.is_dm() or public.is_staff()) then
    raise exception 'not allowed';
  end if;
  select guild_id into v_guild from public.characters where id = p_character_id;
  if v_guild is null then
    raise exception 'missing character';
  end if;
  insert into public.character_knowledge (character_id, guild_id, cultures, languages, skill_mods)
  values (p_character_id, v_guild, coalesce(p_cultures, '{}'), coalesce(p_languages, '{}'), p_skill_mods)
  on conflict (character_id) do update
  set cultures = excluded.cultures,
      languages = excluded.languages,
      skill_mods = excluded.skill_mods;
end;
$$;

revoke all on function sirath_internal.player_text(text) from public, anon, authenticated;
revoke all on function sirath_internal.scrub_player_json(jsonb) from public, anon, authenticated;
revoke all on function sirath_internal.scrub_body(text, uuid, jsonb) from public, anon, authenticated;
revoke all on function sirath_internal.link_end(uuid, uuid) from public, anon, authenticated;

revoke all on function public.sirath_book(uuid) from public, anon;
revoke all on function public.sirath_entry(uuid, uuid) from public, anon;
revoke all on function public.sirath_mark_seen(uuid, uuid) from public, anon;
revoke all on function public.record_meeting(text, uuid, uuid, uuid) from public, anon;
revoke all on function public.record_knowledge_check(uuid, uuid, text, int, uuid) from public, anon;
revoke all on function public.set_public_name(uuid, boolean) from public, anon;
revoke all on function public.approve_review_item(uuid, jsonb) from public, anon;
revoke all on function public.set_character_knowledge(uuid, text[], text[], jsonb) from public, anon;

grant execute on function public.sirath_book(uuid) to authenticated;
grant execute on function public.sirath_entry(uuid, uuid) to authenticated;
grant execute on function public.sirath_mark_seen(uuid, uuid) to authenticated;
grant execute on function public.record_meeting(text, uuid, uuid, uuid) to authenticated;
grant execute on function public.record_knowledge_check(uuid, uuid, text, int, uuid) to authenticated;
grant execute on function public.set_public_name(uuid, boolean) to authenticated;
grant execute on function public.approve_review_item(uuid, jsonb) to authenticated;
grant execute on function public.set_character_knowledge(uuid, text[], text[], jsonb) to authenticated;

-- ============================================================
-- RLS
-- ============================================================

alter table public.story_rules enable row level security;
alter table public.character_knowledge enable row level security;
alter table public.story_entries enable row level security;
alter table public.story_entries_dm enable row level security;
alter table public.story_fact_public enable row level security;
alter table public.story_fact_text enable row level security;
alter table public.story_fact_staff enable row level security;
alter table public.story_links enable row level security;
alter table public.story_links_dm enable row level security;
alter table public.story_reveals enable row level security;
alter table public.story_checks enable row level security;
alter table public.story_facets enable row level security;
alter table public.story_canon_changes enable row level security;
alter table public.story_review_queue enable row level security;
alter table public.story_notes enable row level security;
alter table public.story_badge_seen enable row level security;

create policy story_rules_read on public.story_rules
  for select to authenticated using (true);

create policy character_knowledge_read on public.character_knowledge
  for select to authenticated using (
    character_id in (select id from public.characters where user_id = auth.uid())
    or public.is_dm() or public.is_staff()
  );

create policy story_entries_read on public.story_entries
  for select to authenticated using (
    editorial_status = 'canon'
    and (
      public.is_dm() or public.is_staff()
      or exists (
        select 1
        from public.characters c
        join public.story_reveals r on r.entry_id = story_entries.id
        where c.user_id = auth.uid()
          and (
            (r.scope = 'character' and r.scope_id = c.id)
            or (r.scope = 'squad' and r.scope_id is not distinct from c.squad_id)
          )
      )
    )
  );

create policy story_entries_dm_staff on public.story_entries_dm
  for select to authenticated using (public.is_dm() or public.is_staff());

create policy story_fact_public_read on public.story_fact_public
  for select to authenticated using (
    editorial_status = 'canon'
    and (
      public.is_dm() or public.is_staff()
      or (
        exists (
          select 1
          from public.characters c
          join public.story_reveals r on r.entry_id = story_fact_public.entry_id
          where c.user_id = auth.uid()
            and (
              (r.scope = 'character' and r.scope_id = c.id)
              or (r.scope = 'squad' and r.scope_id is not distinct from c.squad_id)
            )
        )
        and (
          tier <> 'discovery'
          or exists (
            select 1
            from public.characters c
            join public.story_reveals r on r.fact_id = story_fact_public.id
            where c.user_id = auth.uid()
              and (
                (r.scope = 'character' and r.scope_id = c.id)
                or (r.scope = 'squad' and r.scope_id is not distinct from c.squad_id)
              )
          )
        )
      )
    )
  );

-- No member grant. A later grant still hides bodies from players; sirath_book() is the only reader.
create policy story_fact_text_staff on public.story_fact_text
  for select to authenticated using (public.is_dm() or public.is_staff());

create policy story_fact_staff_staff on public.story_fact_staff
  for select to authenticated using (public.is_dm() or public.is_staff());

-- No member grant. Hidden endpoint ids would leak.
create policy story_links_staff on public.story_links
  for select to authenticated using (public.is_dm() or public.is_staff());

create policy story_links_dm_staff on public.story_links_dm
  for select to authenticated using (public.is_dm() or public.is_staff());

create policy story_reveals_scope on public.story_reveals
  for select to authenticated using (
    public.is_dm() or public.is_staff()
    or exists (
      select 1 from public.characters c
      where c.user_id = auth.uid()
        and (
          (scope = 'character' and scope_id = c.id)
          or (scope = 'squad' and scope_id is not distinct from c.squad_id)
        )
    )
  );

create policy story_checks_own on public.story_checks
  for select to authenticated using (
    public.is_dm() or public.is_staff()
    or character_id in (select id from public.characters where user_id = auth.uid())
  );

create policy story_facets_staff on public.story_facets
  for select to authenticated using (public.is_dm() or public.is_staff());

create policy story_canon_changes_staff on public.story_canon_changes
  for select to authenticated using (public.is_dm() or public.is_staff());

create policy story_review_queue_staff on public.story_review_queue
  for select to authenticated using (public.is_dm() or public.is_staff());

create policy story_notes_owner on public.story_notes
  for all to authenticated
  using (owner_profile_id = auth.uid())
  with check (owner_profile_id = auth.uid());

create policy story_badge_owner on public.story_badge_seen
  for all to authenticated
  using (character_id in (select id from public.characters where user_id = auth.uid()))
  with check (character_id in (select id from public.characters where user_id = auth.uid()));

revoke all on public.story_rules from public, anon;
revoke all on public.character_knowledge from public, anon;
revoke all on public.story_entries from public, anon;
revoke all on public.story_entries_dm from public, anon;
revoke all on public.story_fact_public from public, anon;
revoke all on public.story_fact_text from public, anon, authenticated;
revoke all on public.story_fact_staff from public, anon;
revoke all on public.story_links from public, anon, authenticated;
revoke all on public.story_links_dm from public, anon;
revoke all on public.story_reveals from public, anon;
revoke all on public.story_checks from public, anon;
revoke all on public.story_facets from public, anon;
revoke all on public.story_canon_changes from public, anon;
revoke all on public.story_review_queue from public, anon;
revoke all on public.story_notes from public, anon;
revoke all on public.story_badge_seen from public, anon;

grant select on public.story_rules to authenticated;
grant select on public.character_knowledge to authenticated;
grant select on public.story_entries to authenticated;
grant select on public.story_entries_dm to authenticated;
grant select on public.story_fact_public to authenticated;
grant select on public.story_fact_staff to authenticated;
grant select on public.story_links_dm to authenticated;
grant select on public.story_reveals to authenticated;
grant select on public.story_checks to authenticated;
grant select on public.story_facets to authenticated;
grant select on public.story_canon_changes to authenticated;
grant select on public.story_review_queue to authenticated;
grant select, insert, update, delete on public.story_notes to authenticated;
grant select, insert, update, delete on public.story_badge_seen to authenticated;

-- No member writes on the book tables. RPCs are security definer.
revoke insert, update, delete on public.story_entries from authenticated;
revoke insert, update, delete on public.story_fact_public from authenticated;
revoke insert, update, delete on public.story_reveals from authenticated;
revoke insert, update, delete on public.story_checks from authenticated;
