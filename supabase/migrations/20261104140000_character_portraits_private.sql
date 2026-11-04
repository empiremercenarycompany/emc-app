-- The helper stays in public so the storage policies can call it. It is not
-- security definer: it only checks ownership of the character id in the path.
create or replace function public.portrait_object_owned(object_name text)
returns boolean
language sql
stable
set search_path = public
as $$
  select case
    when object_name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/portrait\.(webp|jpe?g|png)$'
      then public.owns_character(split_part(object_name, '/', 1)::uuid)
    else false
  end;
$$;

revoke all on function public.portrait_object_owned(text) from public, anon;
grant execute on function public.portrait_object_owned(text) to authenticated;

-- Not applied. Private portraits for a character. No public URLs.
--
-- Security review: the bucket is private. A player may insert, replace, or delete
-- only a portrait file in the folder of a character they own. The folder name is
-- the character id, and the file name is portrait.webp, portrait.jpg, or portrait.png.
-- Staff may read every object in the bucket. A company member may read a portrait
-- for a character they can already see, so the Barracks can show the squad.
-- Staff do not gain a write path here. The earlier public-read policy is removed
-- when this file is applied. Existing files are not deleted.

do $$
begin
  if not exists (select 1 from pg_namespace where nspname = 'storage') then
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values (
    'character-portraits',
    'character-portraits',
    false,
    2097152,
    array['image/jpeg', 'image/png', 'image/webp']
  )
  on conflict (id) do update
  set public = false,
      file_size_limit = 2097152,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

  drop policy if exists "Public read character portraits" on storage.objects;
  drop policy if exists "Owners upload own portraits" on storage.objects;
  drop policy if exists "Owners update own portraits" on storage.objects;
  drop policy if exists character_portraits_select on storage.objects;
  drop policy if exists character_portraits_insert on storage.objects;
  drop policy if exists character_portraits_update on storage.objects;
  drop policy if exists character_portraits_delete on storage.objects;

  create policy character_portraits_select on storage.objects
    for select to authenticated
    using (
      bucket_id = 'character-portraits'
      and (
        public.is_staff()
        or exists (
          select 1
          from public.characters c
          where c.id::text = (storage.foldername(name))[1]
            and (c.user_id = (select auth.uid()) or public.is_member(c.guild_id))
        )
      )
    );

  create policy character_portraits_insert on storage.objects
    for insert to authenticated
    with check (
      bucket_id = 'character-portraits'
      and public.portrait_object_owned(name)
    );

  create policy character_portraits_update on storage.objects
    for update to authenticated
    using (
      bucket_id = 'character-portraits'
      and public.portrait_object_owned(name)
    )
    with check (
      bucket_id = 'character-portraits'
      and public.portrait_object_owned(name)
    );

  create policy character_portraits_delete on storage.objects
    for delete to authenticated
    using (
      bucket_id = 'character-portraits'
      and public.portrait_object_owned(name)
    );
end $$;
