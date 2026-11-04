-- Not applied. A player cannot file a week that has not started, and filing a week
-- that is already on the books replaces that row instead of raising a unique error.
-- Override columns are left alone. Existing rows are not deleted.

create or replace function public.submit_weekly_checkin(
  p_week_start date,
  p_workouts int,
  p_bonus_count int,
  p_bonus_activities text,
  p_wis boolean,
  p_int boolean,
  p_cha boolean,
  p_note text,
  p_injury boolean
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_character uuid;
  v_guild uuid;
  v_squad uuid;
  v_score int;
  v_id uuid;
  v_tz text;
  v_now timestamp;
  v_cutoff timestamp;
  v_today date;
  v_current_week date;
  v_filed_week date;
begin
  select id, guild_id, squad_id into v_character, v_guild, v_squad
  from public.characters where user_id = auth.uid();
  if v_character is null then
    raise exception 'Create a character first';
  end if;
  select checkin_time_zone into v_tz from public.scoring_config where id = 1;
  v_now := timezone(v_tz, now());
  v_today := v_now::date;
  v_current_week := v_today - (extract(isodow from v_today)::int - 1);
  v_filed_week := p_week_start - (extract(isodow from p_week_start)::int - 1);
  if v_filed_week > v_current_week then
    raise exception 'That week has not started';
  end if;
  v_cutoff := (p_week_start + 4) + time '23:59';
  if v_now > v_cutoff and not public.is_log_approver() then
    raise exception 'Check-in is closed for that week';
  end if;
  v_score := public.checkin_score(p_workouts, p_wis, p_int, p_cha);
  insert into public.weekly_checkins (
    guild_id, character_id, squad_id, week_start, workouts, bonus_count, bonus_activities,
    wis, int_mark, cha, note, injury_sub, score
  ) values (
    v_guild, v_character, v_squad, p_week_start, p_workouts, coalesce(p_bonus_count, 0),
    nullif(p_bonus_activities, ''), p_wis, p_int, p_cha, nullif(p_note, ''),
    coalesce(p_injury, false), v_score
  )
  on conflict (character_id, week_start) do update
  set
    squad_id = excluded.squad_id,
    workouts = excluded.workouts,
    bonus_count = excluded.bonus_count,
    bonus_activities = excluded.bonus_activities,
    wis = excluded.wis,
    int_mark = excluded.int_mark,
    cha = excluded.cha,
    note = excluded.note,
    injury_sub = excluded.injury_sub,
    score = excluded.score
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.submit_weekly_checkin(date, int, int, text, boolean, boolean, boolean, text, boolean) from public, anon;
grant execute on function public.submit_weekly_checkin(date, int, int, text, boolean, boolean, boolean, text, boolean) to authenticated;
