#!/usr/bin/env bash
# Applies the migration + seed to a throwaway database and runs the policy tests.
# Needs psql and a Postgres superuser connection, e.g.
#   PGHOST=localhost PGUSER=postgres npm run test:db
set -euo pipefail
cd "$(dirname "$0")/.."
DB="${TEST_DB:-siam_secrets_test}"
PSQL=(psql -X -q -v ON_ERROR_STOP=1)

"${PSQL[@]}" -d postgres -c "drop database if exists $DB" -c "create database $DB"
# Roles are cluster-wide; ignore "already exists" from previous runs.
"${PSQL[@]}" -d "$DB" -v ON_ERROR_STOP=0 -f tests/supabase_stub.sql 2>&1 | grep -v 'already exists' || true
"${PSQL[@]}" -d "$DB" -f migrations/*.sql
"${PSQL[@]}" -d "$DB" -f seed.sql >/dev/null
"${PSQL[@]}" -d "$DB" -f tests/policies.sql 2>&1 | grep -E 'NOTICE|ERROR|PASSED' | sed 's/^psql:[^ ]* //'
"${PSQL[@]}" -d postgres -c "drop database $DB"
