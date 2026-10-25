-- Empire Mercenary Company — Storage Setup

-- Buckets
insert into storage.buckets (id, name, public)
values
  ('character-portraits', 'character-portraits', true),
  ('guild-banners', 'guild-banners', true),
  ('achievement-icons', 'achievement-icons', true),
  ('session-attachments', 'session-attachments', false)
on conflict (id) do nothing;

-- Policies: character portraits (public read, owner write)
create policy "Public read character portraits"
  on storage.objects for select
  using (bucket_id = 'character-portraits');

create policy "Owners upload own portraits"
  on storage.objects for insert
  with check (
    bucket_id = 'character-portraits'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Owners update own portraits"
  on storage.objects for update
  using (
    bucket_id = 'character-portraits'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policies: guild banners (public read, commander write)
create policy "Public read guild banners"
  on storage.objects for select
  using (bucket_id = 'guild-banners');

create policy "Commanders manage guild banners"
  on storage.objects for all
  using (
    bucket_id = 'guild-banners'
    and exists (
      select 1 from public.guilds g
      where g.id::text = (storage.foldername(name))[1]
      and g.commander_id = auth.uid()
    )
  );

-- Policies: session attachments (guild members only)
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
  );

create policy "Guild members upload session attachments"
  on storage.objects for insert
  with check (
    bucket_id = 'session-attachments'
    and exists (
      select 1 from public.sessions s
      join public.guild_memberships gm on gm.guild_id = s.guild_id
      where s.id::text = (storage.foldername(name))[1]
      and gm.user_id = auth.uid()
    )
  );
