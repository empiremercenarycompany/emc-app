# Lifting journal — design proposal

For John to review. The journal tables and screens below are not built. The award windows they mention (`cohort_sessions` and the first-adventure caps) are already in the database.

A curator approves the exercises that can appear in a workout. Trainers build templates from that library. A player drags approved exercises into their own workout, reorders them, and swaps them. Logging the session records the actual sets. During the first adventure that one log can earn a Physical point under the exercise allotment. A flagged exercise is only a hook for a later reward. It does not pay attribute points.

John named Garret as the person who would curate exercises. The rules do not name him. They key off a guild role, `curator`, stored on `guild_memberships.role`. Another person can hold the same job. A Captain does not automatically become a curator unless John says so.

## Exercise library

`exercises`

- `id`, `guild_id`, `name`, `focus` (`strength`, `dexterity`, or `functional`), `cues`, `status` (`approved` or `retired`), `created_by`, `approved_by`, `created_at`
- A curator inserts exercises and is the one who sets `status` to `approved`.
- A retired exercise stays on old sessions and old workouts. It cannot be dropped into a new workout.
- Players do not type a new exercise name into a scored workout. The name comes from this table.

`exercise_pools`

- `id`, `guild_id`, `title`, `created_by`, `created_at`
- A curator defines a pool as the menu of approved exercises a player may choose from. A pool is not an order. A template is an order.

`exercise_pool_items`

- `pool_id`, `exercise_id`
- `exercise_id` must be an approved exercise in the same guild.

## Templates and the player's own workout

A template is the curator's suggested workout: an ordered list, with target sets, reps, and weight, drawn only from approved exercises. Assigning a template does not freeze the player's list. It offers a starting copy.

`workout_templates`

- `id`, `guild_id`, `created_by`, `pool_id` (the menu this template belongs to), `title`, `notes`, `focus`, `created_at`
- Editing a template does not rewrite a player's workout or a session already logged.

`workout_template_exercises`

- `id`, `template_id`, `exercise_id`, `position`, `target_sets`, `target_reps`, `target_weight`, `notes`

`template_assignments`

- `id`, `template_id`, `character_id`, `assigned_by`, `assigned_at`, `ended_at`
- `ended_at` null means this is the assignment in force. A new assignment sets `ended_at` on the previous one.

`player_workouts`

- `id`, `character_id`, `based_on_template_id`, `pool_id`, `title`, `updated_at`
- This is the list the player actually trains from. One current workout per character is enough for the first version.
- `based_on_template_id` records which template was copied. It stays set after the player reorders or swaps, so the squad can see the workout started from that template.

`player_workout_exercises`

- `id`, `player_workout_id`, `exercise_id`, `position`, `target_sets`, `target_reps`, `target_weight`
- Every `exercise_id` must be approved and must belong to the workout's pool.
- "Start from template" deletes these rows and copies the template's rows in. Later edits to the template do not change the copy. The player then reorders, removes, and adds.

A player who has not built a workout can still log the assigned template as it stands. Saving a session from that path does not require a `player_workouts` row. The session stores the template id.

## Drag-and-drop builder

One screen, two columns. On a phone the menu is above the workout and both scroll.

- Left column, "Approved". The exercises in the player's current pool. Grouped by focus, with a search field. A card shows the name, the focus, and a marker when a curator has flagged it. The marker is not a point value. Retired exercises and exercises outside the pool are absent. Dragging starts from a card.
- Right column, "Your workout". An ordered list with a drag handle on each row. Dropping on the list inserts at that index. Dropping onto an existing row swaps that row for the new exercise and keeps the target sets, reps, and weight already on the row. Dragging a row by its handle reorders it. Each row has a remove control and fields for target sets, reps, and weight, filled from the template when the row was copied.
- Buttons: "Start from assigned template" (asks before replacing the list), "Save workout", "Clear".
- Save writes `player_workouts` and `player_workout_exercises` only. It does not write a session and does not award points.
- The server rejects a save that includes an exercise that is not approved or not in the pool. The drag sources are limited so a normal drag cannot do that.

## Tables for the log

`lifting_sessions`

- `id`, `character_id`, `player_workout_id` (null when logging the template unchanged), `template_id`, `workout_log_id`, `date`, `notes`, `share_with_squad`, `points_awarded`, `created_at`
- `date` is the company-zone calendar date passed to `record_workout`.
- `points_awarded` is the Physical award from that one workout log, or 0. Squadmates can read it without reading the point ledger.

`lifting_sets`

- `id`, `session_id`, `exercise_id`, `set_number`, `reps`, `weight`, `notes`, `is_pr`
- What the player actually lifted. Several sets belong to one session. The exercise is a library id, not free text.

There is no per-set point row. A flagged exercise is recorded on `exercise_flags`, described below, and the lifting session does not copy a bonus total.

## Who can do what

`workout_logs` stay private to the owner. Shared detail is the session and its sets.

- Guild members can read approved exercises, pools, and templates in their guild.
- A curator can insert and update exercises, approve or retire them, edit pools, edit templates, and assign a template to a character in the guild.
- The curator who created a row can edit it. So can any other curator in that guild.
- A player can read pools and templates assigned to them, and can read their own workout.
- A player can write only their own `player_workouts` and `player_workout_exercises`, and only with approved exercises from their pool.
- A player can insert, update, and delete their own sessions and sets.
- A squadmate can read a session and its sets only when `share_with_squad` is true and both characters share `squad_id`.
- The privacy toggle is per session. This proposal defaults it to on. Turning it off hides that session. It does not hide other sessions, and it does not remove points.
- Exercise flags are written by a curator. A player can read the flags that apply to them. A player cannot mark an exercise.

