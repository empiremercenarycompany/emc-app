-- Edit and archive stay on the staff functions. Run after the role fixtures exist.

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', false);
set role authenticated;

select public.post_squad_challenge(
  (select id from public.squads where name = 'First'),
  'Keep the Scholar Breathing',
  'A barracks goal',
  '[{"title":"Breaths","target_value":3,"unit":"sessions"}]'::jsonb
);

select public.update_mission(
  (select id from public.missions where title = 'Keep the Scholar Breathing'),
  'Keep the Scholar Breathing',
  'Still breathing',
  (select id from public.squads where name = 'First'),
  (select o.id from public.objectives o join public.missions m on m.id = o.mission_id where m.title = 'Keep the Scholar Breathing'),
  'Breaths',
  4,
  'sessions'
);

do $$
declare
  v_squad uuid;
  v_target int;
begin
  select squad_id into v_squad from public.missions where title = 'Keep the Scholar Breathing';
  if v_squad is distinct from (select id from public.squads where name = 'First') then
    raise exception 'mission squad was not saved';
  end if;
  select target_value into v_target
  from public.objectives o
  join public.missions m on m.id = o.mission_id
  where m.title = 'Keep the Scholar Breathing';
  if v_target is distinct from 4 then
    raise exception 'objective target was not saved';
  end if;
end $$;

do $$
begin
  perform public.archive_mission(
    (select id from public.missions where title = 'Keep the Scholar Breathing'),
    'no'
  );
  raise exception 'archive ran without confirm';
exception
  when others then
    if sqlerrm ilike '%archive ran without confirm%' then raise; end if;
end $$;

select public.archive_mission(
  (select id from public.missions where title = 'Keep the Scholar Breathing'),
  'yes'
);

do $$
begin
  if (select status from public.missions where title = 'Keep the Scholar Breathing') is distinct from 'archived' then
    raise exception 'mission was not archived';
  end if;
end $$;

insert into public.announcements (guild_id, title, body, posted_by)
values (
  '11111111-1111-4111-8111-111111111111',
  'Gate notice',
  'First wording',
  '22222222-2222-4222-8222-222222222222'
);

select public.update_announcement(
  (select id from public.announcements where title = 'Gate notice'),
  'Gate notice revised',
  'Second wording',
  null,
  true
);

reset role;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222221', false);
set role authenticated;

do $$
begin
  perform public.archive_mission(
    (select id from public.missions where title = 'Keep the Scholar Breathing'),
    'yes'
  );
  raise exception 'player archived a mission';
exception
  when others then
    if sqlerrm ilike '%player archived%' then raise; end if;
end $$;

do $$
begin
  perform public.delete_announcement(
    (select id from public.announcements where title = 'Gate notice revised'),
    'yes'
  );
  raise exception 'player deleted an announcement';
exception
  when others then
    if sqlerrm ilike '%player deleted%' then raise; end if;
end $$;

reset role;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', false);
set role authenticated;

do $$
begin
  perform public.delete_announcement(
    (select id from public.announcements where title = 'Gate notice revised'),
    'no'
  );
  raise exception 'delete ran without confirm';
exception
  when others then
    if sqlerrm ilike '%delete ran without confirm%' then raise; end if;
end $$;

select public.delete_announcement(
  (select id from public.announcements where title = 'Gate notice revised'),
  'yes'
);

do $$
begin
  if exists (select 1 from public.announcements where title = 'Gate notice revised') then
    raise exception 'announcement was not deleted';
  end if;
end $$;

reset role;
