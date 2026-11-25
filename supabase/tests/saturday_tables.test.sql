-- Saturday tables. Placed seats, the daytime alias, and no player names on the board.

do $$
begin
  if public.normalize_timeslot_id('daytime') is distinct from 'afternoon' then
    raise exception 'daytime did not become afternoon';
  end if;
  if public.normalize_timeslot_id('DAYTIME') is distinct from 'afternoon' then
    raise exception 'DAYTIME did not become afternoon';
  end if;
  if public.normalize_timeslot_id('afternoon') is distinct from 'afternoon' then
    raise exception 'afternoon was rewritten';
  end if;
  if public.normalize_timeslot_id('nope') is not null then
    raise exception 'an unknown slot was accepted';
  end if;
  if exists (select 1 from public.session_timeslots where id = 'daytime') then
    raise exception 'daytime was inserted as its own slot';
  end if;
end $$;

do $$
declare
  v_cap int;
  v_ccc uuid;
  v_character uuid;
  v_old_squad uuid;
  v_name text;
  v_email text;
  v_anon text;
  v_signed text;
  v_placed int;
  v_saw_id boolean;
  v_player_slot text;
  v_player_name text;
begin
  select squad_max_size into v_cap from public.scoring_config where id = 1;
  update public.scoring_config set squad_max_size = 6 where id = 1;

  select id into v_ccc from public.squads where name = 'CCC' limit 1;
  if v_ccc is null then
    raise exception 'CCC is missing';
  end if;
  update public.squads set timeslot_id = null, starts_on = null where id = v_ccc;

  select id, squad_id, name into v_character, v_old_squad, v_name
  from public.characters
  where user_id = '22222222-2222-4222-8222-222222222221';
  select email into v_email from public.profiles where id = '22222222-2222-4222-8222-222222222221';

  perform set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', false);
  set local role authenticated;
  perform public.set_squad_table(v_ccc, 'daytime', date '2027-01-09');
  if (select timeslot_id from public.squads where id = v_ccc) is distinct from 'afternoon' then
    raise exception 'staff daytime placement was not stored as afternoon';
  end if;
  perform public.set_squad_table(v_ccc, 'morning', date '2027-01-02');
  perform public.assign_squad(v_character, v_ccc);
  reset role;

  select count(*)::int into v_placed from public.characters where squad_id = v_ccc;
  if v_placed < 1 then
    raise exception 'a placed seat was not counted';
  end if;

  perform set_config('request.jwt.claim.sub', '', false);
  set local role anon;
  select coalesce(string_agg(coalesce(squad_name, '') || coalesce(squad_id::text, ''), ' '), ''),
         bool_or(squad_id is not null)
    into v_anon, v_saw_id
  from public.saturday_table_board();
  if v_anon ilike '%' || v_name || '%' or v_anon ilike '%' || v_email || '%' then
    raise exception 'the public board showed a player';
  end if;
  if v_saw_id then
    raise exception 'the public board showed a squad id';
  end if;
  if v_anon ilike '%CCC%' then
    raise exception 'the public board showed a squad name';
  end if;
  if not exists (
    select 1 from public.saturday_table_board()
    where timeslot_id = 'morning' and starts_on = date '2027-01-02' and placed = v_placed and squad_name is null
  ) then
    raise exception 'the public board hid the placed count';
  end if;
  reset role;

  perform set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222221', false);
  set local role authenticated;
  select coalesce(string_agg(coalesce(squad_name, ''), ' '), '') into v_signed from public.saturday_table_board();
  if v_signed not like '%CCC%' then
    raise exception 'a signed-in player could not see an existing squad name';
  end if;
  if v_signed ilike '%' || v_email || '%' then
    raise exception 'the signed-in board showed an email';
  end if;

  perform public.save_player_intake(
    'never', 'new', array['Sleep 7 hours'], 'daytime', false,
    null, null, null, null, null, '18_plus', null, null, null,
    null, date '2027-01-02', 'seat', false, false, null
  );
  reset role;

  select timeslot_id into v_player_slot from public.player_intake where user_id = '22222222-2222-4222-8222-222222222221';
  if v_player_slot is distinct from 'afternoon' then
    raise exception 'a daytime request was not stored as afternoon';
  end if;

  perform set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', false);
  set local role authenticated;
  perform public.save_player_intake(
    'lots', 'regular', array['Call a friend'], 'morning', false,
    null, null, null, null, null, '16_17', null, null, null,
    null, date '2027-01-09', 'seat', false, false, null
  );
  reset role;

  select timeslot_id into v_player_slot from public.player_intake where user_id = '22222222-2222-4222-8222-222222222221';
  select name into v_player_name from public.characters where id = v_character;
  if v_player_slot is distinct from 'afternoon' or v_player_name is distinct from v_name then
    raise exception 'another save changed a player';
  end if;

  perform set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', false);
  set local role authenticated;
  perform public.assign_squad(v_character, v_old_squad);
  perform public.set_squad_table(v_ccc, null, null);
  reset role;
  update public.scoring_config set squad_max_size = v_cap where id = 1;
end $$;
