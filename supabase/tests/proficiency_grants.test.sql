-- Creation proficiency grants. Disposable database only.

do $$
declare
  v_grants jsonb;
begin
  v_grants := public.resolve_creation_grants(
    'scribe', 'elf', 'calligrapher',
    array['skill:athletics','tool:lute','tool:thieves'],
    'skill:insight'
  );
  if v_grants->'skills' is distinct from '["athletics","insight"]'::jsonb then
    raise exception 'feat skill was not kept apart from the background, got %', v_grants;
  end if;
  if v_grants->'tools' is distinct from '["lute","thieves"]'::jsonb then
    raise exception 'skilled tools were %', v_grants->'tools';
  end if;
  if v_grants->'weapons' is distinct from '[]'::jsonb then
    raise exception 'skilled gained a weapon';
  end if;

  v_grants := public.resolve_creation_grants(
    'artisan', 'gnome', 'carpenter',
    array['tool:leatherworker','tool:mason','tool:smith'],
    null
  );
  if v_grants->'tools' is distinct from '["leatherworker","mason","smith"]'::jsonb then
    raise exception 'crafter tools were %', v_grants->'tools';
  end if;

  v_grants := public.resolve_creation_grants('sailor', 'orc', 'navigator', '{}', null);
  if v_grants->'weapons' is distinct from '["improvised"]'::jsonb then
    raise exception 'tavern brawler weapon was %', v_grants->'weapons';
  end if;

  v_grants := public.resolve_creation_grants('farmer', 'dwarf', 'carpenter', '{}', null);
  if v_grants is distinct from '{"skills":[],"tools":[],"languages":[],"weapons":[]}'::jsonb then
    raise exception 'dwarf farmer gained a grant %', v_grants;
  end if;

  v_grants := public.resolve_creation_grants('farmer', 'human', 'carpenter', '{}', 'skill:athletics');
  if v_grants->'skills' is distinct from '["athletics"]'::jsonb then
    raise exception 'human skill was %', v_grants->'skills';
  end if;
end $$;

do $$
begin
  perform public.resolve_creation_grants(
    'scribe', 'dwarf', 'calligrapher',
    array['skill:investigation','skill:history','tool:lute'],
    null
  );
  raise exception 'background skill was accepted again';
exception
  when others then
    if sqlerrm ilike '%background skill was accepted again%' then raise; end if;
    if sqlerrm not ilike '%do not already have%' then raise; end if;
end $$;

do $$
begin
  perform public.resolve_creation_grants(
    'artisan', 'gnome', 'alchemist',
    array['tool:alchemist','tool:carpenter','tool:mason'],
    null
  );
  raise exception 'crafter accepted a tool off the list';
exception
  when others then
    if sqlerrm ilike '%crafter accepted%' then raise; end if;
    if sqlerrm not ilike '%from the list%' then raise; end if;
end $$;

do $$
begin
  perform public.resolve_creation_grants('criminal', 'orc', 'thieves', array['skill:athletics'], null);
  raise exception 'alert accepted a pick';
exception
  when others then
    if sqlerrm ilike '%alert accepted%' then raise; end if;
    if sqlerrm not ilike '%no proficiency to choose%' then raise; end if;
end $$;

do $$
begin
  perform public.resolve_creation_grants('farmer', 'human', 'carpenter', '{}', null);
  raise exception 'human skipped the skill';
exception
  when others then
    if sqlerrm ilike '%human skipped%' then raise; end if;
    if sqlerrm not ilike '%Choose one skill%' then raise; end if;
end $$;

do $$
begin
  perform public.resolve_creation_grants('farmer', 'elf', 'carpenter', '{}', 'skill:athletics');
  raise exception 'elf accepted athletics';
exception
  when others then
    if sqlerrm ilike '%elf accepted%' then raise; end if;
    if sqlerrm not ilike '%from the list%' then raise; end if;
end $$;

do $$
begin
  perform public.resolve_creation_grants('farmer', 'gnome', 'carpenter', '{}', 'skill:stealth');
  raise exception 'gnome accepted a skill pick';
exception
  when others then
    if sqlerrm ilike '%gnome accepted%' then raise; end if;
    if sqlerrm not ilike '%no proficiency to choose%' then raise; end if;
end $$;

insert into auth.users (id, email) values
  ('88888888-8888-4888-8888-888888888881', 'grants@example.test');

select set_config('request.jwt.claim.sub', '88888888-8888-4888-8888-888888888881', false);
set role authenticated;

do $$
begin
  begin
    perform public.file_recruitment_papers(
      'Grant Recruit', 'elf', 'scribe', 'calligrapher', 'plus1', 'dexterity', 'intelligence',
      null, array['skill:athletics'], 'skill:insight'
    );
    raise exception 'short skilled list was stored';
  exception
    when others then
      if sqlerrm ilike '%short skilled list was stored%' then raise; end if;
      if sqlerrm not ilike '%Choose three skills or tools%' then raise; end if;
  end;
  if exists (select 1 from public.characters where user_id = auth.uid()) then
    raise exception 'a failed filing left a character';
  end if;
end $$;

select public.file_recruitment_papers(
  'Grant Recruit',
  'elf',
  'scribe',
  'calligrapher',
  'plus1',
  'dexterity',
  'intelligence',
  null,
  array['skill:athletics','tool:lute','tool:thieves'],
  'skill:insight'
);

do $$
declare
  v_skills text[];
  v_tools text[];
  v_background text[];
  v_feat text;
begin
  select granted_skills, granted_tools, background_skills, origin_feat
  into v_skills, v_tools, v_background, v_feat
  from public.characters
  where user_id = auth.uid();
  if v_feat is distinct from 'Skilled' then
    raise exception 'origin feat was %', v_feat;
  end if;
  if v_background is distinct from array['investigation','perception'] then
    raise exception 'background skills changed to %', v_background;
  end if;
  if v_skills is distinct from array['athletics','insight'] then
    raise exception 'saved skills were %', v_skills;
  end if;
  if v_tools is distinct from array['lute','thieves'] then
    raise exception 'saved tools were %', v_tools;
  end if;
end $$;

do $$
begin
  update public.characters
  set granted_skills = array['stealth']
  where user_id = auth.uid();
  raise exception 'player edited grants';
exception
  when insufficient_privilege then
    null;
  when others then
    if sqlerrm ilike '%player edited grants%' then raise; end if;
    if sqlerrm not ilike '%permission denied%' then raise; end if;
end $$;

reset role;

delete from public.characters where user_id = '88888888-8888-4888-8888-888888888881';
delete from public.guild_memberships where user_id = '88888888-8888-4888-8888-888888888881';
delete from public.profiles where id = '88888888-8888-4888-8888-888888888881';
delete from auth.users where id = '88888888-8888-4888-8888-888888888881';
