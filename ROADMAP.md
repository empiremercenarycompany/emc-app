# Roadmap

What is already in the app is described in the README. This file is the later work, plus the decision that is still open.

## Future wishlist (post-MVP)

1. Achievements and badges that the squad can see.
2. Constitution logging for nutrition and sleep, awarding the Constitution pool.
3. The goal creation flow, with monthly periods and Mental awards.
4. The Week 6 martial class gate.
5. Milestone leveling (level 2 after the first 16 weeks, level 3 after the next 16). The first adventure's default length is those same 16 weeks, as 8 sessions. Leveling is still not automatic.
6. Session notes.
7. An offline queue for logs.
8. Push notifications.
9. Admin and Captain tools.
10. Lifting journal and workout templates. Design only, for review: `docs/design/lifting-journal.md`. Flagged exercises do not grant attribute points. The design leaves a hook for a later reward and does not define that reward.

Automatic attribute points during the first adventure are already in the app. There is no weekly workout cap. A staff grant RPC and a staff session-schedule RPC exist and have no screen; the rest of the admin and Captain tools are still this list.

## Open decisions

- Squad size is 5 or 6. John has not picked. The `squads.max_size` column still defaults to 6 and rejects a value above 6, and the squad screen placeholder says "4 / 6". Nothing counts members against either number yet. The cap stays as it is until that decision is made.
- The cohort anchor seeded in `program_settings` is `2026-10-05`. That is a placeholder until John sets the real first session date. With no `cohort_sessions` rows, session 1 starts that day and each window is 14 Denver days. The first adventure is 8 sessions. The 27-point build still stops a player who maxes every session at session 4.
- A published `cohort_sessions` row replaces that cadence for every date. A longer row is a three-parter and shares one cap. A date in no row is an off-week and earns 0, without closing later sessions. Whether a missing session should fall back to the cadence instead is still open.
- Staff grants and the session schedule accept guild roles `admin`, `curator`, `dm`, and `captain`. Whether that list is right, and whether the staff member must share the character's guild, is still open.
