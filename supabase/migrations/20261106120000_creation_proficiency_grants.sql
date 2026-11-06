-- Creation grants from origin feats and species. Ids only. No rules text.
-- Skilled: three skills or tools. Crafter: three artisan's tools from the fast-crafting list.
-- Tavern Brawler: improvised weapons. Human: one skill. Elf: Insight, Perception, or Survival.
-- Other recruitment feats and species add none.

alter table public.characters
  add column if not exists granted_skills text[] not null default '{}',
  add column if not exists granted_tools text[] not null default '{}',
  add column if not exists granted_languages text[] not null default '{}',
  add column if not exists granted_weapons text[] not null default '{}';

comment on column public.characters.granted_skills is
  'Skill ids granted at creation beyond the background pair.';
comment on column public.characters.granted_tools is
  'Tool ids granted at creation beyond the background tool.';
comment on column public.characters.granted_languages is
  'Language ids granted at creation. Empty when the species and feat grant none.';
comment on column public.characters.granted_weapons is
  'Weapon ids granted at creation, such as improvised.';

create or replace function public.jsonb_text_list(p_value jsonb)
returns text[]
language sql
immutable
as $$
  select coalesce(
    (
      select array_agg(item.value order by item.ord)
      from jsonb_array_elements_text(coalesce(p_value, '[]'::jsonb)) with ordinality as item(value, ord)
    ),
    '{}'::text[]
  );
$$;

create or replace function public.resolve_creation_grants(
  p_background_id text,
  p_species text,
  p_tool_id text,
  p_feat_picks text[],
  p_species_pick text
) returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  v_bg public.recruit_backgrounds%rowtype;
  v_skill_ids text[] := array[
    'acrobatics','animal_handling','arcana','athletics','deception','history','insight','intimidation',
    'investigation','medicine','nature','perception','performance','persuasion','religion','sleight_of_hand',
    'stealth','survival'
  ];
  v_skilled_tools text[] := array[
    'alchemist','brewer','calligrapher','carpenter','cartographer','cobbler','cook','glassblower','jeweler',
    'leatherworker','mason','painter','potter','smith','tinker','weaver','woodcarver',
    'disguise','forgery','herbalism','navigator','poisoner','thieves',
    'dice','dragonchess','cards','three_dragon_ante',
    'bagpipes','drum','dulcimer','flute','horn','lute','lyre','pan_flute','shawm','viol'
  ];
  v_crafter_tools text[] := array['carpenter','leatherworker','mason','potter','smith','tinker','weaver','woodcarver'];
  v_elf_skills text[] := array['insight','perception','survival'];
  v_picks text[] := '{}';
  v_owned text[] := '{}';
  v_seen text[] := '{}';
  v_token text;
  v_kind text;
  v_id text;
  v_skills text[] := '{}';
  v_tools text[] := '{}';
  v_languages text[] := '{}';
  v_weapons text[] := '{}';
  v_species text;
begin
  select * into v_bg from public.recruit_backgrounds where id = p_background_id and enabled;
  if not found then
    raise exception 'Choose your past.';
  end if;
  if p_tool_id is null or not (p_tool_id = any (v_bg.tool_options)) then
    raise exception 'Choose a tool this background allows.';
  end if;

  select coalesce(array_agg(btrim(item.value) order by item.ord), '{}')
  into v_picks
  from unnest(coalesce(p_feat_picks, '{}')) with ordinality as item(value, ord)
  where btrim(item.value) <> '';

  v_owned := array['skill:' || v_bg.skills[1], 'skill:' || v_bg.skills[2], 'tool:' || p_tool_id];

  if v_bg.origin_feat = 'Skilled' then
    if cardinality(v_picks) <> 3 then
      raise exception 'Choose three skills or tools.';
    end if;
  elsif v_bg.origin_feat = 'Crafter' then
    if cardinality(v_picks) <> 3 then
      raise exception 'Choose three artisan''s tools.';
    end if;
  elsif cardinality(v_picks) <> 0 then
    raise exception 'That feat has no proficiency to choose.';
  end if;

  foreach v_token in array v_picks loop
    v_kind := split_part(v_token, ':', 1);
    v_id := split_part(v_token, ':', 2);
    if v_token is distinct from v_kind || ':' || v_id
       or split_part(v_token, ':', 3) <> ''
       or v_id !~ '^[a-z0-9_]+$' then
      raise exception 'Choose a proficiency from the list.';
    end if;
    if v_bg.origin_feat = 'Skilled' then
      if not (
        (v_kind = 'skill' and v_id = any (v_skill_ids))
        or (v_kind = 'tool' and v_id = any (v_skilled_tools))
      ) then
        raise exception 'Choose a proficiency from the list.';
      end if;
    elsif v_bg.origin_feat = 'Crafter' then
      if v_kind <> 'tool' or not (v_id = any (v_crafter_tools)) then
        raise exception 'Choose a proficiency from the list.';
      end if;
    end if;
    if v_token = any (v_owned) or v_token = any (v_seen) then
      raise exception 'Choose a proficiency you do not already have.';
    end if;
    v_seen := v_seen || v_token;
    if v_kind = 'skill' then
      v_skills := v_skills || v_id;
    elsif v_kind = 'tool' then
      v_tools := v_tools || v_id;
    elsif v_kind = 'language' then
      v_languages := v_languages || v_id;
    else
      v_weapons := v_weapons || v_id;
    end if;
  end loop;

  if v_bg.origin_feat = 'Tavern Brawler' then
    v_weapons := array_append(v_weapons, 'improvised');
  end if;

  v_species := nullif(btrim(coalesce(p_species_pick, '')), '');
  if p_species in ('human', 'elf') then
    if p_species = 'elf' then
      if not exists (
        select 1 from unnest(v_elf_skills) as skill_id
        where ('skill:' || skill_id) <> all (v_owned || v_seen)
      ) then
        raise exception 'Leave a skill open. Those are already on your papers.';
      end if;
    elsif not exists (
      select 1 from unnest(v_skill_ids) as skill_id
      where ('skill:' || skill_id) <> all (v_owned || v_seen)
    ) then
      raise exception 'Leave a skill open. Those are already on your papers.';
    end if;
    if v_species is null then
      raise exception 'Choose one skill.';
    end if;
    v_kind := split_part(v_species, ':', 1);
    v_id := split_part(v_species, ':', 2);
    if v_species is distinct from v_kind || ':' || v_id
       or v_kind <> 'skill'
       or v_id !~ '^[a-z0-9_]+$'
       or not (v_id = any (v_skill_ids))
       or (p_species = 'elf' and not (v_id = any (v_elf_skills))) then
      raise exception 'Choose a proficiency from the list.';
    end if;
    if v_species = any (v_owned) or v_species = any (v_seen) then
      raise exception 'Choose a proficiency you do not already have.';
    end if;
    v_skills := v_skills || v_id;
  elsif v_species is not null then
    raise exception 'That people has no proficiency to choose.';
  end if;

  return jsonb_build_object(
    'skills', to_jsonb(v_skills),
    'tools', to_jsonb(v_tools),
    'languages', to_jsonb(v_languages),
    'weapons', to_jsonb(v_weapons)
  );
