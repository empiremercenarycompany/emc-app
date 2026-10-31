-- Row policies. Default deny. Helpers are security definer so they do not recurse.

create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.guild_memberships mine
      join public.guild_memberships theirs on theirs.guild_id = mine.guild_id
      where mine.user_id = auth.uid() and theirs.user_id = profiles.id
    )
  );

create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy guilds_select on public.guilds
  for select to authenticated
  using (public.is_member(id));

create policy guilds_update on public.guilds
  for update to authenticated
  using (public.is_dm() and public.is_member(id))
  with check (public.is_dm() and public.is_member(id));

create policy memberships_select on public.guild_memberships
  for select to authenticated
  using (user_id = auth.uid() or public.is_member(guild_id));

create policy memberships_update on public.guild_memberships
  for update to authenticated
  using (public.is_dm() and public.is_member(guild_id))
  with check (public.is_dm() and public.is_member(guild_id));

create policy squads_select on public.squads
  for select to authenticated
  using (public.is_member(guild_id));

create policy squads_write on public.squads
  for all to authenticated
  using ((public.is_dm() or public.is_admin()) and public.is_member(guild_id))
  with check ((public.is_dm() or public.is_admin()) and public.is_member(guild_id));

create policy characters_select on public.characters
  for select to authenticated
  using (user_id = auth.uid() or public.is_member(guild_id));

create policy characters_update on public.characters
  for update to authenticated
  using (user_id = auth.uid() or (public.is_dm() and public.is_member(guild_id)))
  with check (user_id = auth.uid() or (public.is_dm() and public.is_member(guild_id)));

create policy ledger_select on public.attribute_point_ledger
  for select to authenticated
  using (
    public.owns_character(character_id)
    or exists (
      select 1 from public.characters c
      where c.id = character_id
        and public.is_member(c.guild_id)
        and (public.is_dm() or public.is_admin())
    )
  );

create policy library_select on public.workout_library
  for select to authenticated
  using (
    public.is_member(guild_id)
    and (published or public.is_library_editor() or public.is_dm())
  );

create policy library_insert on public.workout_library
  for insert to authenticated
  with check (public.is_library_editor() and public.is_member(guild_id));

create policy library_update on public.workout_library
  for update to authenticated
  using (public.is_member(guild_id) and (public.is_library_editor() or public.is_dm()))
  with check (public.is_member(guild_id) and (public.is_library_editor() or public.is_dm()));

create policy library_delete on public.workout_library
  for delete to authenticated
  using (public.is_library_editor() and public.is_member(guild_id));

create policy versions_select on public.workout_versions
  for select to authenticated
  using (
    exists (
      select 1 from public.workout_library w
      where w.id = workout_id
        and public.is_member(w.guild_id)
        and (w.published or public.is_library_editor() or public.is_dm())
    )
  );

create policy versions_write on public.workout_versions
  for all to authenticated
  using (
    public.is_library_editor()
    and exists (
      select 1 from public.workout_library w
      where w.id = workout_id and public.is_member(w.guild_id)
    )
  )
  with check (
    public.is_library_editor()
    and exists (
      select 1 from public.workout_library w
      where w.id = workout_id and public.is_member(w.guild_id)
    )
  );

create policy workout_logs_select on public.workout_logs
  for select to authenticated
  using (public.can_read_logs(character_id));

create policy workout_logs_insert on public.workout_logs
  for insert to authenticated
  with check (public.owns_character(character_id));

create policy workout_logs_update on public.workout_logs
  for update to authenticated
  using (public.owns_character(character_id))
  with check (public.owns_character(character_id));

create policy goals_select on public.goals
  for select to authenticated
  using (
    public.owns_character(character_id)
    or exists (
      select 1 from public.characters c
      where c.id = character_id
        and public.is_member(c.guild_id)
        and (public.is_dm() or public.is_admin())
    )
  );

create policy goals_write on public.goals
  for all to authenticated
  using (public.owns_character(character_id))
  with check (public.owns_character(character_id));

