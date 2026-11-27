-- A player whose second choice is open can wait for the first one instead.
-- That drops the seat hold and does not charge. Additive. Not applied to live Supabase.

create or replace function public.prefer_first_waitlist()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in first';
  end if;
  update public.player_intake
  set held_choice = 'waitlist',
      table_request = 'waitlist',
      updated_at = now()
  where user_id = auth.uid()
    and held_choice = 'second'
    and coalesce(teen_waitlist, false) = false;
  if not found then
    raise exception 'Your second choice is not the open seat';
  end if;
end;
$$;

revoke all on function public.prefer_first_waitlist() from public, anon;
grant execute on function public.prefer_first_waitlist() to authenticated;

comment on function public.prefer_first_waitlist() is
  'Wait for the first Saturday choice. Clears the second-choice seat hold. Does not charge.';
