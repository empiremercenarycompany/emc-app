# Seeding The Sirath

A staff member runs this on a private machine, against a database they control. The script will not connect to a hosted Supabase URL, and it will not read a canon file that sits inside this repo. Do not run it against production.

The migration `supabase/migrations/20261112100000_sirath.sql` has to be applied on that database first, by whoever owns the database, through their own process. This repository does not apply it.

## What you set

All three are required. None of these values belong in the repo, in a pull request, or in a screenshot.

| Variable | What it is |
| --- | --- |
| `SIRATH_SOURCE` | Absolute path to the canon JSON, outside this repo. `--file` overrides it. |
| `DATABASE_URL` | Postgres URL for the database you are seeding. A URL containing `supabase.co` or `supabase.com` is refused. |
| `SIRATH_UUID_NAMESPACE` | Secret string used to derive entry ids. It must not be the dev fixture value `sirath-dev-fixture`. |

`--guild <uuid>` is optional. Without it, the script uses the guild whose slug is `emc`.

## Command

```sh
SIRATH_SOURCE=/secure/sirath_source.json \
SIRATH_UUID_NAMESPACE="$SIRATH_UUID_NAMESPACE" \
DATABASE_URL="$DATABASE_URL" \
npm run seed:sirath
```

The script strips any player-facing field or fact body that contains a `[TBD]` note. A fact whose body is only that note is stored as a draft with an empty body. A link to a slug that is not in the file stops the load. The SQL it runs is not printed.

The fake book used by tests keeps the fixed dev namespace. Production seeding must not reuse it.
