-- Not applied. Owner delete was already allowed. This narrows it, and rejects a second
-- goal with the same stat and the same normalized title. Existing duplicate rows are left
-- in place so this file can be applied before they are removed.

-- Security review: a player may delete only their own goal, and only when no log has
-- been awarded or marked bonus and no reward has been recorded. The policy subqueries
-- read goal_logs and goal_rewards as the current user. Owners can already select their
-- own rows, so the check sees them. Another player's rows stay hidden, and staff do
-- not gain a delete path here. Dropping goals_write_delete removes the wider owner
-- delete. The duplicate check runs on insert and update. It does not merge or delete
-- old rows, and it is not security definer, so it cannot read past RLS.

drop policy if exists goals_write_delete on public.goals;

create policy goals_owner_delete on public.goals
  for delete to authenticated
  using (
    public.owns_character(character_id)
    and not exists (
      select 1
      from public.goal_logs log
      where log.goal_id = goals.id
        and (log.points_awarded > 0 or log.status in ('awarded', 'bonus'))
    )
    and not exists (
      select 1
      from public.goal_rewards reward
      where reward.goal_id = goals.id
        and reward.status = 'recorded'
    )
  );

create or replace function public.goals_reject_duplicate_title()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(
    hashtextextended(
      new.character_id::text || '|' || new.category || '|' ||
      lower(regexp_replace(btrim(new.title), '\s+', ' ', 'g')),
      0
    )
  );
  if exists (
    select 1
    from public.goals existing
    where existing.character_id = new.character_id
      and existing.category = new.category
      and lower(regexp_replace(btrim(existing.title), '\s+', ' ', 'g'))
        = lower(regexp_replace(btrim(new.title), '\s+', ' ', 'g'))
      and existing.id is distinct from new.id
  ) then
    raise exception 'You already have that goal for this stat';
  end if;
  return new;
end;
$$;

drop trigger if exists goals_reject_duplicate_title on public.goals;
create trigger goals_reject_duplicate_title
  before insert or update of title, category, character_id on public.goals
  for each row execute function public.goals_reject_duplicate_title();

revoke all on function public.goals_reject_duplicate_title() from public, anon;
grant execute on function public.goals_reject_duplicate_title() to authenticated;
