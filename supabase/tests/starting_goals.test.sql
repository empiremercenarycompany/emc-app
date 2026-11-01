-- Pending starting goals. Staff only. Claimed onto a character, not before.

insert into public.pending_starting_goals (email, display_name, category, goal_text, status, needs_cmart, source)
values
  ('starter@example.test', 'Starter', 'charisma', 'Speak up once at the table', 'active', false, 'paper'),
  ('starter@example.test', 'Starter', 'wisdom', 'Read one chapter', 'draft', true, 'paper');

insert into auth.users (id, email) values
  ('44444444-4444-4444-8444-444444444441', 'starter@example.test');

select set_config('emc.character_create', 'on', false);
insert into public.characters (user_id, guild_id, name)
select '44444444-4444-4444-8444-444444444441', id, 'Starter'
from public.guilds
where slug = 'emc';
select set_config('emc.character_create', 'off', false);

do $$
declare
  v_count int;
  v_active int;
  v_draft int;
begin
  if (select count(*) from public.goals g
      join public.characters c on c.id = g.character_id
      where c.user_id = '44444444-4444-4444-8444-444444444441') <> 2 then
    raise exception 'character insert did not claim starting goals';
  end if;

  select count(*) into v_active
  from public.goals g
  join public.characters c on c.id = g.character_id
  where c.user_id = '44444444-4444-4444-8444-444444444441'
    and g.category = 'charisma'
    and g.is_active
    and g.title = 'Speak up once at the table'
    and g.description is null;
  if v_active <> 1 then
    raise exception 'active starting goal was not copied';
  end if;

  select count(*) into v_draft
  from public.goals g
  join public.characters c on c.id = g.character_id
  where c.user_id = '44444444-4444-4444-8444-444444444441'
    and g.category = 'wisdom'
    and not g.is_active
    and g.description = 'needs CMART';
  if v_draft <> 1 then
    raise exception 'mental starting goal was not a needs CMART draft';
  end if;

  if (select count(*) from public.pending_starting_goals where email = 'starter@example.test' and claimed_at is null) <> 0 then
    raise exception 'starting goals were left unclaimed';
  end if;

  select public.claim_starting_goals('44444444-4444-4444-8444-444444444441') into v_count;
  if v_count <> 0 then
    raise exception 'claiming twice copied goals again';
  end if;
end $$;

select set_config('request.jwt.claim.sub', '44444444-4444-4444-8444-444444444441', false);
set role authenticated;
do $$
declare
  v_seen int;
begin
  select count(*) into v_seen from public.pending_starting_goals;
  if v_seen <> 0 then
    raise exception 'a player read pending starting goals';
  end if;
end $$;
reset role;

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', false);
set role authenticated;
do $$
declare
  v_seen int;
begin
  select count(*) into v_seen from public.pending_starting_goals where email = 'starter@example.test';
  if v_seen <> 2 then
    raise exception 'staff could not read pending starting goals';
  end if;
end $$;
reset role;

delete from public.pending_starting_goals where email = 'starter@example.test';
delete from public.characters where user_id = '44444444-4444-4444-8444-444444444441';
delete from public.guild_memberships where user_id = '44444444-4444-4444-8444-444444444441';
delete from public.profiles where id = '44444444-4444-4444-8444-444444444441';
delete from auth.users where id = '44444444-4444-4444-8444-444444444441';
