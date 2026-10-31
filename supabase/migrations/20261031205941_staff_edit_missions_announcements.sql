-- Staff can correct a mission or an announcement after it is posted.
-- Archive hides a mission from the active list and keeps the row.
-- Delete of an announcement requires an explicit confirm and a staff role.
-- This file does not change existing rows.

alter table public.missions drop constraint if exists missions_status_check;
alter table public.missions
  add constraint missions_status_check
  check (status in ('draft', 'active', 'completed', 'failed', 'archived'));

create or replace function public.update_mission(
  p_id uuid,
  p_title text,
  p_description text,
  p_squad_id uuid,
  p_objective_id uuid,
  p_objective_title text,
  p_target int,
  p_unit text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guild uuid;
begin
  if not public.is_staff() then
    raise exception 'Staff edit missions';
  end if;
  if p_title is null or length(btrim(p_title)) = 0 then
    raise exception 'Title is required';
  end if;
  select guild_id into v_guild from public.missions where id = p_id for update;
  if not found or not public.is_member(v_guild) then
    raise exception 'Mission not found';
  end if;
  if p_squad_id is not null and not exists (
    select 1 from public.squads where id = p_squad_id and guild_id = v_guild
  ) then
    raise exception 'That squad is in another company';
  end if;

  update public.missions
  set title = btrim(p_title),
      description = nullif(btrim(coalesce(p_description, '')), ''),
      squad_id = p_squad_id
  where id = p_id;

  if p_objective_id is not null then
    update public.objectives
    set title = coalesce(nullif(btrim(coalesce(p_objective_title, '')), ''), title),
        target_value = p_target,
        unit = nullif(btrim(coalesce(p_unit, '')), '')
    where id = p_objective_id
      and mission_id = p_id;
  end if;
end;
$$;

create or replace function public.archive_mission(p_id uuid, p_confirm text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guild uuid;
begin
  if p_confirm is distinct from 'yes' then
    raise exception 'Confirm before archiving';
  end if;
  if not public.is_staff() then
    raise exception 'Staff archive missions';
  end if;
  select guild_id into v_guild from public.missions where id = p_id for update;
  if not found or not public.is_member(v_guild) then
    raise exception 'Mission not found';
  end if;
  update public.missions set status = 'archived' where id = p_id;
end;
$$;

create or replace function public.update_announcement(
  p_id uuid,
  p_title text,
  p_body text,
  p_squad_id uuid,
  p_pinned boolean
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guild uuid;
begin
  if not public.is_staff() then
    raise exception 'Staff edit announcements';
  end if;
  if p_title is null or length(btrim(p_title)) = 0 then
    raise exception 'Title is required';
  end if;
  if p_body is null or length(btrim(p_body)) = 0 then
    raise exception 'Body is required';
  end if;
  select guild_id into v_guild from public.announcements where id = p_id for update;
  if not found or not public.is_member(v_guild) then
    raise exception 'Announcement not found';
  end if;
  if p_squad_id is not null and not exists (
    select 1 from public.squads where id = p_squad_id and guild_id = v_guild
  ) then
    raise exception 'That squad is in another company';
  end if;
  update public.announcements
  set title = btrim(p_title),
      body = btrim(p_body),
      squad_id = p_squad_id,
      pinned = coalesce(p_pinned, false)
  where id = p_id;
end;
$$;

create or replace function public.delete_announcement(p_id uuid, p_confirm text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guild uuid;
begin
  if p_confirm is distinct from 'yes' then
    raise exception 'Confirm before deleting';
  end if;
  if not public.is_staff() then
    raise exception 'Staff delete announcements';
  end if;
  select guild_id into v_guild from public.announcements where id = p_id for update;
  if not found or not public.is_member(v_guild) then
    raise exception 'Announcement not found';
  end if;
  delete from public.announcements where id = p_id;
end;
$$;

revoke all on function public.update_mission(uuid, text, text, uuid, uuid, text, int, text) from public, anon;
revoke all on function public.archive_mission(uuid, text) from public, anon;
revoke all on function public.update_announcement(uuid, text, text, uuid, boolean) from public, anon;
revoke all on function public.delete_announcement(uuid, text) from public, anon;

grant execute on function public.update_mission(uuid, text, text, uuid, uuid, text, int, text) to authenticated;
grant execute on function public.archive_mission(uuid, text) to authenticated;
grant execute on function public.update_announcement(uuid, text, text, uuid, boolean) to authenticated;
grant execute on function public.delete_announcement(uuid, text) to authenticated;
