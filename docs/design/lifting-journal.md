# Lifting journal — design proposal

For John to review. This is not built. No tables or screens from this document are in the app.

A curator approves the exercises that can appear in a workout. Trainers build templates from that library. A player drags approved exercises into their own workout, reorders them, and swaps them. Logging the session records the actual sets and, once, can award Physical points under the existing weekly rule. Some approved exercises also pay a separate bonus because they are part of the month's group goal or tied to that player's own goal.

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

- Left column, "Approved". The exercises in the player's current pool. Grouped by focus, with a search field. A card shows the name, the focus, and a bonus chip when this exercise pays a bonus for this player this month. Retired exercises and exercises outside the pool are absent. Dragging starts from a card.
- Right column, "Your workout". An ordered list with a drag handle on each row. Dropping on the list inserts at that index. Dropping onto an existing row swaps that row for the new exercise and keeps the target sets, reps, and weight already on the row. Dragging a row by its handle reorders it. Each row has a remove control and fields for target sets, reps, and weight, filled from the template when the row was copied.
- Buttons: "Start from assigned template" (asks before replacing the list), "Save workout", "Clear".
- Save writes `player_workouts` and `player_workout_exercises` only. It does not write a session and does not award points.
- The server rejects a save that includes an exercise that is not approved or not in the pool. The drag sources are limited so a normal drag cannot do that.

## Tables for the log

`lifting_sessions`

- `id`, `character_id`, `player_workout_id` (null when logging the template unchanged), `template_id`, `workout_log_id`, `date`, `notes`, `share_with_squad`, `points_awarded`, `bonus_points_awarded`, `created_at`
- `date` is the company-zone calendar date passed to `record_workout`.
- `points_awarded` is the base Physical award from that one workout log. `bonus_points_awarded` is the sum of bonus points granted for this session. Squadmates can read those numbers without reading the point ledger.

`lifting_sets`

- `id`, `session_id`, `exercise_id`, `set_number`, `reps`, `weight`, `notes`, `is_pr`
- What the player actually lifted. Several sets belong to one session. The exercise is a library id, not free text.

`session_exercise_bonuses`

- `id`, `session_id`, `exercise_id`, `pool`, `points_awarded`, `reason` (`group_goal` or `player_goal`), `goal_id`
- One row per exercise per session per pool. The ledger's `source_id` points here, so a second save of the same session finds the row and awards nothing more.

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
- Bonus flags are written by a curator. A player can read the flags that apply to them. A player cannot mark an exercise as a bonus.

## Base Physical award

Saving a session calls `record_workout` once. That writes one `workout_logs` row and runs the weekly award rule. The session stores that log's id.

The date is America/Denver. The award counts against the week the workout happened, including a late log inside the 14-day window. A future date is rejected and nothing is saved. An older date is saved, on the workout log and the session, with `points_awarded` 0. Saving the same session again does not award the base points twice.

Sets do not award the base points. Five sets are one log. The weekly cap counts awarded logs, not sets.

## Bonus exercises

A bonus is extra points for including a flagged exercise in a session. It is not a second workout log, and it does not change points already granted.

### How an exercise gets flagged

Two flags, both set by a curator. The player does not flip either one.

Monthly group goal. `monthly_exercise_bonuses` rows: `guild_id`, `exercise_id`, `period_start`, `period_end`, `pool`, `created_by`. The period is one calendar month, the same shape as `goals.period_start` / `goals.period_end`. While the session date falls in that month, every player in the guild who logs that exercise is eligible. This is the month's group goal.

A player's own goal. `goal_exercise_links` rows: `goal_id`, `exercise_id`. The goal already has a category and a monthly period. During that period, only that goal's character is eligible, and only for those exercises. The link is how a personal goal turns a lift into a bonus. Goal creation itself is still a later feature. Until it exists, a curator can attach the link to a goal row that is already in the database.

An exercise can carry both flags at once. See the calculation below.

### Placeholder numbers

These are not locked. When this is built they live in one config next to `WorkoutAwardRule` and `workout_award_config()`, and nowhere else.

| Setting | Placeholder |
| --- | --- |
| Points per flagged exercise in a session | **1** |
| Pool for a monthly group-goal bonus | **physical** |
| Bonus exercises that pay in one week | **3** |
| Bonuses count toward the workout-log cap | **no** |

The personal-goal bonus uses the goal's pool: Intelligence, Wisdom, or Charisma pays Mental; Constitution pays Constitution. A group-goal bonus uses the table above, so a group lifting goal pays Physical.

### Calculation

On save, after the base `record_workout` call, look at each distinct exercise in the session.

- Future dates never get here, because the session was rejected.
- If the date is older than the backfill window, the base award is 0 and every bonus is 0. The sets are kept. Nothing already earned is reduced.
- Otherwise each flagged exercise can pay, even when the base award is 0 because that week's workout-log cap is full. Bonus points sit outside that cap.
- The separate placeholder caps how many exercises pay a bonus in the company week: 3. A later flagged exercise that week is logged and its bonus is 0.
- The same exercise twice in one session pays once, not once per set.
- If the group flag and the player's goal both match and they pay the same pool, pay that pool once. If they pay different pools, pay each pool once. A Mental goal plus the group Physical flag on the same squat pays 1 Mental and 1 Physical.
- Each payment inserts `session_exercise_bonuses` and then one ledger row with source `exercise_bonus`. A second save finds that row and adds nothing.
- Amounts are never negative. Unflagging an exercise, ending a goal, or retiring an exercise does not delete a bonus already given.

## Personal records

A set is a personal record when its weight is greater than every earlier set for that character and that `exercise_id`. `is_pr` is set when the set is saved. Private sets count toward the player's own record. Deleting a heavier set does not go back and mark an older set as the record.

A shared session shows its PR sets on the squad board. A private session does not. A PR does not grant attribute points.

## Screens

- Library, curator only: add an exercise, approve it, retire it, build pools, flag this month's group-bonus exercises, attach exercises to a player's goal.
- Template editor, curator only: pick a pool, drag approved exercises into an order, set targets, assign the template to a player, end the assignment.
- Workout builder, the drag-and-drop screen above. The player only.
- Log a session: the date control from Log Work, the saved workout or the assigned template as the plan, rows for actual sets, reps, weight, and notes, bonus chips on flagged exercises, and the squad visibility toggle. Save creates the session, the sets, and the one workout log.
- My journal: past sessions, including ones that earned 0, with sets, bonuses, and PR marks.
- Squad board: shared sessions only, with the lifter, the date, the sets, bonuses, and PR marks.

## Decisions for John

1. Confirm the role string `curator`, and who may grant it. Should a Captain have the same rights without holding the role?
2. Is the menu the assigned pool only, or may a player drag any approved exercise in the guild?
3. May a curator lock a template so the player can reorder it but cannot swap in other exercises?
4. Squad visibility: default shared or private? Per session, as proposed, or one switch for the whole journal?
5. Should squadmates see every set, or only a summary and the PRs?
6. Is a personal record the heaviest weight, or should reps count (for example a best estimated one-rep max)?
7. Confirm one workout log, and therefore one base Physical award, per session rather than per set.
8. Confirm bonuses sit outside the weekly workout-log cap, with their own placeholder cap of 3 exercises a week.
9. Confirm the other placeholders: 1 point per flagged exercise, and Physical for a group-goal bonus.
10. When a group flag and a personal goal both match, is "once per pool" right, or should they stack in the same pool?
11. Should a personal-goal bonus follow the goal's pool (Mental or Constitution), or should every lift bonus stay Physical?
12. Confirm a log older than the 14-day window keeps the sets and pays neither the base award nor a bonus.
