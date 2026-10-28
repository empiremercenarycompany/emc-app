# Roadmap

What is already in the app is described in the README. This file is the later work, plus decisions that are still open. The full list of placeholders is `docs/OPEN_QUESTIONS.md`.

## In this rebuild

- Magic-link sign-in, one character, living sheet, ledger, Barracks, dice.
- Workout library with three equipment versions and the STR movement check.
- Prescribed and custom logs, goals, three pools, squads, group goals, and `log_activity`.
- Lifting journal: curator exercises and pools, player drag-and-drop, session log, squad visibility, personal records.
- Staff windows, grants, induction at the configured week, and milestone levels with an audit trail. Leveling is not automatic.
- Table sessions on the Mountain-time calendar, attendance that banks outside the weekly cap, company and squad announcements, and staff-only notes.
- Weekly check-in, Clearance and depth tiers, and a staff export. Discord copy is formatted and not sent.

## Later

1. Achievements and badges the squad can see. The tables exist. Nothing awards them.
2. A dedicated nutrition and sleep logger. Constitution goals already feed that pool.
3. Spell reskins. The class list is enabled and the spell tables are empty until John approves each one.
4. Officer NPC bot roles. Hooks only. No bot is assigned.
5. A shared notebook players can read. Staff-only notes are already on `/notes`.
6. An offline queue for logs. The service worker caches the shell and does not store a log.
7. Push notifications.
8. Portrait upload. The portrait column exists. No upload function is wired.
9. A world-state editor. Players would only see published rows.
10. Whatever a flagged exercise's reward hook pays. The hook stores text and grants no attribute points.

## Still open

- Squad size is 5 or 6. Config default is 6.
- Whether a missing session, once any `cohort_sessions` row exists, should fall back to the cadence. Today it does not. A gap does not block the weekly bank.
- A DM or admin grants an in-game bonus. A curator or approver may approve a log. A Captain rank is not a role.
