-- Advisor follow-up. Do not edit earlier migrations.
-- search_path on the array check, client execute grants, initplan auth.uid(),
-- foreign-key indexes, and write policies that no longer overlap select.

set search_path = public;

alter function public.starting_array_valid(integer, integer, integer, integer, integer, integer)
  set search_path = public;

-- Trigger functions and helpers the client never calls. RLS helpers and the
-- RPCs in src/ stay executable by authenticated. anon stays revoked.
revoke all on function public.stamp_attendance_loot() from public, anon, authenticated;
revoke all on function public.protect_profile_write() from public, anon, authenticated;
revoke all on function public.protect_character_write() from public, anon, authenticated;
revoke all on function public.enforce_squad_size() from public, anon, authenticated;
revoke all on function public.protect_ledger() from public, anon, authenticated;
revoke all on function public.protect_workout_log() from public, anon, authenticated;
revoke all on function public.protect_goal_log() from public, anon, authenticated;
revoke all on function public.protect_objective_progress() from public, anon, authenticated;
revoke all on function public.protect_srd_content() from public, anon, authenticated;
revoke all on function public.enforce_workout_publish() from public, anon, authenticated;
revoke all on function public.enforce_workout_version() from public, anon, authenticated;
revoke all on function public.protect_lifting_points() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.player_can_use_pool(uuid, uuid) from public, anon, authenticated;
revoke all on function public.write_progression_audit(uuid, text, text, text, text) from public, anon, authenticated;
revoke all on function public.award_attribute_points(uuid, text, uuid, date, text) from public, anon, authenticated;

-- (select auth.uid()) is planned once per statement instead of once per row.
drop policy profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or exists (
      select 1
      from public.guild_memberships mine
      join public.guild_memberships theirs on theirs.guild_id = mine.guild_id
      where mine.user_id = (select auth.uid())
        and theirs.user_id = profiles.id
    )
  );

drop policy profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy memberships_select on public.guild_memberships;
create policy memberships_select on public.guild_memberships
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_member(guild_id));

drop policy characters_select on public.characters;
create policy characters_select on public.characters
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_member(guild_id));

drop policy characters_update on public.characters;
create policy characters_update on public.characters
  for update to authenticated
  using (user_id = (select auth.uid()) or (public.is_dm() and public.is_member(guild_id)))
  with check (user_id = (select auth.uid()) or (public.is_dm() and public.is_member(guild_id)));

drop policy campaign_notes_insert on public.campaign_notes;
create policy campaign_notes_insert on public.campaign_notes
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (
      (visibility = 'members' and (public.is_dm() or public.is_admin()) and public.is_member(guild_id))
      or (visibility = 'admins' and (public.is_dm() or public.is_admin()) and public.is_member(guild_id))
      or (visibility = 'dm' and public.is_dm() and public.is_member(guild_id))
    )
  );

drop policy campaign_notes_update on public.campaign_notes;
create policy campaign_notes_update on public.campaign_notes
  for update to authenticated
  using (
    public.is_member(guild_id)
    and (created_by = (select auth.uid()) or public.is_dm())
    and (
      (visibility = 'dm' and public.is_dm())
      or (visibility = 'admins' and (public.is_dm() or public.is_admin()))
      or (visibility = 'members' and (public.is_dm() or public.is_admin()))
    )
  )
  with check (
    public.is_member(guild_id)
    and (
      (visibility = 'dm' and public.is_dm())
      or (visibility = 'admins' and (public.is_dm() or public.is_admin()))
      or (visibility = 'members' and (public.is_dm() or public.is_admin()))
    )
  );

drop policy campaign_notes_delete on public.campaign_notes;
create policy campaign_notes_delete on public.campaign_notes
  for delete to authenticated
  using (
    public.is_dm()
    and public.is_member(guild_id)
    and (created_by = (select auth.uid()) or visibility = 'dm')
  );

