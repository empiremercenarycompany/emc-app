# Empire Mercenary Company — Backend Schema

Supabase PostgreSQL schema for the digital headquarters.

## Migrations

Apply these in order. The filenames are 14-digit timestamps so `supabase db reset` sorts them correctly:

1. `migrations/20261019000000_complete_schema.sql`
2. `migrations/20261019000100_storage_setup.sql`
3. `migrations/20261019000200_create_character_function.sql`

The earlier `20261019_initial_schema.sql` draft was removed. `complete_schema` replaces it and adds `session_notes`, named indexes, and the auth profile trigger. See the root README for why both files cannot be applied together.

## Core Entities

- **users** — Auth profiles (Discord / Google / Email), filled by `handle_new_user`
- **guilds** — Companies
- **characters** — One per user. Class null until Week 6. Point-buy attributes.
- **squads** — `max_size` defaults to 6 and is checked at 6 or below. One `squad_id` per character.
- **guild_memberships** — Rank and membership
- **attribute_point_ledger** — Immutable point awards
- **workout_logs** — Strength / Dexterity / functional work
- **goals** / **goal_logs** — INT / WIS / CHA / CON categories
- **missions** / **objectives** — Contracts and company assignments
- **sessions** / **session_attendance** / **session_notes** — Two-part episodes. Attendance grants loot share.
- **announcements**, **achievements**, **calendar_events**

## Progression Rules Encoded

- Standard 5.5e point-buy costs (enforced in the application layer)
- Attribute points earned from workouts and goals
- `award_attribute_points` refuses a negative amount
- Milestone leveling is not automated (no week counter, no level-up trigger)
- Class selection is not gated in SQL
- Squad size cap is the `max_size` column, not a member-count trigger

## Security

Row level security is enabled on the user-facing tables that the client writes. Owners manage their character, workouts, goals, and goal logs. Guild members can read shared missions and sessions. `create_character` and `award_attribute_points` are security definer and granted to `authenticated` only.

## Local stack

```bash
supabase start
supabase db reset
```

Docker is required. Redirect URLs, including `io.supabase.emc://login-callback/`, are listed in `config.toml`.