create policy goal_logs_select on public.goal_logs
  for select to authenticated
  using (
    public.owns_character(character_id)
    or exists (
      select 1 from public.characters c
      where c.id = character_id
        and public.is_member(c.guild_id)
        and (public.is_dm() or public.is_admin())
    )
  );

create policy goal_logs_insert on public.goal_logs
  for insert to authenticated
  with check (public.owns_character(character_id));

create policy goal_logs_update on public.goal_logs
  for update to authenticated
  using (public.owns_character(character_id))
  with check (public.owns_character(character_id));

create policy adventures_select on public.adventures
  for select to authenticated
  using (public.is_member(guild_id));

create policy adventures_write on public.adventures
  for all to authenticated
  using (public.is_dm() and public.is_member(guild_id))
  with check (public.is_dm() and public.is_member(guild_id));

create policy missions_select on public.missions
  for select to authenticated
  using (public.is_member(guild_id));

create policy missions_write on public.missions
  for all to authenticated
  using ((public.is_dm() or public.is_admin()) and public.is_member(guild_id))
  with check ((public.is_dm() or public.is_admin()) and public.is_member(guild_id));

create policy objectives_select on public.objectives
  for select to authenticated
  using (
    exists (
      select 1 from public.missions m
      where m.id = mission_id and public.is_member(m.guild_id)
    )
  );

create policy objectives_write on public.objectives
  for all to authenticated
  using (
    exists (
      select 1 from public.missions m
      where m.id = mission_id
        and public.is_member(m.guild_id)
        and (public.is_dm() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.missions m
      where m.id = mission_id
        and public.is_member(m.guild_id)
        and (public.is_dm() or public.is_admin())
    )
  );

create policy sessions_select on public.sessions
  for select to authenticated
  using (public.is_member(guild_id));

create policy sessions_write on public.sessions
  for all to authenticated
  using (public.is_dm() and public.is_member(guild_id))
  with check (public.is_dm() and public.is_member(guild_id));

create policy attendance_select on public.session_attendance
  for select to authenticated
  using (
    exists (
      select 1 from public.sessions s
      where s.id = session_id and public.is_member(s.guild_id)
    )
  );

create policy attendance_insert on public.session_attendance
  for insert to authenticated
  with check (public.owns_character(character_id));

create policy attendance_update on public.session_attendance
  for update to authenticated
  using (
    public.is_dm()
    and exists (
      select 1 from public.sessions s
      where s.id = session_id and public.is_member(s.guild_id)
    )
  )
  with check (
    public.is_dm()
    and exists (
      select 1 from public.sessions s
      where s.id = session_id and public.is_member(s.guild_id)
    )
  );

create policy session_notes_select on public.session_notes
  for select to authenticated
  using (
    exists (
      select 1 from public.sessions s
      where s.id = session_id and public.is_member(s.guild_id)
    )
  );

create policy session_notes_insert on public.session_notes
  for insert to authenticated
  with check (
    public.owns_character(character_id)
    and exists (
      select 1 from public.sessions s
      where s.id = session_id and public.is_member(s.guild_id)
    )
  );

create policy session_notes_update on public.session_notes
  for update to authenticated
  using (public.owns_character(character_id))
  with check (public.owns_character(character_id));

create policy session_notes_delete on public.session_notes
  for delete to authenticated
  using (public.owns_character(character_id));

create policy campaign_notes_select on public.campaign_notes
  for select to authenticated
  using (
    (visibility = 'members' and public.is_member(guild_id))
    or (visibility = 'admins' and public.is_member(guild_id) and (public.is_admin() or public.is_dm()))
    or (visibility = 'dm' and public.is_member(guild_id) and public.is_dm())
  );

create policy campaign_notes_insert on public.campaign_notes
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and (
      (visibility = 'members' and (public.is_dm() or public.is_admin()) and public.is_member(guild_id))
      or (visibility = 'admins' and (public.is_dm() or public.is_admin()) and public.is_member(guild_id))
      or (visibility = 'dm' and public.is_dm() and public.is_member(guild_id))
    )
  );

