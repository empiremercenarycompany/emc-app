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
- Table Muster for in-person attendance, and a temporary buff menu instead of a permanent grant.

## Later

1. Achievements and badges the squad can see. The tables exist. Nothing awards them.
2. A dedicated nutrition and sleep logger. Constitution goals already feed that pool.
3. Spell reskins. The class list is enabled and the spell tables are empty until John approves each one.
4. V2. Clearance and depth unlock text. The thresholds exist. The words stay empty.
5. V2. A lore wiki. Do not invent entries here.
6. V3. Officer chat personas, not built: Valthar for speeches, David the gnome druid chef for nutrition, Jadross the Goliath barbarian for workouts, and Gorbon, his fighter brother. The hook is a persona id on a future message. No bot is assigned.
7. Ranks stay placeholders: Recruit, Sergeant, Captain.
8. A shared notebook players can read. Staff-only notes are already on `/notes`.
9. An offline queue for logs. The service worker caches the shell and does not store a log.
10. Push notifications.
11. Portrait upload. The portrait column exists. No upload function is wired.
12. A world-state editor. Players would only see published rows.
13. Whatever a flagged exercise's reward hook pays. The hook stores text and grants no attribute points.

## Still open

- Whether a missing session, once any `cohort_sessions` row exists, should fall back to the cadence. Today it does not. A gap does not block the weekly bank.
- A curator or approver may approve a log. A Captain rank is not a role. In-game recognition is a temporary buff.