drop policy achievements_select on public.achievements;
create policy achievements_select on public.achievements
  for select to authenticated
  using (
    exists (
      select 1 from public.guild_memberships
      where user_id = (select auth.uid())
    )
  );

drop policy dm_notes_insert on public.dm_notes;
create policy dm_notes_insert on public.dm_notes
  for insert to authenticated
  with check (
    public.is_staff()
    and public.is_member(guild_id)
    and created_by = (select auth.uid())
  );

drop policy announcements_select on public.announcements;
create policy announcements_select on public.announcements
  for select to authenticated
  using (
    public.is_member(guild_id)
    and (
      squad_id is null
      or public.is_staff()
      or exists (
        select 1 from public.characters c
        where c.user_id = (select auth.uid())
          and c.squad_id = announcements.squad_id
      )
    )
  );

-- A FOR ALL policy also permits SELECT, so it duplicated the read policy.
-- The write expression is unchanged. It now covers insert, update, and delete only.
-- Read access stays on the existing select policy. That OR was already a no-op
-- because every write check is narrower than the matching read check.
drop policy adventures_write on public.adventures;
create policy adventures_write_insert on public.adventures
  for insert to authenticated
  with check ((is_dm() AND is_member(guild_id)));
create policy adventures_write_update on public.adventures
  for update to authenticated
  using ((is_dm() AND is_member(guild_id)))
  with check ((is_dm() AND is_member(guild_id)));
create policy adventures_write_delete on public.adventures
  for delete to authenticated
  using ((is_dm() AND is_member(guild_id)));

drop policy announcements_write on public.announcements;
create policy announcements_write_insert on public.announcements
  for insert to authenticated
  with check ((is_staff() AND is_member(guild_id) AND ((squad_id IS NULL) OR (EXISTS ( SELECT 1
   FROM squads s
  WHERE ((s.id = announcements.squad_id) AND (s.guild_id = announcements.guild_id)))))));
create policy announcements_write_update on public.announcements
  for update to authenticated
  using ((is_staff() AND is_member(guild_id)))
  with check ((is_staff() AND is_member(guild_id) AND ((squad_id IS NULL) OR (EXISTS ( SELECT 1
   FROM squads s
  WHERE ((s.id = announcements.squad_id) AND (s.guild_id = announcements.guild_id)))))));
create policy announcements_write_delete on public.announcements
  for delete to authenticated
  using ((is_staff() AND is_member(guild_id)));

drop policy calendar_write on public.calendar_events;
create policy calendar_write_insert on public.calendar_events
  for insert to authenticated
  with check ((is_staff() AND is_member(guild_id)));
create policy calendar_write_update on public.calendar_events
  for update to authenticated
  using ((is_staff() AND is_member(guild_id)))
  with check ((is_staff() AND is_member(guild_id)));
create policy calendar_write_delete on public.calendar_events
  for delete to authenticated
  using ((is_staff() AND is_member(guild_id)));

drop policy character_items_write on public.character_items;
create policy character_items_write_insert on public.character_items
  for insert to authenticated
  with check (is_dm());
create policy character_items_write_update on public.character_items
  for update to authenticated
  using (is_dm())
  with check (is_dm());
create policy character_items_write_delete on public.character_items
  for delete to authenticated
  using (is_dm());

drop policy character_spells_write on public.character_spells;
create policy character_spells_write_insert on public.character_spells
  for insert to authenticated
  with check (is_dm());
create policy character_spells_write_update on public.character_spells
  for update to authenticated
  using (is_dm())
  with check (is_dm());
create policy character_spells_write_delete on public.character_spells
  for delete to authenticated
  using (is_dm());

drop policy flags_write on public.exercise_flags;
create policy flags_write_insert on public.exercise_flags
  for insert to authenticated
  with check ((is_curator() AND is_member(guild_id)));
create policy flags_write_update on public.exercise_flags
  for update to authenticated
  using ((is_curator() AND is_member(guild_id)))
  with check ((is_curator() AND is_member(guild_id)));
