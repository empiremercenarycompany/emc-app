# Empire Mercenary Company — Developer Handoff

**Version**: 1.0  
**Date**: 2026-10-25  
**Status**: Phase 1 architecture complete. Core Flutter + Supabase skeleton built.

---

## Brand Core

**Mission**  
Build discipline, consistency, and personal strength through a narrative-driven training experience.

**Voice**  
Disciplined. Grounded. Mission-driven.  
Short sentences. Active voice. Direct commands.  
Sounds like orders from a seasoned mercenary captain.

**Motto**  
Build Your Legend. Become the Hero.  
Train. Record. Advance.

**Colors**  
- Iron Black `#111111`  
- Mercenary Red `#b11217`  
- Parchment White `#f4f1e8`  
- Steel Gray `#5a5a5a`  
- Weathered Bronze `#8a6a3b`

**Fonts**  
- Headings: Corleone  
- Body: League Spartan

**Setting**  
Low-magic frontier port city of Bleakspire on a mostly forgotten island. The Company liberated the city and now recruits townsfolk.

---

## Core Mechanics (Locked)

- **Starting Array**: All 8s + one 10 and one 9, or three 9s.
- **Point Buy**: Standard D&D 5.5e costs. Points earned from workouts and goals.
- **Class**: None until Week 6. Martial classes only.
- **Progression**: Milestone. Level 2 after first 16 weeks. Level 3 after second 16 weeks.
- **Attributes**:
  - STR / DEX → workouts
  - CON → nutrition / sleep / meal prep
  - INT / WIS / CHA → SMART goals (categories locked)
- **Squads**: Max 6. One per recruit.
- **Sessions**: Every other week. Two-part monthly adventures. Attendance = loot share.
- **Accountability**: Self-report + group check during episodes. No punitive loss of progress.

---

## Tech Stack

- **Frontend**: Flutter (Riverpod, GoRouter)
- **Backend**: Supabase (Postgres, Auth, Storage, Realtime)
- **Auth**: Discord, Google, Email
- **Local**: Hive (offline-ready structure in place)

---

## Current Project State

### Implemented
- Full project structure
- Brand theme
- Auth screens (OAuth + Email)
- Character creation view (array selection, portrait, form)
- Character sheet view
- Character edit screen with point-buy costs
- Barracks, Missions, Workout Log, Goals, Journal, Announcements, Calendar, Squad, Session Check-In screens
- Bottom navigation shell
- Supabase service layer
- Character creation RPC with validation
- Attribute point award function
- Storage buckets for portraits, banners, attachments
- RLS policies

### Not Yet Implemented
- Real workout logging with point awards
- Goal creation UI
- Class selection flow (Week 6)
- Session notes persistence
- Full mission progress tracking
- Offline sync
- Push notifications
- Admin / Captain tools

---

## Database

Apply migrations in order from `supabase/migrations/`:

1. `20261019_complete_schema.sql`
2. `20261019_storage_setup.sql`
3. `20261019_create_character_function.sql`

Key function: `create_character(...)` — validates starting array and prevents duplicates.

---

## How to Run

```bash
cd emc_app
flutter pub get
flutter run \
  --dart-define=SUPABASE_URL=https://your-project.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=your-anon-key
```

Enable Discord, Google, and Email providers in Supabase.  
Set OAuth redirect: `io.supabase.emc://login-callback/`

---

## Next Priorities

1. Wire workout logging to award attribute points.
2. Build goal creation + completion flow.
3. Add class selection screen (gated to Week 6).
4. Persist session notes.
5. Add pull-to-refresh and empty states across remaining screens.
6. Implement basic offline queue for logs.

---

## Files of Interest

- `lib/services/supabase_service.dart` — all data access
- `lib/features/character/` — creation, sheet, edit
- `lib/app.dart` — router and redirects
- `supabase/migrations/` — full schema

Hand this archive and this document to the next developer.  
The system is ready for feature completion.
