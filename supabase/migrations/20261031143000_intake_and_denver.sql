-- Real-life intake, optional pronouns, and one company clock.
-- Injuries, medical notes, and emergency contact are intentionally absent.
-- John has not decided those fields. Do not add them here.

alter table public.characters
  add column if not exists pronouns text;

comment on column public.characters.pronouns is
  'Optional. The recruit may leave this blank.';

update public.scoring_config
set time_zone = 'America/Denver',
    checkin_time_zone = 'America/Denver'
where id = 1;

update public.session_timeslots
set time_zone = 'America/Denver';

create table public.player_intake (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  dnd_experience text not null check (dnd_experience in ('never', 'a_few', 'lots')),
  gym_experience text not null check (gym_experience in ('new', 'some', 'regular')),
  first_goals text[] not null default '{}',
  timeslot_id text references public.session_timeslots (id),
  session_reminders boolean not null default false,
  updated_at timestamptz not null default now()
);

comment on table public.player_intake is
  'Experience, first goals, and a preferred time. Injuries, medical notes, and emergency contact are not collected.';

alter table public.player_intake enable row level security;

grant select on public.player_intake to authenticated;

create policy player_intake_select on public.player_intake
  for select to authenticated
  using (user_id = auth.uid() or public.is_staff());

drop function if exists public.file_recruitment_papers(text, text, text, text, text, text, text);

create or replace function public.file_recruitment_papers(
  p_name text,
  p_species text,
  p_background_id text,
  p_tool_id text,
  p_bonus_mode text,
  p_plus2 text,
  p_plus1 text,
  p_pronouns text default null
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
      origin_feat = v_bg.origin_feat,
      pronouns = nullif(btrim(coalesce(p_pronouns, '')), '')
  where id = v_id;
  return v_id;
end;
$$;

revoke all on function public.file_recruitment_papers(text, text, text, text, text, text, text, text) from public, anon;
grant execute on function public.file_recruitment_papers(text, text, text, text, text, text, text, text) to authenticated;

create or replace function public.save_player_intake(
  p_dnd text,
  p_gym text,
  p_goals text[],
  p_timeslot text,
  p_reminders boolean
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in first';
  end if;
  if p_dnd not in ('never', 'a_few', 'lots') then
    raise exception 'Say whether you have played before';
  end if;
  if p_gym not in ('new', 'some', 'regular') then
    raise exception 'Say how the gym feels';
  end if;
  if p_goals is null or cardinality(p_goals) < 1 then
    raise exception 'Pick at least one first goal';
  end if;
  if p_timeslot is null or not exists (select 1 from public.session_timeslots where id = p_timeslot) then
    raise exception 'Pick a time';
  end if;
  insert into public.player_intake (
    user_id, dnd_experience, gym_experience, first_goals, timeslot_id, session_reminders, updated_at
  ) values (
    auth.uid(), p_dnd, p_gym, p_goals, p_timeslot, coalesce(p_reminders, false), now()
  )
  on conflict (user_id) do update
  set dnd_experience = excluded.dnd_experience,
      gym_experience = excluded.gym_experience,
      first_goals = excluded.first_goals,
      timeslot_id = excluded.timeslot_id,
      session_reminders = excluded.session_reminders,
      updated_at = now();
end;
$$;

revoke all on function public.save_player_intake(text, text, text[], text, boolean) from public, anon;
grant execute on function public.save_player_intake(text, text, text[], text, boolean) to authenticated;