create policy flags_write_delete on public.exercise_flags
  for delete to authenticated
  using ((is_curator() AND is_member(guild_id)));

drop policy pool_items_write on public.exercise_pool_items;
create policy pool_items_write_insert on public.exercise_pool_items
  for insert to authenticated
  with check ((EXISTS ( SELECT 1
   FROM (exercise_pools p
     JOIN exercises e ON ((e.id = exercise_pool_items.exercise_id)))
  WHERE ((p.id = exercise_pool_items.pool_id) AND is_curator() AND is_member(p.guild_id) AND (e.guild_id = p.guild_id) AND (e.status = 'approved'::text)))));
create policy pool_items_write_update on public.exercise_pool_items
  for update to authenticated
  using ((EXISTS ( SELECT 1
   FROM exercise_pools p
  WHERE ((p.id = exercise_pool_items.pool_id) AND is_curator() AND is_member(p.guild_id)))))
  with check ((EXISTS ( SELECT 1
   FROM (exercise_pools p
     JOIN exercises e ON ((e.id = exercise_pool_items.exercise_id)))
  WHERE ((p.id = exercise_pool_items.pool_id) AND is_curator() AND is_member(p.guild_id) AND (e.guild_id = p.guild_id) AND (e.status = 'approved'::text)))));
create policy pool_items_write_delete on public.exercise_pool_items
  for delete to authenticated
  using ((EXISTS ( SELECT 1
   FROM exercise_pools p
  WHERE ((p.id = exercise_pool_items.pool_id) AND is_curator() AND is_member(p.guild_id)))));

drop policy pools_write on public.exercise_pools;
create policy pools_write_insert on public.exercise_pools
  for insert to authenticated
  with check ((is_curator() AND is_member(guild_id)));
create policy pools_write_update on public.exercise_pools
  for update to authenticated
  using ((is_curator() AND is_member(guild_id)))
  with check ((is_curator() AND is_member(guild_id)));
create policy pools_write_delete on public.exercise_pools
  for delete to authenticated
  using ((is_curator() AND is_member(guild_id)));

drop policy exercises_write on public.exercises;
create policy exercises_write_insert on public.exercises
  for insert to authenticated
  with check ((is_curator() AND is_member(guild_id)));
create policy exercises_write_update on public.exercises
  for update to authenticated
  using ((is_curator() AND is_member(guild_id)))
  with check ((is_curator() AND is_member(guild_id)));
create policy exercises_write_delete on public.exercises
  for delete to authenticated
  using ((is_curator() AND is_member(guild_id)));

drop policy goals_write on public.goals;
create policy goals_write_insert on public.goals
  for insert to authenticated
  with check (owns_character(character_id));
create policy goals_write_update on public.goals
  for update to authenticated
  using (owns_character(character_id))
  with check (owns_character(character_id));
create policy goals_write_delete on public.goals
  for delete to authenticated
  using (owns_character(character_id));

drop policy lifting_sessions_write on public.lifting_sessions;
create policy lifting_sessions_write_insert on public.lifting_sessions
  for insert to authenticated
  with check (owns_character(character_id));
create policy lifting_sessions_write_update on public.lifting_sessions
  for update to authenticated
  using (owns_character(character_id))
  with check (owns_character(character_id));
create policy lifting_sessions_write_delete on public.lifting_sessions
  for delete to authenticated
  using (owns_character(character_id));

drop policy lifting_sets_write on public.lifting_sets;
create policy lifting_sets_write_insert on public.lifting_sets
  for insert to authenticated
  with check ((EXISTS ( SELECT 1
   FROM lifting_sessions s
  WHERE ((s.id = lifting_sets.session_id) AND owns_character(s.character_id)))));
