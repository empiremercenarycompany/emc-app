-- Current Empire membership, staff verification, and the checkout price.
-- gym_member matches the site sign-up: current, former, not_yet.
-- Former members and people who are not members yet pay $120.
-- $60 is used only when gym_member is current, staff have verified it,
-- and staff have switched the checkout price to member.
-- signup_src keeps the arrival tag, including gamegrid-writ.
-- Review and apply this by hand. Do not point it at a database you have not chosen.

alter table public.player_intake
  add column if not exists gym_member text,
  add column if not exists membership_verified boolean not null default false,
  add column if not exists membership_verified_by uuid references public.profiles (id) on delete set null,
  add column if not exists membership_verified_at timestamptz,
  add column if not exists checkout_plan text,
  add column if not exists signup_src text;

alter table public.player_intake drop constraint if exists player_intake_gym_member_check;
alter table public.player_intake
  add constraint player_intake_gym_member_check
  check (gym_member is null or gym_member in ('current', 'former', 'not_yet'));

alter table public.player_intake drop constraint if exists player_intake_checkout_plan_check;
alter table public.player_intake
  add constraint player_intake_checkout_plan_check
  check (checkout_plan is null or checkout_plan in ('member', 'standard'));

alter table public.player_intake drop constraint if exists player_intake_signup_src_len;
alter table public.player_intake
  add constraint player_intake_signup_src_len
  check (signup_src is null or char_length(signup_src) <= 80);

comment on column public.player_intake.gym_member is
  'Site field gym_member. current may become the $60 price after staff verify and switch. former and not_yet stay at $120.';

comment on column public.player_intake.membership_verified is
  'Staff confirmed a current Empire Strength and Fitness membership. The player cannot set this.';

comment on column public.player_intake.membership_verified_by is
  'Staff profile that verified the membership.';

comment on column public.player_intake.membership_verified_at is
  'When staff verified the membership.';

comment on column public.player_intake.checkout_plan is
  'Staff price before the payment link. member is $60. standard is $120. Null stays $120.';

comment on column public.player_intake.signup_src is
  'Arrival tag from ?src=, stored as sent. gamegrid-writ is the Enlistment Writ.';

update public.config_notes
set note = 'Founding Recruit Rate: $120/month with your Empire Strength and Fitness membership included, or $60/month if you are already a current Empire member. No payments are taken in the app. The $60 price is used only after staff verify a current membership and switch the payment link.'
where key = 'pricing';

drop function if exists public.save_player_intake(text, text, text[], text, boolean, text, text, text, text, text, text);

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
  p_age_band text default null,
  p_gym_member text default null,
  p_signup_src text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot text;
  v_gym text;
  v_src text;
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
  v_src := nullif(left(btrim(coalesce(p_signup_src, '')), 80), '');

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
    gym_member,
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
      signup_src = case when p_signup_src is null then player_intake.signup_src else excluded.signup_src end,
      updated_at = now();
end;
$$;

revoke all on function public.save_player_intake(text, text, text[], text, boolean, text, text, text, text, text, text, text, text) from public, anon;
grant execute on function public.save_player_intake(text, text, text[], text, boolean, text, text, text, text, text, text, text, text) to authenticated;

comment on function public.save_player_intake(text, text, text[], text, boolean, text, text, text, text, text, text, text, text) is
  'Saves the signed-in recruit''s intake. A null age, membership answer, or src keeps the stored value. Verification is not touched.';

create or replace function public.set_membership_verification(p_user_id uuid, p_verified boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in first';
  end if;
  if not public.is_staff() then
    raise exception 'Staff only';
  end if;
  if p_user_id is null then
    raise exception 'Choose a player';
  end if;
  update public.player_intake
  set membership_verified = coalesce(p_verified, false),
      membership_verified_by = case when coalesce(p_verified, false) then auth.uid() else null end,
      membership_verified_at = case when coalesce(p_verified, false) then now() else null end,
      checkout_plan = case
        when coalesce(p_verified, false) then checkout_plan
        when checkout_plan = 'member' then null
        else checkout_plan
      end,
      updated_at = now()
  where user_id = p_user_id;
  if not found then
    raise exception 'No enlistment for that player';
  end if;
end;
$$;

revoke all on function public.set_membership_verification(uuid, boolean) from public, anon;
grant execute on function public.set_membership_verification(uuid, boolean) to authenticated;

comment on function public.set_membership_verification(uuid, boolean) is
  'Staff mark a current Empire membership verified, and record who and when. Clearing it drops a $60 price switch.';

create or replace function public.set_checkout_plan(p_user_id uuid, p_plan text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text;
begin
  if auth.uid() is null then
    raise exception 'Sign in first';
  end if;
  if not public.is_staff() then
    raise exception 'Staff only';
  end if;
  v_plan := nullif(btrim(coalesce(p_plan, '')), '');
  if v_plan is not null and v_plan not in ('member', 'standard') then
    raise exception 'Choose a price';
  end if;
  if v_plan = 'member' and not exists (
    select 1 from public.player_intake
    where user_id = p_user_id
      and gym_member = 'current'
      and membership_verified
  ) then
    raise exception 'Verify membership before sending the $60 link';
  end if;
  update public.player_intake
  set checkout_plan = v_plan,
      updated_at = now()
  where user_id = p_user_id;
  if not found then
    raise exception 'No enlistment for that player';
  end if;
end;
$$;

revoke all on function public.set_checkout_plan(uuid, text) from public, anon;
grant execute on function public.set_checkout_plan(uuid, text) to authenticated;

comment on function public.set_checkout_plan(uuid, text) is
  'Staff choose the payment-link price. member is allowed only for a verified current member.';
