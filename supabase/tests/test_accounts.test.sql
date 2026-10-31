-- The seed has been applied twice. It must be idempotent and keep the officer roster.

do $$
declare
  n int;
begin
  select count(*) into n from auth.users where email like '%@example.test';
  if n <> 8 then
    raise exception 'expected 8 test users, found %', n;
  end if;
  if (select app_role from public.profiles where email = 'dm@example.test') is distinct from 'dm' then
    raise exception 'dm role missing';
  end if;
  if (select can_approve_lore from public.profiles where email = 'dm@example.test') then
    raise exception 'dm should not approve lore';
  end if;
  if (select can_approve_lore from public.profiles where email = 'curator@example.test') is not true then
    raise exception 'curator is not a lore approver';
  end if;
  if (select count(*) from public.characters c join public.profiles p on p.id = c.user_id where p.email like '%@example.test') <> 6 then
    raise exception 'expected 6 officer characters';
  end if;
  if exists (select 1 from public.profiles where email like '%melichar%@example.test') then
    raise exception 'recruit placeholder is still seeded';
  end if;
  if (select c.sheet->>'hp' from public.characters c join public.profiles p on p.id = c.user_id where p.email = 'alexandria@example.test') is distinct from '13' then
    raise exception 'Alexandria HP was not stored';
  end if;
  if (select c.dexterity from public.characters c join public.profiles p on p.id = c.user_id where p.email = 'alexandria@example.test') <> 16 then
    raise exception 'Alexandria final dexterity was not stored';
  end if;
  if (select c.class from public.characters c join public.profiles p on p.id = c.user_id where p.email = 'david@example.test') is distinct from 'Druid' then
    raise exception 'David class was changed';
  end if;
  if exists (
    select 1 from public.characters c
    join public.profiles p on p.id = c.user_id
    where p.email like '%@example.test'
      and cardinality(c.seed_flags) > 0
  ) then
    raise exception 'officer seed flags should be empty';
  end if;
  if (select c.sheet->'skills' ? 'Alchemy' from public.characters c join public.profiles p on p.id = c.user_id where p.email = 'alexandria@example.test') is not true then
    raise exception 'Alexandria skill label was not Alchemy';
  end if;
  if (select c.sheet->'spells' ? 'Druidcraft' from public.characters c join public.profiles p on p.id = c.user_id where p.email = 'alexandria@example.test') is not true then
    raise exception 'Alexandria spell was dropped';
  end if;
  if (select s.name from public.characters c join public.profiles p on p.id = c.user_id join public.squads s on s.id = c.squad_id where p.email = 'alexandria@example.test') is distinct from 'RBM' then
    raise exception 'Alexandria squad';
  end if;
  if (select s.name from public.characters c join public.profiles p on p.id = c.user_id join public.squads s on s.id = c.squad_id where p.email = 'david@example.test') is distinct from 'CCC' then
    raise exception 'David squad';
  end if;
  if (select c.strength from public.characters c join public.profiles p on p.id = c.user_id where p.email = 'jadross@example.test') <> 16 then
    raise exception 'Jadross final strength was not stored';
  end if;
end $$;
