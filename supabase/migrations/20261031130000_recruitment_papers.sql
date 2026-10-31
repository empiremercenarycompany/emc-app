-- Recruitment papers. Twelve 2024 backgrounds. Acolyte, Guide, and Sage are omitted
-- because they grant Magic Initiate. Names and mechanics only.

create table public.recruit_backgrounds (
  id text primary key,
  name text not null,
  abilities text[] not null check (cardinality(abilities) = 3),
  skills text[] not null check (cardinality(skills) = 2),
  tool_options text[] not null check (cardinality(tool_options) >= 1),
  origin_feat text not null check (origin_feat <> 'Magic Initiate'),
  enabled boolean not null default true
);

alter table public.recruit_backgrounds enable row level security;
create policy recruit_backgrounds_select on public.recruit_backgrounds
  for select to anon, authenticated
  using (enabled);

insert into public.recruit_backgrounds (id, name, abilities, skills, tool_options, origin_feat) values
  ('artisan', 'Artisan', array['strength','dexterity','intelligence'], array['investigation','persuasion'], array['alchemist','brewer','calligrapher','carpenter','cartographer','cobbler','cook','glassblower','jeweler','leatherworker','mason','painter','potter','smith','tinker','weaver','woodcarver'], 'Crafter'),
  ('charlatan', 'Charlatan', array['dexterity','constitution','charisma'], array['deception','sleight_of_hand'], array['forgery'], 'Skilled'),
  ('criminal', 'Criminal', array['dexterity','constitution','intelligence'], array['sleight_of_hand','stealth'], array['thieves'], 'Alert'),
  ('farmer', 'Farmer', array['strength','constitution','wisdom'], array['animal_handling','nature'], array['carpenter'], 'Tough'),
  ('guard', 'Guard', array['strength','intelligence','wisdom'], array['athletics','perception'], array['dice','dragonchess','cards','three_dragon_ante'], 'Alert'),
  ('hermit', 'Hermit', array['constitution','wisdom','charisma'], array['medicine','religion'], array['herbalism'], 'Healer'),
  ('merchant', 'Merchant', array['constitution','intelligence','charisma'], array['animal_handling','persuasion'], array['navigator'], 'Lucky'),
  ('noble', 'Noble', array['strength','intelligence','charisma'], array['history','persuasion'], array['dice','dragonchess','cards','three_dragon_ante'], 'Skilled'),
  ('sailor', 'Sailor', array['strength','dexterity','wisdom'], array['acrobatics','perception'], array['navigator'], 'Tavern Brawler'),
  ('scribe', 'Scribe', array['dexterity','intelligence','wisdom'], array['investigation','perception'], array['calligrapher'], 'Skilled'),
  ('soldier', 'Soldier', array['strength','dexterity','constitution'], array['athletics','intimidation'], array['dice','dragonchess','cards','three_dragon_ante'], 'Savage Attacker'),
  ('wayfarer', 'Wayfarer', array['dexterity','wisdom','charisma'], array['insight','stealth'], array['thieves'], 'Lucky');

select set_config('emc.seed', 'on', false);
insert into public.profession_tools (id, name, source, attribution) values
  ('dragonchess', 'Dragonchess set', 'srd-5.2', 'System Reference Document 5.2 by Wizards of the Coast LLC, CC BY 4.0.'),
  ('three_dragon_ante', 'Three-Dragon Ante set', 'srd-5.2', 'System Reference Document 5.2 by Wizards of the Coast LLC, CC BY 4.0.')
on conflict (id) do nothing;
select set_config('emc.seed', 'off', false);

alter table public.characters
  add column background_id text,
  add column background_skills text[] not null default '{}',
  add column origin_feat text;

comment on column public.characters.background_id is
  'Recruitment background id. Older rows keep profession as a free-text background.';

create or replace function public.file_recruitment_papers(
  p_name text,
  p_species text,
  p_background_id text,
  p_tool_id text,
  p_bonus_mode text,
  p_plus2 text,
  p_plus1 text
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
      origin_feat = v_bg.origin_feat
  where id = v_id;
  return v_id;
end;
$$;

revoke all on function public.file_recruitment_papers(text, text, text, text, text, text, text) from public, anon;
grant execute on function public.file_recruitment_papers(text, text, text, text, text, text, text) to authenticated;
grant select on public.recruit_backgrounds to anon, authenticated;
