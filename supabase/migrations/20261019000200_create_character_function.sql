-- Character creation function
-- Enforces starting array rules and creates the character record.

create or replace function public.create_character(
  p_name text,
  p_origin_word text,
  p_profession text,
  p_race text default null,
  p_strength int default 8,
  p_dexterity int default 8,
  p_constitution int default 8,
  p_intelligence int default 8,
  p_wisdom int default 8,
  p_charisma int default 8
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_character_id uuid;
  v_valid boolean := false;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Prevent duplicate characters
  if exists (select 1 from public.characters where user_id = v_user_id) then
    raise exception 'Character already exists';
  end if;

  -- Validate starting array (10/9 or three 9s, rest 8)
  if (p_strength, p_dexterity, p_constitution, p_intelligence, p_wisdom, p_charisma) in (
    (10,9,8,8,8,8), (9,10,8,8,8,8), (9,8,10,8,8,8), (9,8,8,10,8,8),
    (9,8,8,8,10,8), (9,8,8,8,8,10), (10,8,9,8,8,8), (10,8,8,9,8,8),
    (10,8,8,8,9,8), (10,8,8,8,8,9), (8,10,9,8,8,8), (8,10,8,9,8,8),
    (8,10,8,8,9,8), (8,10,8,8,8,9), (8,9,10,8,8,8), (8,9,8,10,8,8),
    (8,9,8,8,10,8), (8,9,8,8,8,10), (8,8,10,9,8,8), (8,8,10,8,9,8),
    (8,8,10,8,8,9), (8,8,9,10,8,8), (8,8,9,8,10,8), (8,8,9,8,8,10),
    (8,8,8,10,9,8), (8,8,8,10,8,9), (8,8,8,9,10,8), (8,8,8,9,8,10),
    (8,8,8,8,10,9), (8,8,8,8,9,10),
    (9,9,9,8,8,8), (9,9,8,9,8,8), (9,9,8,8,9,8), (9,9,8,8,8,9),
    (9,8,9,9,8,8), (9,8,9,8,9,8), (9,8,9,8,8,9), (9,8,8,9,9,8),
    (9,8,8,9,8,9), (9,8,8,8,9,9), (8,9,9,9,8,8), (8,9,9,8,9,8),
    (8,9,9,8,8,9), (8,9,8,9,9,8), (8,9,8,9,8,9), (8,9,8,8,9,9),
    (8,8,9,9,9,8), (8,8,9,9,8,9), (8,8,9,8,9,9), (8,8,8,9,9,9)
  ) then
    v_valid := true;
  end if;

  if not v_valid then
    raise exception 'Invalid starting array';
  end if;

  insert into public.characters (
    user_id, name, origin_word, profession, race,
    strength, dexterity, constitution, intelligence, wisdom, charisma,
    attribute_points, level, rank
  ) values (
    v_user_id, p_name, p_origin_word, p_profession, p_race,
    p_strength, p_dexterity, p_constitution, p_intelligence, p_wisdom, p_charisma,
    0, 1, 'Recruit'
  )
  returning id into v_character_id;

  return v_character_id;
end;
$$;

revoke all on function public.create_character(text, text, text, text, integer, integer, integer, integer, integer, integer) from public;
grant execute on function public.create_character(text, text, text, text, integer, integer, integer, integer, integer, integer) to authenticated;
