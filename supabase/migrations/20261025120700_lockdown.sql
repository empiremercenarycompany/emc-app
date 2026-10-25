-- Grants. Authenticated can call the company commands and read through RLS.
-- award_attribute_points stays owner-only. Anon receives nothing.

revoke all on all tables in schema public from public, anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

grant select on all tables in schema public to authenticated;

grant update (display_name, avatar_url, last_seen_at) on public.profiles to authenticated;
grant update (name, description, banner_url, settings) on public.guilds to authenticated;
grant update (rank) on public.guild_memberships to authenticated;

grant insert, update, delete on public.squads to authenticated;

grant update (
  name, species, profession, profession_tool, profession_skill, origin_word, portrait_url, notes
) on public.characters to authenticated;

grant insert, update, delete on public.workout_library to authenticated;
grant insert, update, delete on public.workout_versions to authenticated;

grant insert (
  character_id, date, type, exercise, sets, reps, weight, duration_minutes, notes,
  library_workout_id, equipment, mission_id, client_id
) on public.workout_logs to authenticated;
grant update (notes) on public.workout_logs to authenticated;

grant insert (
  character_id, category, title, description, target_frequency, is_active, is_long_term, period_start, period_end
) on public.goals to authenticated;
grant update (
  category, title, description, target_frequency, is_active, is_long_term, period_start, period_end
) on public.goals to authenticated;
grant delete on public.goals to authenticated;

grant insert (goal_id, character_id, completed_on, notes) on public.goal_logs to authenticated;
grant update (notes) on public.goal_logs to authenticated;

grant insert, update, delete on public.adventures to authenticated;
grant insert, update, delete on public.missions to authenticated;
grant insert (mission_id, title, description, target_value, unit, assigned_to) on public.objectives to authenticated;
grant update (title, description, target_value, unit, assigned_to) on public.objectives to authenticated;
grant delete on public.objectives to authenticated;

grant insert, update, delete on public.sessions to authenticated;
grant insert (session_id, character_id) on public.session_attendance to authenticated;
grant update (loot_share) on public.session_attendance to authenticated;

grant insert, update, delete on public.session_notes to authenticated;
grant insert, update, delete on public.campaign_notes to authenticated;
grant insert, update, delete on public.world_state to authenticated;
grant insert, update, delete on public.announcements to authenticated;
grant insert, update, delete on public.calendar_events to authenticated;
grant insert (character_id, expression, result, detail, session_id) on public.dice_rolls to authenticated;

grant insert on public.content_species to authenticated;
grant insert on public.content_items to authenticated;
grant insert on public.content_spells to authenticated;

grant insert, update, delete on public.character_items to authenticated;
grant insert, update, delete on public.character_spells to authenticated;

grant insert, update, delete on public.exercises to authenticated;
grant insert, update, delete on public.exercise_pools to authenticated;
grant insert, update, delete on public.exercise_pool_items to authenticated;
grant insert, update, delete on public.workout_templates to authenticated;
grant insert, update, delete on public.workout_template_exercises to authenticated;
grant insert, update, delete on public.template_assignments to authenticated;
grant insert, update, delete on public.player_workouts to authenticated;
grant insert, update, delete on public.player_workout_exercises to authenticated;
grant insert, update, delete on public.lifting_sessions to authenticated;
grant insert, update, delete on public.lifting_sets to authenticated;
grant insert, update, delete on public.exercise_flags to authenticated;

-- Trigger functions must be executable by the signed-in role. The award
-- function must not. handle_new_user runs as the auth system, not as a player.
grant execute on all functions in schema public to authenticated;

revoke execute on function public.award_attribute_points(uuid, text, uuid, date, text) from authenticated;
revoke execute on function public.handle_new_user() from authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    grant execute on function public.handle_new_user() to supabase_auth_admin;
  end if;
end $$;
