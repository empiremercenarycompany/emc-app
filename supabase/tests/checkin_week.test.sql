-- Future weeks are refused. Filing the same week replaces the row. Disposable database only.

insert into auth.users (id, email) values
  ('66666666-6666-4666-8666-666666666661', 'checkin@example.test');

begin;
select set_config('emc.character_create', 'on', true);
insert into public.characters (id, user_id, guild_id, name)
values (
  '66666666-6666-4666-8666-666666666662',
  '66666666-6666-4666-8666-666666666661',
  '11111111-1111-4111-8111-111111111111',
  'Checkin Recruit'
);
commit;

select set_config('request.jwt.claim.sub', '66666666-6666-4666-8666-666666666661', false);
set role authenticated;

do $$
declare
  v_today date := public.company_today();
  v_week date := v_today - (extract(isodow from v_today)::int - 1);
  v_id uuid;
  v_count int;
  v_workouts int;
begin
  begin
    perform public.submit_weekly_checkin(v_week + 14, 3, 0, '', true, true, true, '', false);
    raise exception 'future week was filed';
  exception
    when others then
      if sqlerrm ilike '%future week was filed%' then raise; end if;
      if sqlerrm not ilike '%has not started%' then raise; end if;
  end;

  v_id := public.submit_weekly_checkin(v_week, 3, 0, '', true, true, true, 'first', false);
  perform public.submit_weekly_checkin(v_week, 2, 0, '', false, true, true, 'second', false);
  select count(*), max(workouts) into v_count, v_workouts
  from public.weekly_checkins
  where character_id = '66666666-6666-4666-8666-666666666662'
    and week_start = v_week;
  if v_count <> 1 or v_workouts <> 2 or v_id is null then
    raise exception 'a second file should replace the week, count % workouts %', v_count, v_workouts;
  end if;
end $$;

reset role;

delete from public.weekly_checkins where character_id = '66666666-6666-4666-8666-666666666662';
delete from public.characters where id = '66666666-6666-4666-8666-666666666662';
delete from public.guild_memberships where user_id = '66666666-6666-4666-8666-666666666661';
delete from public.profiles where id = '66666666-6666-4666-8666-666666666661';
delete from auth.users where id = '66666666-6666-4666-8666-666666666661';
