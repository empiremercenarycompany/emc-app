# Empire Mercenary Company

## Supabase Setup

1. Create a Supabase project, or start a local stack with Docker:

   ```bash
   supabase start
   supabase db reset
   ```

   `db reset` applies `supabase/migrations/` in timestamp order:

   1. `20261019000000_complete_schema.sql`
   2. `20261019000100_storage_setup.sql`
   3. `20261019000200_create_character_function.sql`
   4. `20261025000000_attribute_pools.sql`

   Hosted projects can use `supabase db push` after linking, or paste those files into the SQL editor in that order.

2. Enable providers in Authentication → Providers:
   - Email
   - Discord
   - Google

3. Set the mobile OAuth redirect:

   ```text
   io.supabase.emc://login-callback/
   ```

   For Flutter web, also allow the origin you run, such as `http://localhost:8080`.

4. Copy `dart_defines.example.json` to `dart_defines.json` and run:

   ```bash
   flutter run --dart-define-from-file=dart_defines.json
   ```

   Or pass the values directly:

   ```bash
   flutter run \
     --dart-define=SUPABASE_URL=https://your-project.supabase.co \
     --dart-define=SUPABASE_ANON_KEY=your-anon-key
   ```

## Client Access

Use `SupabaseService.client` or the Riverpod providers.
Auth state is available via `authStateProvider`.
