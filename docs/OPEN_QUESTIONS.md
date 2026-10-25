# Open questions

John has the final say. Each line is the placeholder this build uses until he changes the config or writes the rule. Do not treat a placeholder as decided.

## Points and scoring

- Lifetime cap. Placeholder: the 27-point build, counting the starting array's 3. Staff grants may pass it and do not remove points. `point_buy_budget`.
- Points per prescribed workout, custom workout, lifting session, and goal. Placeholder: 1 each. `points_per_prescribed_workout`, `points_per_custom_workout`, `points_per_lifting_session`, `points_per_goal`.
- Session caps. Placeholder: 3 exercise and 3 goal points, first adventure only, 8 sessions. Workouts, including lifting, share the exercise cap. Goals use the goal cap.
- Custom versus prescribed. Placeholder: the same unit. TODO(John).
- STR drills. Publishing a STR drill requires overhead press, carry, horizontal push, horizontal pull, and a leg movement. The points still go to the Physical pool, not to Strength alone.
- Scores above 15. Placeholder: spends stop where `point_buy_costs` stops (15). Columns allow 20 so a later cost can be inserted. TODO(John).
- Starting 10. Placeholder: it is already paid, so 10 to 11 costs 1. The starting array can be refunded the same way. TODO(John) if those starting points should be locked.
- Goal backfill. Placeholder: the same 14 days as workouts, counted on the completion date, once per goal log. TODO(John). The earlier app counted a goal once and used "today".

## Approval and who can see logs

- Approval. Placeholder: a log awards immediately (`award_requires_approval` false). Flip the flag and logs wait for `approve_log`. TODO(John): whether points need staff approval.
- Who may grant or approve. Placeholder: `dm`, `admin`, and `curator`, and only inside the character's company. A Captain rank is not included. TODO(John).
- Workout log readers. Placeholder: owner plus staff in the same company (`log_visibility` `staff`). `owner`, `squad`, and `company` exist. TODO(John).

## Squads and the table

- Squad size. Placeholder: 6, from `squad_max_size`. Marketing said 5. TODO(John).
- Who assigns squads. Placeholder: a DM or an admin, through `assign_squad`.
- Group-goal rewards. Placeholder: `group_goal_payout` is the text `unset`. A barracks mission tracks progress and does not award attribute points. TODO(John): points, loot, a world change, or something else.
- Attendance loot. Placeholder: `attendance_loot` is the text `unset`. Check-in copies it onto the attendance row and grants nothing. The loot flag can be corrected by the DM. TODO(John): what attendance pays.
- Monthly world changes. Placeholder: `world_state` stores a summary. There is no editor yet. TODO(John).
- Loot share. Placeholder: the attendance flag is stored and grants nothing. TODO(John).
- Schedule gaps. Placeholder: if `cohort_sessions` has any row, a date in no row earns 0 and does not use the 14-day cadence. TODO(John) if a missing number should fall back instead.
- Cohort start. Placeholder: `2027-01-04`, the first Monday of January 2027. TODO(John): the real first session.

## Character

- Pre-induction level, hit points, and armor. Placeholder: level 1, class reads "Not yet inducted", combat numbers are not calculated. TODO(John).
- Induction classes. Placeholder: fighter, barbarian, monk, and rogue, every row disabled. Induction opens at company week 6 (`induction_week`). A DM can record it with no class. A disabled class is refused. TODO(John): which martial classes unlock, and whether a spellbook is in play. The spell tables are empty.
- Milestone weeks. Placeholder: staff may record level 2 from week 16 and level 3 from week 32, one step at a time, with an audit row. Nothing levels by itself. TODO(John): whether those weeks mean the first day of that week or the day after it ends. The first session date is still the cohort placeholder `2027-01-04`.
- Origin word. Placeholder: required text, not mapped to a feat. TODO(John). TODO(lore: check with Sage/Master Canon) before any list of words is added.
- Species. Placeholder: the SRD 5.2 name list in `content_species`. No rules text. TODO(John) if that list should shrink.
- Levels after 3. Placeholder: not built. Level 2 and 3 are reminders in config. A DM sets the level. Nothing levels by itself. TODO(John): which long-term goals qualify.
- Veteran tier. Placeholder: closed while `veteran_tier_start_week` is null. TODO(John).
- Skill labels. Placeholder: the eighteen SRD names, display name included. The Religion label stays Religion until renamed in `skill_labels`. TODO(John).
- Ranks. Placeholder: Recruit, Sergeant, Captain. How one is earned is open. TODO(John).
- One character per user. Placeholder: the server rejects a second. TODO(John) if a second character should exist.

## Product

- Sign-in. Placeholder: magic link only. Discord and Google are not wired. TODO(John) if they should return.
- One company. Placeholder: signup joins the seeded company (`single_guild`). TODO(John).
- Corleone. Placeholder: not bundled. Headings use League Spartan. TODO(John): the web license.
- Bleakspire. The name is used. No description is written. TODO(lore: check with Sage/Master Canon). One table label for the place is not confirmed and is not used in the app.
- Lifting menu. Placeholder: a shared pool, or a pool on an assigned template, or a pool the player already saved. TODO(John).
- Flag reward. Placeholder: `reward_hook` text only. TODO(John).
- Offline logs, push notifications, portraits, and achievements. Not built. See `ROADMAP.md`.
