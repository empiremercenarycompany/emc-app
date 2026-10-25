-- Storage buckets. Skipped when the storage schema is not installed (plain Postgres tests).

do $$
begin
  if not exists (select 1 from pg_namespace where nspname = 'storage') then
    return;
  end if;

  insert into storage.buckets (id, name, public)
  values
    ('character-portraits', 'character-portraits', true),
    ('guild-banners', 'guild-banners', true),
    ('achievement-icons', 'achievement-icons', true),
    ('session-attachments', 'session-attachments', false)
  on conflict (id) do nothing;

  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and policyname = 'Public read character portraits'
  ) then
    execute $policy$
      create policy "Public read character portraits"
        on storage.objects for select
        using (bucket_id = 'character-portraits')
    $policy$;
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and policyname = 'Owners upload own portraits'
  ) then
    execute $policy$
      create policy "Owners upload own portraits"
        on storage.objects for insert
        with check (
          bucket_id = 'character-portraits'
          and auth.uid()::text = (storage.foldername(name))[1]
        )
    $policy$;
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and policyname = 'Owners update own portraits'
  ) then
    execute $policy$
      create policy "Owners update own portraits"
        on storage.objects for update
        using (
          bucket_id = 'character-portraits'
          and auth.uid()::text = (storage.foldername(name))[1]
        )
    $policy$;
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and policyname = 'Public read guild banners'
  ) then
    execute $policy$
      create policy "Public read guild banners"
        on storage.objects for select
        using (bucket_id = 'guild-banners')
    $policy$;
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and policyname = 'Commanders manage guild banners'
  ) then
    execute $policy$
      create policy "Commanders manage guild banners"
        on storage.objects for all
        using (
          bucket_id = 'guild-banners'
          and exists (
            select 1 from public.guilds g
            where g.id::text = (storage.foldername(name))[1]
              and g.commander_id = auth.uid()
          )
        )
    $policy$;
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and policyname = 'Guild members read session attachments'
  ) then
    execute $policy$
      create policy "Guild members read session attachments"
        on storage.objects for select
        using (
          bucket_id = 'session-attachments'
          and exists (
            select 1 from public.sessions s
            join public.guild_memberships gm on gm.guild_id = s.guild_id
            where s.id::text = (storage.foldername(name))[1]
              and gm.user_id = auth.uid()
          )
        )
    $policy$;
  end if;
end $$;
