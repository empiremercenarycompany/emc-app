-- Shared starting proficiency. Disposable database only. No real recruit names.

insert into auth.users (id, email) values
  ('77777777-7777-4777-8777-777777777771', 'first@example.test'),
  ('77777777-7777-4777-8777-777777777772', 'second@example.test'),
  ('77777777-7777-4777-8777-777777777773', 'outsider@example.test'),
  ('77777777-7777-4777-8777-777777777774', 'reviewer@example.test');

select set_config('emc.profile_admin', 'on', false);
update public.profiles set app_role = 'dm' where id = '77777777-7777-4777-8777-777777777774';
select set_config('emc.profile_admin', 'off', false);

begin;
select set_config('emc.character_create', 'on', true);
insert into public.characters (id, user_id, guild_id, name) values
  ('77777777-7777-4777-8777-777777777781', '77777777-7777-4777-8777-777777777771', '11111111-1111-4111-8111-111111111111', 'First Recruit'),
  ('77777777-7777-4777-8777-777777777782', '77777777-7777-4777-8777-777777777772', '11111111-1111-4111-8111-111111111111', 'Second Recruit');
commit;

select set_config('request.jwt.claim.sub', '77777777-7777-4777-8777-777777777771', false);
set role authenticated;

select public.request_grew_up('Second Recruit', 'language', 'elvish', 'We kept a garden.');

do $$
begin
  perform public.request_grew_up('Second Recruit', 'tool', 'smith', 'Again.');
  raise exception 'second bonus was stored';
exception
  when others then
    if sqlerrm ilike '%second bonus was stored%' then raise; end if;
    if sqlerrm not ilike '%only have one shared start%' then raise; end if;
end $$;

do $$
declare
  v_seen int;
begin
  select count(*) into v_seen from public.grew_up_requests;
  if v_seen <> 1 then
    raise exception 'requester should see one request, saw %', v_seen;
  end if;
end $$;

select set_config('request.jwt.claim.sub', '77777777-7777-4777-8777-777777777773', false);
do $$
declare
  v_seen int;
begin
  select count(*) into v_seen from public.grew_up_requests;
  if v_seen <> 0 then
    raise exception 'outsider read a request';
  end if;
end $$;

select set_config('request.jwt.claim.sub', '77777777-7777-4777-8777-777777777772', false);
do $$
declare
  v_seen int;
begin
  select count(*) into v_seen from public.grew_up_requests;
  if v_seen <> 1 then
    raise exception 'partner should see the request, saw %', v_seen;
  end if;
end $$;

do $$
begin
  perform public.approve_grew_up((select id from public.grew_up_requests limit 1));
  raise exception 'partner approved the request';
exception
  when others then
    if sqlerrm ilike '%partner approved%' then raise; end if;
    if sqlerrm not ilike '%Staff role required%' then raise; end if;
end $$;

select set_config('request.jwt.claim.sub', '77777777-7777-4777-8777-777777777774', false);
select public.approve_grew_up((select id from public.grew_up_requests limit 1));

do $$
declare
  v_n int;
begin
  select count(*) into v_n from public.character_proficiencies
  where option_id = 'elvish' and kind = 'language';
  if v_n <> 2 then
    raise exception 'both characters should gain the proficiency, got %', v_n;
  end if;
end $$;

reset role;

delete from public.character_proficiencies where option_id = 'elvish';
delete from public.grew_up_requests where note = 'We kept a garden.';
delete from public.characters where id in (
  '77777777-7777-4777-8777-777777777781',
  '77777777-7777-4777-8777-777777777782'
);
delete from public.guild_memberships where user_id in (
  '77777777-7777-4777-8777-777777777771',
  '77777777-7777-4777-8777-777777777772',
  '77777777-7777-4777-8777-777777777773',
  '77777777-7777-4777-8777-777777777774'
);
delete from public.profiles where id in (
  '77777777-7777-4777-8777-777777777771',
  '77777777-7777-4777-8777-777777777772',
  '77777777-7777-4777-8777-777777777773',
  '77777777-7777-4777-8777-777777777774'
);
delete from auth.users where id in (
  '77777777-7777-4777-8777-777777777771',
  '77777777-7777-4777-8777-777777777772',
  '77777777-7777-4777-8777-777777777773',
  '77777777-7777-4777-8777-777777777774'
);
