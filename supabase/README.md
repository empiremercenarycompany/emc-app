# Empire Mercenary Company — Backend Schema

Supabase PostgreSQL schema for the digital headquarters.

## Migrations

Apply these in order. The filenames are 14-digit timestamps so `supabase db reset` sorts them correctly:

1. `migrations/20261019000000_complete_schema.sql`
2. `migrations/20261019000100_storage_setup.sql`
3. `migrations/20261019000200_create_character_function.sql`
4. `migrations/20261025000000_attribute_pools.sql`

The earlier `20261019_initial_schema.sql` draft was removed. `complete_schema` replaces it and adds `session_notes`, named indexes, and the auth profile trigger. See the root README for why both files cannot be applied together.

## Core Entities

- **users** — Auth profiles (Discord / Google / Email), filled by `handle_new_user`
- **guilds** — Companies
- **characters** — One per user. Class null until Week 6. Point-buy attributes.
- **squads** — `max_size` defaults to 6 and is checked at 6 or below. One `squad_id` per character.
- **guild_memberships** — Rank and membership
- **attribute_point_ledger** — Immutable point awards
- **workout_logs** — Strength / Dexterity / functional work
- **goals** / **goal_logs** — INT / WIS / CHA / CON categories. A goal may store `period_start` and `period_end` inside one calendar month. The creation flow is not built yet.
- **missions** / **objectives** — Contracts and company assignments
- **sessions** / **session_attendance** / **session_notes** — Two-part episodes. Attendance grants loot share.
- **program_settings** — Singleton cohort anchor (`cohort_start`), used when no session schedule is published.
- **cohort_sessions** — Optional staff schedule of award windows (`session_number`, inclusive `start_date`, inclusive `end_date`). Empty means the 14-day cadence.
- **announcements**, **achievements**, **calendar_events**

## Progression Rules Encoded

- Standard 5.5e point-buy costs, enforced by `spend_attribute_points`
- Three pools. Automatic awards run only during the first adventure: 8 sessions, 3 exercise points and 3 goal points per session, stopping at a 27-point build. That total binds first. Four maxed sessions complete the build; sessions 5 through 8 remain for a slower pace. With no `cohort_sessions` rows, windows are 14 Denver days from `program_settings.cohort_start` (placeholder `2026-10-05`). A published row replaces that cadence. A longer row is a three-parter. A gap is an off-week and earns 0. The clock is `America/Denver`. Older than 14 days earns 0. Future dates are rejected. Staff grants use `grant_staff_attribute_points`, require a reason, and may pass 27. Staff edit the schedule with `set_cohort_session`. Nothing removes points.
- `award_attribute_points` refuses a non-positive amount
- Milestone leveling is not automated (no week counter, no level-up trigger)
- Class selection is not gated in SQL
- Squad size is an open decision (5 or 6). `max_size` still defaults to 6 and cannot exceed 6. There is no member-count trigger.

## Security

Row level security is enabled on the user-facing tables that the client writes. Owners manage their character, workouts, goals, and goal logs. Guild members can read shared missions and sessions. `create_character` and `award_attribute_points` are security definer and granted to `authenticated` only.

## Local stack

```bash
supabase start
supabase db reset
```

Docker is required. Redirect URLs, including `io.supabase.emc://login-callback/`, are listed in `config.toml`.