create policy lifting_sets_write_update on public.lifting_sets
  for update to authenticated
  using ((EXISTS ( SELECT 1
   FROM lifting_sessions s
  WHERE ((s.id = lifting_sets.session_id) AND owns_character(s.character_id)))))
  with check ((EXISTS ( SELECT 1
   FROM lifting_sessions s
  WHERE ((s.id = lifting_sets.session_id) AND owns_character(s.character_id)))));
create policy lifting_sets_write_delete on public.lifting_sets
  for delete to authenticated
  using ((EXISTS ( SELECT 1
   FROM lifting_sessions s
  WHERE ((s.id = lifting_sets.session_id) AND owns_character(s.character_id)))));

drop policy missions_write on public.missions;
create policy missions_write_insert on public.missions
  for insert to authenticated
  with check (((is_dm() OR is_admin()) AND is_member(guild_id)));
create policy missions_write_update on public.missions
  for update to authenticated
  using (((is_dm() OR is_admin()) AND is_member(guild_id)))
  with check (((is_dm() OR is_admin()) AND is_member(guild_id)));
create policy missions_write_delete on public.missions
  for delete to authenticated
  using (((is_dm() OR is_admin()) AND is_member(guild_id)));

drop policy objectives_write on public.objectives;
create policy objectives_write_insert on public.objectives
  for insert to authenticated
  with check ((EXISTS ( SELECT 1
   FROM missions m
  WHERE ((m.id = objectives.mission_id) AND is_member(m.guild_id) AND (is_dm() OR is_admin())))));
create policy objectives_write_update on public.objectives
  for update to authenticated
  using ((EXISTS ( SELECT 1
   FROM missions m
  WHERE ((m.id = objectives.mission_id) AND is_member(m.guild_id) AND (is_dm() OR is_admin())))))
  with check ((EXISTS ( SELECT 1
   FROM missions m
  WHERE ((m.id = objectives.mission_id) AND is_member(m.guild_id) AND (is_dm() OR is_admin())))));
create policy objectives_write_delete on public.objectives
  for delete to authenticated
  using ((EXISTS ( SELECT 1
   FROM missions m
  WHERE ((m.id = objectives.mission_id) AND is_member(m.guild_id) AND (is_dm() OR is_admin())))));

drop policy sessions_write on public.sessions;
create policy sessions_write_insert on public.sessions
  for insert to authenticated
  with check ((is_staff() AND is_member(guild_id)));
create policy sessions_write_update on public.sessions
  for update to authenticated
  using ((is_staff() AND is_member(guild_id)))
  with check ((is_staff() AND is_member(guild_id)));
create policy sessions_write_delete on public.sessions
  for delete to authenticated
  using ((is_staff() AND is_member(guild_id)));

drop policy squads_write on public.squads;
create policy squads_write_insert on public.squads
  for insert to authenticated
  with check (((is_dm() OR is_admin()) AND is_member(guild_id)));
create policy squads_write_update on public.squads
  for update to authenticated
  using (((is_dm() OR is_admin()) AND is_member(guild_id)))
  with check (((is_dm() OR is_admin()) AND is_member(guild_id)));
create policy squads_write_delete on public.squads
  for delete to authenticated
  using (((is_dm() OR is_admin()) AND is_member(guild_id)));

drop policy assignments_write on public.template_assignments;
create policy assignments_write_insert on public.template_assignments
  for insert to authenticated
  with check (is_curator());
create policy assignments_write_update on public.template_assignments
  for update to authenticated
  using (is_curator())
  with check (is_curator());
create policy assignments_write_delete on public.template_assignments
  for delete to authenticated
  using (is_curator());

drop policy template_exercises_write on public.workout_template_exercises;
create policy template_exercises_write_insert on public.workout_template_exercises
  for insert to authenticated
  with check ((EXISTS ( SELECT 1
   FROM workout_templates t
  WHERE ((t.id = workout_template_exercises.template_id) AND is_curator() AND is_member(t.guild_id)))));
