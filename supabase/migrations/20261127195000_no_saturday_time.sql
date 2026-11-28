-- Staff flag when a paid recruit cannot be placed in a Saturday time.
-- Additive. Existing rows stay null. This does not charge or refund anyone.
-- Review and apply by hand. Do not point this at a database you have not chosen.

alter table public.player_intake
  add column if not exists placement_status text,
  add column if not exists placement_marked_at timestamptz,
  add column if not exists placement_marked_by uuid references public.profiles (id) on delete set null;

alter table public.player_intake drop constraint if exists player_intake_placement_status_check;
alter table public.player_intake
  add constraint player_intake_placement_status_check
  check (placement_status is null or placement_status = 'no_time');

comment on column public.player_intake.placement_status is
  'no_time means staff could not place this recruit. The owner is told. The app does not refund.';

create or replace function public.mark_no_saturday_time(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in first';
  end if;
  if not public.is_staff() then
    raise exception 'Staff only';
  end if;
  if p_user_id is null then
    raise exception 'Choose a player';
  end if;
  update public.player_intake
  set placement_status = 'no_time',
      placement_marked_at = now(),
      placement_marked_by = auth.uid(),
      updated_at = now()
  where user_id = p_user_id;
  if not found then
    raise exception 'No enlistment for that player';
  end if;
end;
$$;

revoke all on function public.mark_no_saturday_time(uuid) from public, anon;
grant execute on function public.mark_no_saturday_time(uuid) to authenticated;

comment on function public.mark_no_saturday_time(uuid) is
  'Staff mark that no Saturday time is open. It does not change billing and does not email the player.';
