-- Age bands for enlistment, and the payment note.
-- 16 or 17 choose a daytime slot and need no guardian.
-- The 7–10 PM slot stays adults_only (18+).
-- Under 16 is the teen waitlist and does not take a seat.
-- Review and apply this by hand. Do not point it at a database you have not chosen.

alter table public.player_intake
  add column if not exists age_band text,
  add column if not exists teen_waitlist boolean not null default false;

alter table public.player_intake
  drop constraint if exists player_intake_age_band_check;

alter table public.player_intake
  add constraint player_intake_age_band_check
  check (age_band is null or age_band in ('under_16', '16_17', '18_plus'));

comment on column public.player_intake.age_band is
  'under_16 joins the teen waitlist. 16_17 may choose a daytime slot and needs no guardian. 18_plus may choose the evening slot.';

comment on column public.player_intake.teen_waitlist is
  'True when the recruit is under 16 and has no session seat.';

comment on table public.player_intake is
  'Experience, first goals, a preferred time, optional enlist details, and an age band. Injuries, medical notes, emergency contact, and a guardian are not collected.';

update public.config_notes
set note = 'Founding Recruit Rate $60/mo added to a gym membership, or $120/mo for non-members with membership included. No payments are taken in the app. Once your seat is confirmed, staff send you a payment link through EMC''s Stripe.'
where key = 'pricing';

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
  p_fitness_experience text default null,
  p_age_band text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot text;
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

  v_slot := nullif(btrim(coalesce(p_timeslot, '')), '');
  if p_age_band = 'under_16' then
    if v_slot is not null then
      raise exception 'Under 16 joins the teen waitlist';
    end if;
  elsif v_slot is null or not exists (select 1 from public.session_timeslots where id = v_slot) then
    raise exception 'Pick a time';
  elsif p_age_band = '16_17' and exists (
    select 1 from public.session_timeslots where id = v_slot and adults_only
  ) then
    raise exception 'The 7–10 PM slot is 18+';
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
      updated_at = now();
end;
$$;

revoke all on function public.save_player_intake(text, text, text[], text, boolean, text, text, text, text, text, text) from public, anon;
grant execute on function public.save_player_intake(text, text, text[], text, boolean, text, text, text, text, text, text) to authenticated;

comment on function public.save_player_intake(text, text, text[], text, boolean, text, text, text, text, text, text) is
  'Saves the signed-in recruit''s intake. A null age band keeps the stored age. Under 16 stores the teen waitlist and no seat.';
