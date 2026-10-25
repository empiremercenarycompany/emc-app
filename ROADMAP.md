# Roadmap

What is already in the app is described in the README. This file is the later work, plus decisions that are still open. The full list of placeholders is `docs/OPEN_QUESTIONS.md`.

## In this rebuild

- Magic-link sign-in, one character, living sheet, ledger, Barracks, dice.
- Workout library with three equipment versions and the STR movement check.
- Prescribed and custom logs, goals, three pools, squads, group goals, and `log_activity`.
- Lifting journal: curator exercises and pools, player drag-and-drop, session log, squad visibility, personal records.
- Staff windows, grants, induction at the configured week, and milestone levels with an audit trail. Leveling is not automatic.
- Table sessions on the Denver calendar, check-in, attendance with a loot placeholder, company and squad announcements, and staff-only notes.

## Later

1. Achievements and badges the squad can see. The tables exist. Nothing awards them.
2. A dedicated nutrition and sleep logger. Constitution goals already feed that pool.
3. Enabling the martial class rows John chooses. The week-6 gate is already in `induct_character`.
4. Whatever attendance and a group goal pay. The placeholders are stored and grant nothing.
5. A shared notebook players can read. Staff-only notes are already on `/notes`.
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
