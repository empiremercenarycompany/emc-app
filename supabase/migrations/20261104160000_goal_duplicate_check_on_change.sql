-- Not applied. Editing a goal rewrites title and category even when the words
-- stay the same, and the duplicate trigger was refusing that save when an older
-- copy already existed. Check only when the normalized title, the stat, or the
-- character actually changes. Existing rows are not updated or deleted.

create or replace function public.goals_reject_duplicate_title()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and new.character_id is not distinct from old.character_id
     and new.category is not distinct from old.category
     and lower(regexp_replace(btrim(new.title), '\s+', ' ', 'g'))
         is not distinct from lower(regexp_replace(btrim(old.title), '\s+', ' ', 'g'))
  then
    return new;
  end if;

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
