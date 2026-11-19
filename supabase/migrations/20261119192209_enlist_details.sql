-- Enlist details on player_intake. Review and apply this by hand.
-- Do not point it at a database you have not chosen.
-- Injuries, medical notes, and emergency contact stay absent.

alter table public.player_intake
  add column if not exists phone text,
  add column if not exists species_idea text,
  add column if not exists class_idea text,
  add column if not exists backstory_idea text,
  add column if not exists fitness_experience text;

comment on column public.player_intake.phone is
  'Optional. The recruit may leave this blank.';

comment on column public.player_intake.species_idea is
  'Optional idea. Not a finished species choice.';

comment on column public.player_intake.class_idea is
  'Optional idea. Not a finished class choice.';

comment on column public.player_intake.fitness_experience is
  'Optional note. first_goals still holds the fitness goals.';

comment on column public.player_intake.backstory_idea is
  'Optional life before enlistment. Not a medical note.';

comment on table public.player_intake is
  'Experience, first goals, a preferred time, and optional enlist details. Injuries, medical notes, and emergency contact are not collected.';

comment on policy player_intake_select on public.player_intake is
  'A player reads their own row. Staff read every row.';

drop policy if exists player_intake_insert on public.player_intake;
create policy player_intake_insert on public.player_intake
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists player_intake_update on public.player_intake;
create policy player_intake_update on public.player_intake
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- No direct write grant. save_player_intake is the write path and stores only auth.uid().
-- The policies above keep a later grant on the caller's own row.
revoke insert, update, delete on public.player_intake from public, anon, authenticated;

-- One function. Extra arguments default to null so a five-argument call still works.
-- Null on update leaves the stored enlist value. A blank string clears it.
drop function if exists public.save_player_intake(text, text, text[], text, boolean);
drop function if exists public.save_player_intake(text, text, text[], text, boolean, text, text, text, text, text);

create function public.save_player_intake(
  p_dnd text,
  p_gym text,
  p_goals text[],
  p_timeslot text,
  p_reminders boolean,
  p_phone text default null,
  p_species_idea text default null,
  p_class_idea text default null,
  p_backstory_idea text default null,
  p_fitness_experience text default null
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
  if p_phone is not null and btrim(p_phone) <> '' and (
    char_length(btrim(p_phone)) > 40
    or btrim(p_phone) !~ '^[0-9+(). -]{7,40}$'
  ) then
    raise exception 'Use a phone number, or leave it blank';
  end if;
  if p_species_idea is not null and char_length(btrim(p_species_idea)) > 80 then
    raise exception 'Use a shorter species idea';
  end if;
  if p_class_idea is not null and char_length(btrim(p_class_idea)) > 80 then
    raise exception 'Use a shorter class idea';
  end if;
  if p_fitness_experience is not null and char_length(btrim(p_fitness_experience)) > 600 then
    raise exception 'Use a shorter fitness note';
  end if;
  if p_backstory_idea is not null and char_length(btrim(p_backstory_idea)) > 2000 then
    raise exception 'Use a shorter backstory';
  end if;

  insert into public.player_intake (
    user_id,
    dnd_experience,
    gym_experience,
    first_goals,
    timeslot_id,
    session_reminders,
    phone,
    species_idea,
    class_idea,
    backstory_idea,
    fitness_experience,
    updated_at
  ) values (
    auth.uid(),
    p_dnd,
    p_gym,
    p_goals,
    p_timeslot,
    coalesce(p_reminders, false),
    nullif(btrim(p_phone), ''),
    nullif(btrim(p_species_idea), ''),
    nullif(btrim(p_class_idea), ''),
    nullif(btrim(p_backstory_idea), ''),
    nullif(btrim(p_fitness_experience), ''),
    now()
  )
  on conflict (user_id) do update
  set dnd_experience = excluded.dnd_experience,
      gym_experience = excluded.gym_experience,
      first_goals = excluded.first_goals,
      timeslot_id = excluded.timeslot_id,
      session_reminders = excluded.session_reminders,
      phone = case when p_phone is null then player_intake.phone else excluded.phone end,
      species_idea = case when p_species_idea is null then player_intake.species_idea else excluded.species_idea end,
      class_idea = case when p_class_idea is null then player_intake.class_idea else excluded.class_idea end,
      backstory_idea = case when p_backstory_idea is null then player_intake.backstory_idea else excluded.backstory_idea end,
      fitness_experience = case when p_fitness_experience is null then player_intake.fitness_experience else excluded.fitness_experience end,
      updated_at = now();
end;
$$;

revoke all on function public.save_player_intake(text, text, text[], text, boolean, text, text, text, text, text) from public, anon;
grant execute on function public.save_player_intake(text, text, text[], text, boolean, text, text, text, text, text) to authenticated;

comment on function public.save_player_intake(text, text, text[], text, boolean, text, text, text, text, text) is
  'Saves the signed-in recruit''s intake. Omitted enlist arguments keep the stored values.';