end;
$$;

drop function if exists public.file_recruitment_papers(text, text, text, text, text, text, text, text);

create or replace function public.file_recruitment_papers(
  p_name text,
  p_species text,
  p_background_id text,
  p_tool_id text,
  p_bonus_mode text,
  p_plus2 text,
  p_plus1 text,
  p_pronouns text default null,
  p_feat_picks text[] default '{}',
  p_species_pick text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bg public.recruit_backgrounds%rowtype;
  v_scores int[] := array[8, 8, 8, 8, 8, 8];
  v_names text[] := array['strength','dexterity','constitution','intelligence','wisdom','charisma'];
  i int;
  v_id uuid;
  v_grants jsonb;
begin
  select * into v_bg from public.recruit_backgrounds where id = p_background_id and enabled;
  if not found then
    raise exception 'Choose a background from the list';
  end if;
  if v_bg.origin_feat = 'Magic Initiate' then
    raise exception 'That background is not offered';
  end if;
  if p_tool_id is null or not (p_tool_id = any (v_bg.tool_options)) then
    raise exception 'Choose a tool this background allows';
  end if;
  if p_bonus_mode = 'plus1' then
    for i in 1..6 loop
      if v_names[i] = any (v_bg.abilities) then
        v_scores[i] := 9;
      end if;
    end loop;
  elsif p_bonus_mode = 'plus2' then
    if p_plus2 is null or p_plus1 is null or p_plus2 = p_plus1
       or not (p_plus2 = any (v_bg.abilities))
       or not (p_plus1 = any (v_bg.abilities)) then
      raise exception 'Put +2 and +1 on two different abilities from the background';
    end if;
    for i in 1..6 loop
      if v_names[i] = p_plus2 then
        v_scores[i] := 10;
      elsif v_names[i] = p_plus1 then
        v_scores[i] := 9;
      end if;
    end loop;
  else
    raise exception 'Choose +1 to all three, or +2 and +1';
  end if;
  if not public.starting_array_valid(v_scores[1], v_scores[2], v_scores[3], v_scores[4], v_scores[5], v_scores[6]) then
    raise exception 'Invalid starting array';
  end if;
  v_grants := public.resolve_creation_grants(
    p_background_id,
    p_species,
    p_tool_id,
    p_feat_picks,
    p_species_pick
  );
  v_id := public.create_character(
    p_name,
    v_bg.name,
    v_bg.name,
    p_tool_id,
    v_bg.skills[1],
    p_species,
    v_scores[1], v_scores[2], v_scores[3], v_scores[4], v_scores[5], v_scores[6]
  );
  update public.characters
  set background_id = v_bg.id,
      background_skills = v_bg.skills,
      origin_feat = v_bg.origin_feat,
      pronouns = nullif(btrim(coalesce(p_pronouns, '')), ''),
      granted_skills = public.jsonb_text_list(v_grants->'skills'),
      granted_tools = public.jsonb_text_list(v_grants->'tools'),
      granted_languages = public.jsonb_text_list(v_grants->'languages'),
      granted_weapons = public.jsonb_text_list(v_grants->'weapons')
  where id = v_id;
  return v_id;
end;
$$;

revoke all on function public.jsonb_text_list(jsonb) from public, anon, authenticated;
revoke all on function public.resolve_creation_grants(text, text, text, text[], text) from public, anon;
revoke all on function public.file_recruitment_papers(text, text, text, text, text, text, text, text, text[], text) from public, anon;
grant execute on function public.resolve_creation_grants(text, text, text, text[], text) to authenticated;
grant execute on function public.file_recruitment_papers(text, text, text, text, text, text, text, text, text[], text) to authenticated;
