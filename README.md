# Empire Mercenary Company

Companion app for the company: a Next.js PWA that talks to Supabase. Players sign in with a magic link, take a recruit oath, record work and goals, and spend banks the server awards. Brand rules are in `docs/BRAND.md`. The 10/28 attribute rules and the weekly check-in are in `docs/OPEN_QUESTIONS.md`.

This repository is public. Do not commit keys, service-role secrets, or a hosted project URL that is private to you. `.env.example` holds placeholders only. Do not commit font files.

## Brand files

The marks in `public/brand/` are the approved v2 set:

- `emc_mark.png` — transparent helm and kettlebell. Header, sign-in, and About.
- `emc_app_icon.png` — the same mark on Iron Black, 1024. PWA icons, the apple touch icon, the favicon, and the splash are resizes of this file.
- `emc_badge_light.png` — full badge on parchment, for a light surface.

Nothing is recolored. The wide lockup is not used. Headings are live type.

Corleone is FontMesa's cut, licensed for web and app use, and never committed. Put `Corleone-Regular.woff2` (`font-family: Corleone`, mixed-case display) and `Corleone-Due-Regular.woff2` (`font-family: "Corleone Due"`, all-caps headings) in `public/fonts/corleone/` (gitignored). Both faces are weight 400. The display stack is `"Corleone Due", Corleone, "Barlow Condensed", sans-serif`. A missing file does not fail the build; headings then use Barlow Condensed 800. See `public/fonts/private/README.md`.

Body text is Barlow. Subheads, buttons, labels, and tabs are Barlow Condensed. Both load from Google Fonts. League Spartan is not used.

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

## Dev login

Password sign-in is for local play only. It appears when `NEXT_PUBLIC_DEV_LOGIN=1` and the host is `localhost` or `127.0.0.1`. Anywhere else the form is hidden and `POST /api/dev-login` returns 404. Magic link stays the real sign-in path. No mail is sent for a dev login.

The shared password is the dev-only constant `emc-dev-login`. It is not a production secret. Accounts use `@example.test` and character names only.

The roster lives in `supabase/seed/roster.json` (squads included). Swap that file, then regenerate the seed:

```bash
node scripts/render-test-seed.mjs
```

## Play locally

```bash
cp .env.example .env.local
```

Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_DEV_LOGIN=1`.

Apply the migrations, then the test accounts, on the database you mean to use. Do not run the seed from CI against a hosted project.

```bash
npx supabase db push
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/20261031120000_sheet_record.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/seed/test_accounts.sql
```

If `db push` already applied `20261031120000_sheet_record.sql`, skip that file. To remove the test accounts:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/seed/delete_test_accounts.sql
```

```bash
npm install
npm run dev -- -H 127.0.0.1
```

Open `http://127.0.0.1:3000/sign-in` and pick a test account:

- Alexandria, Aligher, David, Earl, Jadross, Valthar Brightlance
- DM (`dm@example.test`)
- Curator (`curator@example.test`, lore approver)

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
- Next adventure starts `2027-01-02`. Posters launch `2027-01-04`. Those are not the first session ever.
- Weekly bank: 4 earned, 2 from any one pool, attendance outside the cap, stop at 27. Logs wait for approval.
- Physical from workouts, Constitution from constitution goals, Mental from intelligence, wisdom, and charisma goals
- 14-day backfill, no future dates, no clawback
- Staff grants require a reason and may pass 27
- Empty `cohort_sessions` uses a 14-day cadence. One published window turns that cadence off for dates the table does not list

Schedule is one page: the company calendar, the session times, and the next session. `/calendar` redirects there. Table check-in, week-6 induction, and milestone levels are on that page too. Attendance loot and group-goal payouts are the config text `unset` until John names them. Staff notes on `/notes` are not readable by a player. Open items are in `docs/OPEN_QUESTIONS.md` and in `config_notes` (staff can read them on Schedule).

## Supabase project, for John

1. Create a free project. Do not paste the service-role key into this repo or into chat.
2. In Authentication, enable email magic link. Add redirect URLs `http://127.0.0.1:3000/auth/callback` and `http://localhost:3000/auth/callback`, plus the same paths on whatever origin you actually use.
3. Apply `supabase/migrations` in order (`supabase db push`, or the SQL editor, one file at a time).
4. Put the project URL and anon key in `.env.local`.
5. Sign in once, then run the DM update above.
6. Apply every file in `supabase/migrations` in order, including `20261028120000_attribute_awards.sql` and `20261028120100_weekly_checkin.sql`. Confirm the adventure date before anyone logs work they expect to bank.
