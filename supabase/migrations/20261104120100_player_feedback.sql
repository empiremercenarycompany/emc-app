-- Not applied. In-app notes from a player. No addresses and no phone numbers.

create table public.player_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  page text not null check (char_length(page) between 1 and 200),
  app_version text not null check (char_length(app_version) between 1 and 40),
  created_at timestamptz not null default now()
);

comment on table public.player_feedback is
  'A player writes a note about the app. Staff can read every row. Addresses and phone numbers are not stored.';

alter table public.player_feedback enable row level security;

create policy player_feedback_insert on public.player_feedback
  for insert to authenticated
  with check (user_id = auth.uid());

create policy player_feedback_select_own on public.player_feedback
  for select to authenticated
  using (user_id = auth.uid() or public.is_staff());

revoke all on public.player_feedback from public, anon;
grant select, insert on public.player_feedback to authenticated;