create policy campaign_notes_update on public.campaign_notes
  for update to authenticated
  using (
    public.is_member(guild_id)
    and (created_by = auth.uid() or public.is_dm())
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

create policy campaign_notes_delete on public.campaign_notes
  for delete to authenticated
  using (public.is_dm() and public.is_member(guild_id) and (created_by = auth.uid() or visibility = 'dm'));

create policy world_state_select on public.world_state
  for select to authenticated
  using (public.is_member(guild_id) and (published or public.is_dm()));

create policy world_state_write on public.world_state
  for all to authenticated
  using (public.is_dm() and public.is_member(guild_id))
  with check (public.is_dm() and public.is_member(guild_id));

create policy announcements_select on public.announcements
  for select to authenticated
  using (public.is_member(guild_id));

create policy announcements_write on public.announcements
  for all to authenticated
  using ((public.is_dm() or public.is_admin()) and public.is_member(guild_id))
  with check ((public.is_dm() or public.is_admin()) and public.is_member(guild_id));

create policy calendar_select on public.calendar_events
  for select to authenticated
  using (public.is_member(guild_id));

create policy calendar_write on public.calendar_events
  for all to authenticated
  using ((public.is_dm() or public.is_admin()) and public.is_member(guild_id))
  with check ((public.is_dm() or public.is_admin()) and public.is_member(guild_id));

create policy achievements_select on public.achievements
  for select to authenticated
  using (exists (select 1 from public.guild_memberships where user_id = auth.uid()));

create policy character_achievements_select on public.character_achievements
  for select to authenticated
  using (
    public.owns_character(character_id)
    or exists (
      select 1 from public.characters c
      where c.id = character_id
        and public.is_member(c.guild_id)
        and (public.is_dm() or public.is_admin())
    )
  );

create policy dice_select on public.dice_rolls
  for select to authenticated
  using (
    public.owns_character(character_id)
    or exists (
      select 1 from public.characters c
      where c.id = character_id and public.is_member(c.guild_id) and public.is_dm()
    )
  );

create policy dice_insert on public.dice_rolls
  for insert to authenticated
  with check (public.owns_character(character_id));

create policy species_select on public.content_species for select to authenticated using (true);
create policy items_select on public.content_items for select to authenticated using (true);
create policy spells_select on public.content_spells for select to authenticated using (true);
create policy skills_select on public.skill_labels for select to authenticated using (true);
create policy tools_select on public.profession_tools for select to authenticated using (true);
create policy classes_select on public.induction_classes for select to authenticated using (true);
create policy ranks_select on public.rank_catalog for select to authenticated using (true);
create policy costs_select on public.point_buy_costs for select to authenticated using (true);
create policy scoring_select on public.scoring_config for select to authenticated using (true);
create policy cohort_select on public.cohort_sessions for select to authenticated using (true);
create policy staff_roles_select on public.staff_grant_roles for select to authenticated using (true);
create policy editor_roles_select on public.library_editor_roles for select to authenticated using (true);
create policy notes_select on public.config_notes for select to authenticated using (true);

create policy species_insert on public.content_species
  for insert to authenticated
  with check (public.is_dm() and source = 'homebrew');
create policy items_insert on public.content_items
  for insert to authenticated
  with check (public.is_dm() and source = 'homebrew');
create policy spells_insert on public.content_spells
  for insert to authenticated
  with check (public.is_dm() and source = 'homebrew');

create policy character_items_select on public.character_items
  for select to authenticated
  using (public.owns_character(character_id) or public.is_dm());

create policy character_spells_select on public.character_spells
  for select to authenticated
  using (public.owns_character(character_id) or public.is_dm());

create policy character_items_write on public.character_items
  for all to authenticated
  using (public.is_dm())
  with check (public.is_dm());

create policy character_spells_write on public.character_spells
  for all to authenticated
  using (public.is_dm())
  with check (public.is_dm());
