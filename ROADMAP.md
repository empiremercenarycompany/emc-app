# Roadmap

What is already in the app is described in the README. This file is the later work, plus decisions that are still open. The full list of placeholders is `docs/OPEN_QUESTIONS.md`.

## In this rebuild

- Magic-link sign-in, one character, living sheet, ledger, Barracks, dice.
- Workout library with three equipment versions and the STR movement check.
- Prescribed and custom logs, goals, three pools, squads, group goals, and `log_activity`.
- Lifting journal: curator exercises and pools, player drag-and-drop, session log, squad visibility, personal records.
- Staff windows, grants, induction, and level. Leveling is not automatic.

## Later

1. Achievements and badges the squad can see. The tables exist. Nothing awards them.
2. A dedicated nutrition and sleep logger. Constitution goals already feed that pool.
3. The Week 6 class list, once John enables rows in `induction_classes`.
4. Milestone leveling as a DM action with a reminder, still not an automatic write. Level 2 after adventure 1 and level 3 after adventure 2 are config values only.
5. Session notes and a campaign notebook.
6. An offline queue for logs. The service worker caches the shell and does not store a log.
7. Push notifications.
8. Portrait upload. The portrait column exists. No upload function is wired.
9. A world-state editor. Players would only see published rows.
10. Whatever a flagged exercise's reward hook pays. The hook stores text and grants no attribute points.

## Still open

- Squad size is 5 or 6. Config default is 6.
- Cohort start `2027-01-04` is a placeholder for January 2027, the first Monday of that month.
- Whether a missing session, once any `cohort_sessions` row exists, should fall back to the cadence. Today it does not. A gap earns 0 and does not end the adventure.
- Staff who may grant points are `dm`, `admin`, and `curator`, and they must share the character's company. A Captain rank is not a role.
