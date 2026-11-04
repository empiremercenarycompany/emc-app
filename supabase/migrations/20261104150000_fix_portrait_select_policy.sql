-- Already applied to production (bveviensyhialsuhjitw) on Nov 4 as "fix_portrait_select_policy".
-- The first version of character_portraits_select read `name` inside a subquery over
-- public.characters, so it bound to the character's name and never to the storage object.
-- That made every non-staff upload (upsert) and signed URL fail. Qualify it as objects.name.
do $$
begin
  if not exists (select 1 from pg_namespace where nspname = 'storage') then
    return;
  end if;

  drop policy if exists character_portraits_select on storage.objects;

  create policy character_portraits_select on storage.objects
    for select to authenticated
    using (
      bucket_id = 'character-portraits'
      and (
        public.is_staff()
        or exists (
          select 1
          from public.characters c
          where c.id::text = (storage.foldername(objects.name))[1]
            and (c.user_id = (select auth.uid()) or public.is_member(c.guild_id))
        )
      )
    );
end $$;
