# Empire Mercenary Company

Companion app for the company: a Next.js PWA that talks to Supabase. Players sign in with a magic link, take a recruit oath, record work and goals, and spend three point pools. The database decides the points. The screen shows what the server returned.

This repository is public. Do not commit keys, service-role secrets, or a hosted project URL that is private to you. `.env.example` holds placeholders only.

The Flutter app on the other pull requests is reference material. Leave those branches and pull requests alone.

## What you need

- Node.js 22
- A Supabase project, or the Supabase CLI with Docker, when you want the app itself
- Postgres 16, for the SQL tests, if you are not using the CLI

There is no public deploy in this repo and no paid service.

## Environment

```bash
cp .env.example .env.local
```

Set:

- `NEXT_PUBLIC_SUPABASE_URL` — project URL, or `http://127.0.0.1:54321` for the local CLI
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the anon key only

The app never reads a service-role key. Leave it out.

Without those two values the shell, dice roller, and About page still open. Sign-in and the company book stay closed.

## Run the app

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:3000`. Sign-in emails a link to `/auth/callback`.

With the Supabase CLI, local mail is captured by Inbucket (the CLI prints the port, often 54324). Open the message there. Nothing is sent to a real inbox unless you configure SMTP yourself, and this repo does not.

## Migrations

SQL lives in `supabase/migrations`, in filename order. A fresh Supabase project applies them with:

```bash
npx supabase db push
```

Local CLI:

```bash
npx supabase start
npx supabase db reset
```

`supabase/config.toml` points the site at `http://127.0.0.1:3000` and allows `http://localhost:3000`. Magic link is the email provider. Confirmations are off for local mail so the link signs you in. Signup still creates a profile and a membership in the seeded company through `handle_new_user`.

The SQL tests do not need Docker. They rebuild a database named `emc_test`:

```bash
npm run test:rls
```

That script refuses a `DATABASE_URL` on `supabase.co` or `supabase.com`. Against CI or another local Postgres:

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5432/emc_test npm run test:rls
```

## Make yourself the DM

The signup trigger creates a player. After your first magic-link sign-in, promote that profile from the Supabase SQL editor (or `psql`). Replace the email.

```sql
update public.profiles
set app_role = 'dm'
where email = 'you@example.com';
```

Roles are `player`, `dm`, `admin`, and `curator`. A Captain is an in-fiction rank, not a role. Only a DM can change roles, from the Schedule page, and the function will not remove the last DM.

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run test:rls
npm run build
npm run test:e2e
```

`npm test` is the rules engine (Vitest). `test:e2e` is Playwright against the shell and does not need Supabase keys. GitHub Actions runs the same list.

## Award rules, as configured

Numbers live in `scoring_config`, not in the pages. The seed is a placeholder John can change:

- Time zone `America/Denver`
- Cohort start `2027-01-04` until the real first session is set
- First adventure: 8 sessions, 3 exercise points and 3 goal points each, stop at 27 or after session 8
- Physical from workouts, Constitution from constitution goals, Mental from intelligence, wisdom, and charisma goals
- 14-day backfill, no future dates, no clawback
- Staff grants require a reason and may pass 27
- Empty `cohort_sessions` uses a 14-day cadence. One published window turns that cadence off for dates the table does not list

Open items are in `docs/OPEN_QUESTIONS.md` and in `config_notes` (staff can read them on Schedule).

## Supabase project, for John

1. Create a free project. Do not paste the service-role key into this repo or into chat.
2. In Authentication, enable email magic link. Add redirect URLs `http://127.0.0.1:3000/auth/callback` and `http://localhost:3000/auth/callback`, plus the same paths on whatever origin you actually use.
3. Apply `supabase/migrations` in order (`supabase db push`, or the SQL editor, one file at a time).
4. Put the project URL and anon key in `.env.local`.
5. Sign in once, then run the DM update above.
6. Confirm the cohort date before anyone logs work they expect to score. Until then, logs before `2027-01-04` save and award nothing.