create policy template_exercises_write_update on public.workout_template_exercises
  for update to authenticated
  using ((EXISTS ( SELECT 1
   FROM workout_templates t
  WHERE ((t.id = workout_template_exercises.template_id) AND is_curator() AND is_member(t.guild_id)))))
  with check ((EXISTS ( SELECT 1
   FROM workout_templates t
  WHERE ((t.id = workout_template_exercises.template_id) AND is_curator() AND is_member(t.guild_id)))));
create policy template_exercises_write_delete on public.workout_template_exercises
  for delete to authenticated
  using ((EXISTS ( SELECT 1
   FROM workout_templates t
  WHERE ((t.id = workout_template_exercises.template_id) AND is_curator() AND is_member(t.guild_id)))));

drop policy templates_write on public.workout_templates;
create policy templates_write_insert on public.workout_templates
  for insert to authenticated
  with check ((is_curator() AND is_member(guild_id)));
create policy templates_write_update on public.workout_templates
  for update to authenticated
  using ((is_curator() AND is_member(guild_id)))
  with check ((is_curator() AND is_member(guild_id)));
create policy templates_write_delete on public.workout_templates
  for delete to authenticated
  using ((is_curator() AND is_member(guild_id)));

drop policy versions_write on public.workout_versions;
create policy versions_write_insert on public.workout_versions
  for insert to authenticated
  with check ((is_library_editor() AND (EXISTS ( SELECT 1
   FROM workout_library w
  WHERE ((w.id = workout_versions.workout_id) AND is_member(w.guild_id))))));
create policy versions_write_update on public.workout_versions
  for update to authenticated
  using ((is_library_editor() AND (EXISTS ( SELECT 1
   FROM workout_library w
  WHERE ((w.id = workout_versions.workout_id) AND is_member(w.guild_id))))))
  with check ((is_library_editor() AND (EXISTS ( SELECT 1
   FROM workout_library w
  WHERE ((w.id = workout_versions.workout_id) AND is_member(w.guild_id))))));
create policy versions_write_delete on public.workout_versions
  for delete to authenticated
  using ((is_library_editor() AND (EXISTS ( SELECT 1
   FROM workout_library w
  WHERE ((w.id = workout_versions.workout_id) AND is_member(w.guild_id))))));

drop policy world_state_write on public.world_state;
create policy world_state_write_insert on public.world_state
  for insert to authenticated
  with check ((is_dm() AND is_member(guild_id)));
create policy world_state_write_update on public.world_state
  for update to authenticated
  using ((is_dm() AND is_member(guild_id)))
  with check ((is_dm() AND is_member(guild_id)));
create policy world_state_write_delete on public.world_state
  for delete to authenticated
  using ((is_dm() AND is_member(guild_id)));


