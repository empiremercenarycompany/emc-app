-- Removes every @example.test account. Profiles, characters, and notes cascade.
-- No mail is sent. Does not touch any other account.

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'auth' and table_name = 'identities'
  ) then
    execute $sql$
      delete from auth.identities
      where user_id in (select id from auth.users where email like '%@example.test')
    $sql$;
  end if;
end $$;

delete from auth.users where email like '%@example.test';
