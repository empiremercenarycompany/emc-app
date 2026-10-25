# Empire Mercenary Company

Flutter companion app (`emc_app`) for the Empire Mercenary Company. It replaces a paper fitness and tabletop journal set in the port city of Bleakspire.

Riverpod, go_router, and Hive on the client. Supabase Postgres, Auth (Discord, Google, and email), Storage, and row level security on the backend. No secrets belong in git. The Supabase URL and anon key come from `--dart-define` or a gitignored defines file.

`HANDOFF.md` is the previous developer's status note. This README is the current setup guide. The next-priority features listed there (workout point awards, goal creation, Week 6 class selection, session notes, empty states, offline queue) are not implemented yet.

## Structure

```
lib/
├── core/           # Theme, constants, utilities
├── features/       # Auth, character, barracks, missions, workout, journal
├── models/         # Shared data models
├── services/       # Supabase access
├── shared/         # Shell and other cross-feature widgets
└── widgets/        # Reusable UI components
supabase/migrations/  # Ordered schema
```

## Brand

- Iron Black `#111111`
- Mercenary Red `#b11217`
- Parchment White `#f4f1e8`
- Steel Gray `#5a5a5a`
- Weathered Bronze `#8a6a3b`
- Headings: Corleone (not bundled; see Fonts)
- Body: League Spartan

## Prerequisites

- Flutter 3.47.x (stable) and Dart 3.13 or newer. The SDK constraint is `>=3.5.0 <4.0.0`.
- A Supabase project, or the [Supabase CLI](https://supabase.com/docs/guides/local-development) with Docker for a local stack.
- iOS builds need Xcode on macOS. This repo can generate the iOS project on Linux, but it cannot compile it there.

## Environment

The app reads `SUPABASE_URL` and `SUPABASE_ANON_KEY` through `String.fromEnvironment`. Placeholder defaults in `lib/core/config/supabase_config.dart` let the project compile. They are not a real project.

Copy `dart_defines.example.json` to `dart_defines.json` (gitignored) and fill in the project URL and the anon (publishable) key from the Supabase dashboard. `.env.example` lists the same keys if you keep them in an env file.

```bash
cp dart_defines.example.json dart_defines.json
```

Enable the Email, Discord, and Google providers in Authentication. Add this mobile redirect URL in the Supabase Auth settings:

```text
io.supabase.emc://login-callback/
```

Android registers that scheme and host in `android/app/src/main/AndroidManifest.xml`. iOS registers the scheme in `ios/Runner/Info.plist`. On web, OAuth returns to the current origin, so add that origin (for example `http://localhost:8080`) to the project's redirect allow list. `supabase/config.toml` already allows the mobile scheme and common local web origins for `supabase start`.

## Run

```bash
flutter pub get
flutter run --dart-define-from-file=dart_defines.json
```

Individual defines work the same way:

```bash
flutter run \
  --dart-define=SUPABASE_URL=https://your-project.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=your-anon-key
```

Web:

```bash
flutter run -d web-server --dart-define-from-file=dart_defines.json
flutter build web --dart-define-from-file=dart_defines.json
```

Android and iOS use the same defines. Release builds need a real URL and key or auth calls will hit the placeholder host.

## Migrations

Migrations live in `supabase/migrations/` and use 14-digit timestamps so `supabase db reset` applies them in order:

1. `20261019000000_complete_schema.sql` — tables, RLS, point-award function, auth profile trigger
2. `20261019000100_storage_setup.sql` — portrait, banner, and attachment buckets
3. `20261019000200_create_character_function.sql` — `create_character` starting-array check
4. `20261025000000_attribute_pools.sql` — Physical, Constitution, and Mental pools, spend RPC, workout award

`20261019_initial_schema.sql` was removed. It was an earlier draft of the same schema: tables without `IF NOT EXISTS`, the squad foreign key added in a second step, unnamed indexes, no `session_notes`, and RLS policies under different names. `complete_schema` already contains that model. Running the draft first and the complete file second would install two permissive policies on the same tables (Postgres ORs them). The handoff's apply list also skipped the draft.

Local reset (Docker required):

```bash
supabase start
supabase db reset
```

`supabase db reset` rebuilds the local database and runs every file in `supabase/migrations/` in timestamp order. There is no seed file. Hosted projects can use `supabase db push` after `supabase link`, or paste the four files into the SQL editor in the order above.

The profile trigger copies `auth.users` into `public.users` on signup. `characters.user_id` references that profile table, so character creation depends on it.

## Fonts

League Spartan (SIL Open Font License) is in `assets/fonts/`. The files are static Regular and Bold instances of the upstream variable font. The license is `assets/fonts/OFL.txt`.

Corleone is not freely licensed, so it is not in the repo. Its `pubspec.yaml` entry is commented out with a TODO. `AppFonts.heading` still asks for the Corleone family, and Flutter uses the platform font until those files are added and the pubspec entry is restored.

`assets/images/` and `assets/icons/` are empty on purpose. Each contains a `.gitkeep` so the asset directories in `pubspec.yaml` resolve.

## Tests

```bash
flutter analyze
flutter test
```

Unit tests cover the 5.5e point-buy table, the starting array, the three point pools, and the workout award cap. GitHub Actions (`.github/workflows/flutter.yml`) runs analyze and test on Flutter 3.47.8.

## Locked rules encoded today

- Starting array: four 8s, one 10, and one 9, or three 8s and three 9s. The creator offers two presets. The SQL function accepts every placement.
- Point-buy costs: 8:0, 9:1, 10:2, 11:3, 12:4, 13:5, 14:7, 15:9. Scores and pool balances change only through `spend_attribute_points` and `award_attribute_points`.
- Three pools: Physical (Strength, Dexterity) from workouts, Constitution from nutrition and sleep, Mental (Intelligence, Wisdom, Charisma) from SMART goals. A pool spends only on its own abilities. Refunds return to that same pool.
- Workout award numbers are placeholders until John sets them: 1 Physical point per log, at most 5 awarded logs per ISO week (Monday–Sunday, UTC), and +1 on the 3rd awarded log that week. The same log cannot be awarded twice. A full week stops further awards and does not take points back. See `lib/core/utils/workout_awards.dart` and `workout_award_config()`.
- Goals can store a monthly period (`period_start`, `period_end` inside one calendar month) so Mental and Constitution awards can attach later. The goal creation flow is not built.
- New characters are level 1, rank Recruit, with no class.
- `award_attribute_points` rejects a negative total.
- Squad `max_size` defaults to 6 and cannot be set above 6.

Week gates, milestone level-ups, martial-class limits, and a hard count of squad members are not enforced in the database yet. See the import report for the gaps between the Dart client, the SQL, and `HANDOFF.md`.