-- Foreign keys the planner could not start from an index.
create index idx_announcements_posted_by on public.announcements (posted_by);
create index idx_announcements_squad_id on public.announcements (squad_id);
create index idx_attribute_point_ledger_approved_by on public.attribute_point_ledger (approved_by);
create index idx_attribute_point_ledger_character_id on public.attribute_point_ledger (character_id);
create index idx_calendar_events_created_by on public.calendar_events (created_by);
create index idx_calendar_events_guild_id on public.calendar_events (guild_id);
create index idx_campaign_notes_adventure_id on public.campaign_notes (adventure_id);
create index idx_campaign_notes_created_by on public.campaign_notes (created_by);
create index idx_campaign_notes_guild_id on public.campaign_notes (guild_id);
create index idx_character_achievements_achievement_id on public.character_achievements (achievement_id);
create index idx_character_items_item_id on public.character_items (item_id);
create index idx_character_spells_spell_id on public.character_spells (spell_id);
create index idx_dice_rolls_character_id on public.dice_rolls (character_id);
create index idx_dice_rolls_session_id on public.dice_rolls (session_id);
create index idx_dm_notes_character_id on public.dm_notes (character_id);
create index idx_dm_notes_created_by on public.dm_notes (created_by);
create index idx_dm_notes_session_id on public.dm_notes (session_id);
create index idx_dm_notes_squad_id on public.dm_notes (squad_id);
create index idx_exercise_flags_created_by on public.exercise_flags (created_by);
create index idx_exercise_flags_exercise_id on public.exercise_flags (exercise_id);
create index idx_exercise_flags_goal_id on public.exercise_flags (goal_id);
create index idx_exercise_flags_guild_id on public.exercise_flags (guild_id);
create index idx_exercise_pool_items_exercise_id on public.exercise_pool_items (exercise_id);
create index idx_exercise_pools_created_by on public.exercise_pools (created_by);
create index idx_exercise_pools_guild_id on public.exercise_pools (guild_id);
create index idx_exercises_approved_by on public.exercises (approved_by);
create index idx_exercises_created_by on public.exercises (created_by);
create index idx_exercises_guild_id on public.exercises (guild_id);
create index idx_goal_logs_character_id on public.goal_logs (character_id);
create index idx_guild_memberships_character_id on public.guild_memberships (character_id);
create index idx_guild_memberships_user_id on public.guild_memberships (user_id);
create index idx_guilds_commander_id on public.guilds (commander_id);
create index idx_lifting_sessions_character_id on public.lifting_sessions (character_id);
create index idx_lifting_sessions_player_workout_id on public.lifting_sessions (player_workout_id);
create index idx_lifting_sessions_template_id on public.lifting_sessions (template_id);
create index idx_lifting_sessions_workout_log_id on public.lifting_sessions (workout_log_id);
create index idx_lifting_sets_exercise_id on public.lifting_sets (exercise_id);
create index idx_lifting_sets_session_id on public.lifting_sets (session_id);
create index idx_missions_created_by on public.missions (created_by);
create index idx_missions_squad_id on public.missions (squad_id);
create index idx_objectives_assigned_to on public.objectives (assigned_to);
create index idx_objectives_mission_id on public.objectives (mission_id);
create index idx_player_workout_exercises_exercise_id on public.player_workout_exercises (exercise_id);
create index idx_player_workout_exercises_player_workout_id on public.player_workout_exercises (player_workout_id);
create index idx_player_workouts_based_on_template_id on public.player_workouts (based_on_template_id);
create index idx_player_workouts_character_id on public.player_workouts (character_id);
create index idx_player_workouts_pool_id on public.player_workouts (pool_id);
create index idx_progression_audit_actor_id on public.progression_audit (actor_id);
create index idx_session_attendance_character_id on public.session_attendance (character_id);
create index idx_session_notes_character_id on public.session_notes (character_id);
create index idx_session_notes_session_id on public.session_notes (session_id);
create index idx_sessions_adventure_id on public.sessions (adventure_id);
create index idx_sessions_squad_id on public.sessions (squad_id);
create index idx_squads_guild_id on public.squads (guild_id);
create index idx_template_assignments_assigned_by on public.template_assignments (assigned_by);
create index idx_template_assignments_character_id on public.template_assignments (character_id);
create index idx_template_assignments_template_id on public.template_assignments (template_id);
create index idx_workout_library_author_id on public.workout_library (author_id);
create index idx_workout_library_guild_id on public.workout_library (guild_id);
create index idx_workout_logs_library_workout_id on public.workout_logs (library_workout_id);
create index idx_workout_template_exercises_exercise_id on public.workout_template_exercises (exercise_id);
create index idx_workout_template_exercises_template_id on public.workout_template_exercises (template_id);
create index idx_workout_templates_created_by on public.workout_templates (created_by);
create index idx_workout_templates_guild_id on public.workout_templates (guild_id);
create index idx_workout_templates_pool_id on public.workout_templates (pool_id);
create index idx_world_state_adventure_id on public.world_state (adventure_id);
create index idx_world_state_guild_id on public.world_state (guild_id);
