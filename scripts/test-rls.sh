#!/usr/bin/env bash
# Rebuild a local test database and run the RLS suite.
# Refuses a hosted Supabase URL. Do not point this at a project you care about.
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ "${DATABASE_URL:-}" == *supabase.co* || "${DATABASE_URL:-}" == *supabase.com* ]]; then
  echo "Refusing to run RLS tests against a hosted Supabase database." >&2
  exit 1
fi

run_sql() {
  if [[ -n "${DATABASE_URL:-}" ]]; then
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 "$@"
  else
    sudo -u postgres psql -d emc_test -v ON_ERROR_STOP=1 "$@"
  fi
}

if [[ -z "${DATABASE_URL:-}" ]]; then
  sudo -u postgres psql -d postgres -v ON_ERROR_STOP=1 -c "SELECT 1 FROM pg_database WHERE datname = 'emc_test'" | grep -q 1 \
    || sudo -u postgres createdb emc_test
fi

echo "Resetting test schemas"
run_sql -c "DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS auth CASCADE; DROP SCHEMA IF EXISTS test CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres;"

echo "Auth stub"
run_sql -f supabase/tests/00_auth_stub.sql

for file in supabase/migrations/*.sql; do
  echo "Applying $file"
  run_sql -f "$file"
done

echo "RLS tests"
run_sql -f supabase/tests/rls.test.sql
echo "RLS tests passed"