## Attribute points from a lifting session

"Session" here is one journal entry. The point rules use a different session: an award window on the Denver calendar.

The first adventure is 8 of those windows. At the usual pace each window is 14 days, so the adventure is 16 weeks. A player can earn at most 3 exercise points and 3 goal points in one window. The 27-point build is the binding cap. The starting array already costs 3, so 24 points remain. Four windows at 6 points fill that. A player who maxes every window is done at session 4. Sessions 5 through 8 stay open for a player who earned less. Automatic awards stop at 27 or when the date is outside a first-adventure window, whichever comes first.

The windows come from `cohort_sessions` when that table has any row. Staff (`admin`, `curator`, `dm`, or `captain`) edit it with `set_cohort_session`, `delete_cohort_session`, and `clear_cohort_sessions`. Each row is a session number, an inclusive start date, and an inclusive end date. There is no screen for this yet.

An irregular week is one of two shapes, and both are supported:

- A three-parter is one row with a longer span than 14 days. The whole span is one session and shares that session's 3-point exercise cap.
- An off-week is a date no row covers. It belongs to no session. A log on that date is saved and earns 0. A later row whose number is 1 through 8 still awards, so the gap does not end the adventure.

When `cohort_sessions` is empty, the windows fall back to 14 Denver dates from `program_settings.cohort_start` (placeholder `2026-10-05`). Session 1 starts that day. The fallback is all or nothing: one published row means dates outside the table do not use the cadence. Clearing the table restores it. The seeded anchor is a placeholder until John sets the real first day.

Saving a lifting session calls `record_workout` once. That writes one `workout_logs` row. During the first adventure, that log can earn 1 Physical point if that adventure session still has room in its 3-point exercise allotment, the 27-point build is not yet full, and the date is inside the 14-day backfill. The award counts against the adventure session of the workout date. A future date is rejected and nothing is saved. An older date, an off-week, a date outside the first adventure, or a full allotment is saved with `points_awarded` 0.

Sets do not award points. Five sets are one workout log, and that log is one exercise point at most. There is no weekly cap and no frequency bonus.

After the first adventure, the same save still writes the journal and the workout log. It earns no automatic attribute points.

## Flagged exercises

A curator can mark an exercise as part of the month's group goal, or link it to one player's goal. That mark is a hook for a later reward. It does not grant attribute points, during the first adventure or after it.

`exercise_flags`

- `id`, `exercise_id`, `guild_id`, `goal_id` (null for a group mark), `period_start`, `period_end`, `reward_hook` (text, nullable), `created_by`
- The period is one calendar month when it is set, the same shape as a goal period.
- `reward_hook` is an empty slot. This design does not define values for it and does not name a reward.
- A player cannot set the flag. Unflagging an exercise does not change points already earned.
- Attribute points still come only from the first-adventure allotments: workouts into Physical, and completed goals into the goal's own pool. A flagged lift does not add a second award.

## Staff grants

`grant_staff_attribute_points` is in the database now. There is no screen.

A caller whose `guild_memberships.role` is `admin`, `curator`, `dm`, or `captain` can add points to a character's Physical, Constitution, or Mental pool. The call requires a non-empty reason. The ledger row uses source `staff`, stores the reason, and does not set a session. The amount must be positive. The grant may take the build past 27. It does not remove points, and it does not check the first adventure. Automatic awards still stop once the build is at least 27, so a staff grant can close the automatic allotment by filling that budget.

## Personal records

A set is a personal record when its weight is greater than every earlier set for that character and that `exercise_id`. `is_pr` is set when the set is saved. Private sets count toward the player's own record. Deleting a heavier set does not go back and mark an older set as the record.

A shared session shows its PR sets on the squad board. A private session does not. A PR does not grant attribute points.

## Screens

- Library, curator only: add an exercise, approve it, retire it, build pools, and set an exercise flag. The flag carries an optional reward hook and does not show a point value.
- Template editor, curator only: pick a pool, drag approved exercises into an order, set targets, assign the template to a player, end the assignment.
- Workout builder, the drag-and-drop screen above. The player only.
- Log a session: the date control from Log Work, the saved workout or the assigned template as the plan, rows for actual sets, reps, weight, and notes, a marker on flagged exercises, and the squad visibility toggle. Save creates the session, the sets, and the one workout log.
- My journal: past sessions, including ones that earned 0, with sets and PR marks.
- Squad board: shared sessions only, with the lifter, the date, the sets, and PR marks.

## Decisions for John

1. Confirm the role string `curator`, and who may grant it. Should a Captain have the same rights without holding the role?
2. Is the menu the assigned pool only, or may a player drag any approved exercise in the guild?
3. May a curator lock a template so the player can reorder it but cannot swap in other exercises?
4. Squad visibility: default shared or private? Per session, as proposed, or one switch for the whole journal?
5. Should squadmates see every set, or only a summary and the PRs?
6. Is a personal record the heaviest weight, or should reps count (for example a best estimated one-rep max)?
7. Confirm one workout log per lifting session, so it can take at most one of the three exercise points in that adventure session.
8. Confirm a flagged exercise never grants attribute points, and that `reward_hook` stays undefined until a later reward exists.
9. Confirm a log older than 14 days keeps the sets and earns no attribute points.
10. Staff grants currently allow `admin`, `curator`, `dm`, and `captain`. Should the grant require the same guild as the character?
11. The session schedule uses the same roles, and one published row turns the 14-day cadence off for every date the table does not list. Should a missing session fall back to the cadence instead?
