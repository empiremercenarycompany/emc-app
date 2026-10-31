do $$
begin
  if exists (select 1 from auth.users where email like '%@example.test') then
    raise exception 'example.test users remain';
  end if;
  if exists (select 1 from public.profiles where email like '%@example.test') then
    raise exception 'example.test profiles remain';
  end if;
end $$;
