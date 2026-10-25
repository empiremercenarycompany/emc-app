# Lifting journal

Built in this Next.js app. The award windows (`cohort_sessions` and the first-adventure caps) are the same company rules as the rest of the book. A curator approves exercises. A player drags approved exercises into one workout, reorders them, and records sets. During the first adventure that one log can earn Physical points inside the exercise cap. A flagged exercise is a hook for a later reward. It does not pay attribute points.

The curator is the `curator` value of `profiles.app_role`. The role is not a person's name. A Captain rank does not become a curator unless a DM sets the role.

## Menu

`exercises` holds `name`, `focus` (`strength`, `dexterity`, `functional`), `cues`, and `status` (`approved` or `retired`). `curator_save_exercise` writes it. A retired exercise stays on old sessions and cannot be added to a new workout.

`exercise_pools` is a menu, not an order. `shared` puts the pool on every member's builder. TODO(John): confirm that a shared pool is company-wide. Otherwise a player needs a template assignment, or a workout they already saved on that pool. `player_can_use_pool` enforces that.

## Templates and the player's workout

`workout_templates` and `workout_template_exercises` are the curator's order, with target sets, reps, and weight. `assign_template` ends the previous assignment.

`save_player_workout` replaces the character's current workout. Save does not write a session and does not award points. The server rejects an exercise that is not approved or not in the pool.

## Builder

Two columns. On a narrow screen the menu is above the workout.

- Approved: name, focus, and a flag marker when one exists. The marker is not a point value. Tap or drag to add.
- Your workout: drag a row to reorder, or use Up and Down. Dropping a menu card on a row swaps the exercise and keeps the targets. Remove drops the row.
- Save workout, Clear, then Record Work.

## The log

`log_lifting_session` writes one `workout_logs` row (`award_track` `lifting`) and one `lifting_sessions` row plus `lifting_sets`. Sets do not award points. The session can take at most one exercise award, using `points_per_lifting_session` (default 1), still inside the 3-point exercise cap and the 27-point build.

`share_with_squad` defaults from `share_lifting_default` (true). Squadmates read a shared session and its sets, including personal records. A private session stays with the owner and staff. Turning the toggle off does not remove points.

A set is a personal record when its weight is higher than every earlier set of that exercise for that character. Deleting a heavier set does not go back and mark an older set.

After the first adventure the same save still writes the journal and awards 0 automatic points.

## Flags

`set_exercise_flag` stores an optional `reward_hook`, an optional goal, and an optional period. TODO(John): the hook's reward is not defined. Unflagging does not change points already earned.

## Difference from the earlier design note

The Flutter design named `record_workout` and a `2026-10-05` anchor, and it listed `captain` as a staff role. This rebuild uses `log_lifting_session`, the `2027-01-04` placeholder, and staff roles `dm`, `admin`, and `curator`. Goal completions elsewhere in the app use the same backfill window as workouts. That backfill is config, and it is still John's to confirm.
