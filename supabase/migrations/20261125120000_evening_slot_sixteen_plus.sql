-- The 7–10 PM slot is no longer 18+. Every Saturday slot is 16 and up.
-- This replaces save_player_intake and removes only the adults-only check.
-- Under 16 still joins the teen waitlist and takes no seat.
-- The evening row's adults_only flag is cleared so the column does not keep the old gate.
-- No player_intake rows are updated.

update public.session_timeslots
set adults_only = false
where id = 'evening';

comment on column public.session_timeslots.adults_only is
  'Not used to gate a Saturday slot. Every slot is 16 and up.';

comment on column public.player_intake.age_band is
  'under_16 joins the teen waitlist. 16_17 and 18_plus may choose any Saturday slot. 16_17 needs no guardian.';

create or replace function public.save_player_intake(
  p_dnd text,
  p_gym text,
  p_goals text[],
  p_timeslot text,
  p_reminders boolean,
  p_phone text default null,
  p_species_idea text default null,
  p_class_idea text default null,
  p_backstory_idea text default null,
  p_fitness_experience text default null,
  p_age_band text default null,
  p_gym_member text default null,
  p_signup_src text default null,
  p_gym_membership_number text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot text;
  v_gym text;
  v_src text;
  v_number text;
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
  if p_age_band is not null and p_age_band not in ('under_16', '16_17', '18_plus') then
    raise exception 'Say your age';
  end if;
  v_gym := nullif(btrim(coalesce(p_gym_member, '')), '');
  if v_gym is not null and v_gym not in ('current', 'former', 'not_yet') then
    raise exception 'Say which rate is yours';
  end if;
  v_number := nullif(btrim(coalesce(p_gym_membership_number, '')), '');
  if v_number is not null and (
    char_length(v_number) > 40
    or v_number !~ '^[A-Za-z0-9][A-Za-z0-9 -]*$'
  ) then
    raise exception 'Use the membership number from Empire Strength and Fitness';
  end if;
  if v_gym = 'current' and v_number is null then
    raise exception 'Enter your Empire Strength and Fitness membership number';
  end if;
  v_src := nullif(left(btrim(coalesce(p_signup_src, '')), 80), '');

  v_slot := nullif(btrim(coalesce(p_timeslot, '')), '');
  if p_age_band = 'under_16' then
    if v_slot is not null then
      raise exception 'Under 16 joins the teen waitlist';
    end if;
  elsif v_slot is null or not exists (select 1 from public.session_timeslots where id = v_slot) then
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
    age_band,
    teen_waitlist,
    gym_member,
    gym_membership_number,
    signup_src,
    updated_at
  ) values (
    auth.uid(),
    p_dnd,
    p_gym,
    p_goals,
    case when p_age_band = 'under_16' then null else v_slot end,
    coalesce(p_reminders, false),
    nullif(btrim(p_phone), ''),
    nullif(btrim(p_species_idea), ''),
    nullif(btrim(p_class_idea), ''),
    nullif(btrim(p_backstory_idea), ''),
    nullif(btrim(p_fitness_experience), ''),
    p_age_band,
    coalesce(p_age_band = 'under_16', false),
    v_gym,
    case when p_gym_membership_number is null then null else v_number end,
    case when p_signup_src is null then null else v_src end,
    now()
  )
  on conflict (user_id) do update
  set dnd_experience = excluded.dnd_experience,
      gym_experience = excluded.gym_experience,
      first_goals = excluded.first_goals,
      timeslot_id = case when p_age_band = 'under_16' then null else excluded.timeslot_id end,
      session_reminders = excluded.session_reminders,
      phone = case when p_phone is null then player_intake.phone else excluded.phone end,
      species_idea = case when p_species_idea is null then player_intake.species_idea else excluded.species_idea end,
      class_idea = case when p_class_idea is null then player_intake.class_idea else excluded.class_idea end,
      backstory_idea = case when p_backstory_idea is null then player_intake.backstory_idea else excluded.backstory_idea end,
      fitness_experience = case when p_fitness_experience is null then player_intake.fitness_experience else excluded.fitness_experience end,
      age_band = case when p_age_band is null then player_intake.age_band else excluded.age_band end,
      teen_waitlist = case when p_age_band is null then player_intake.teen_waitlist else excluded.teen_waitlist end,
      gym_member = case when p_gym_member is null then player_intake.gym_member else excluded.gym_member end,
      gym_membership_number = case
        when p_gym_membership_number is null then player_intake.gym_membership_number
        else excluded.gym_membership_number
      end,
      signup_src = case when p_signup_src is null then player_intake.signup_src else excluded.signup_src end,
      updated_at = now();
end;
$$;

revoke all on function public.save_player_intake(text, text, text[], text, boolean, text, text, text, text, text, text, text, text, text) from public, anon;
grant execute on function public.save_player_intake(text, text, text[], text, boolean, text, text, text, text, text, text, text, text, text) to authenticated;

comment on function public.save_player_intake(text, text, text[], text, boolean, text, text, text, text, text, text, text, text, text) is
  'Saves the signed-in recruit''s intake. A null age, membership answer, number, or src keeps the stored value. The current-member rate requires a membership number. Verification is not touched. Every Saturday slot is 16 and up.';
