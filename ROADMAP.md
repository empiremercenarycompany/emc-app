# Roadmap

What is already in the app is described in the README. This file is the later work, plus the decision that is still open.

## Future wishlist (post-MVP)

1. Achievements and badges that the squad can see.
2. Constitution logging for nutrition and sleep, awarding the Constitution pool.
3. The goal creation flow, with monthly periods and Mental awards.
4. The Week 6 martial class gate.
5. Milestone leveling (level 2 after the first 16 weeks, level 3 after the next 16).
6. Session notes.
7. An offline queue for logs.
8. Push notifications.
9. Admin and Captain tools.
10. Lifting journal and workout templates. Design only, for review: `docs/design/lifting-journal.md`.

## Open decisions

- Squad size is 5 or 6. John has not picked. The `squads.max_size` column still defaults to 6 and rejects a value above 6, and the squad screen placeholder says "4 / 6". Nothing counts members against either number yet. The cap stays as it is until that decision is made.
