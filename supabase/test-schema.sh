#!/usr/bin/env bash
# Validate supabase/schema.sql against a local Postgres by simulating
# Supabase's auth schema (auth.users + auth.uid()).
#
# Requirements: a running Postgres with createdb permission.
# Override DB_USER, DB_HOST, etc. via env if not using postgres on default port.
#
# Usage:
#   sudo -u postgres bash supabase/test-schema.sh
#   # or, with env:
#   DB_SUPERUSER=postgres bash supabase/test-schema.sh

set -euo pipefail

DB_NAME="${DB_NAME:-macaron_schema_test}"
DB_SUPERUSER="${DB_SUPERUSER:-postgres}"
PSQL_HOST_FLAG=""
if [ -n "${PGHOST:-}" ]; then
  PSQL_HOST_FLAG="-h ${PGHOST}"
fi
PSQL="psql ${PSQL_HOST_FLAG} -U ${DB_SUPERUSER}"

SCHEMA_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCHEMA_DIR/.." && pwd)"

run_psql() {
  $PSQL "$@"
}

echo "==> Resetting database $DB_NAME"
run_psql -c "drop database if exists $DB_NAME;" > /dev/null
run_psql -c "create database $DB_NAME;" > /dev/null
run_psql -c "create role anon_user noinherit;" > /dev/null 2>&1 || true

echo "==> Loading Supabase auth stub"
$PSQL -d "$DB_NAME" <<'SQL'
create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  created_at timestamptz default now()
);
create or replace function auth.uid() returns uuid as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$ language sql stable;
SQL

echo "==> Loading $ROOT_DIR/supabase/schema.sql"
$PSQL -d "$DB_NAME" -f "$ROOT_DIR/supabase/schema.sql" > /dev/null

echo "==> Granting permissions to anon_user"
$PSQL -d "$DB_NAME" <<SQL > /dev/null
grant usage on schema public to anon_user;
grant all on all tables in schema public to anon_user;
grant all on all sequences in schema public to anon_user;
alter table public.profiles force row level security;
alter table public.daily_activity force row level security;
SQL

echo "==> Running assertions"
$PSQL -d "$DB_NAME" -v ON_ERROR_STOP=0 <<'SQL'
\set QUIET on

\echo '-- T1: trigger auto-creates profile on auth.users insert'
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'alice@test'),
  ('22222222-2222-2222-2222-222222222222', null);
select count(*) = 2 as t1_pass from public.profiles;

\echo '-- T2: upsert on (user_id, activity_date) keeps single row'
insert into public.daily_activity (
  user_id, activity_date, steps, flights_climbed, macaron_earned,
  milestones_granted
) values (
  '11111111-1111-1111-1111-111111111111', current_date, 5000, 0, 3,
  array['steps_1000', 'steps_5000']
);
insert into public.daily_activity (
  user_id, activity_date, steps, flights_climbed, macaron_earned,
  milestones_granted
) values (
  '11111111-1111-1111-1111-111111111111', current_date, 12000, 15, 9,
  array['steps_1000', 'steps_5000', 'steps_10000', 'flights_10']
)
on conflict (user_id, activity_date) do update set
  steps = excluded.steps, flights_climbed = excluded.flights_climbed,
  macaron_earned = excluded.macaron_earned,
  milestones_granted = excluded.milestones_granted;
select count(*) = 1 and max(steps) = 12000 and max(macaron_earned) = 9 as t2_pass
  from public.daily_activity
  where user_id = '11111111-1111-1111-1111-111111111111' and activity_date = current_date;

\echo '-- T3: check constraint blocks negative balance'
do $$
begin
  begin
    update public.profiles set macaron_balance = -1
      where id = '11111111-1111-1111-1111-111111111111';
    raise exception 'T3 FAIL: negative balance was allowed';
  exception when check_violation then
    raise notice 'T3 PASS: check constraint blocked negative balance';
  end;
end$$;

\echo '-- T4: FK blocks orphan daily_activity'
do $$
begin
  begin
    insert into public.daily_activity (user_id, activity_date)
      values ('99999999-9999-9999-9999-999999999999', current_date);
    raise exception 'T4 FAIL: orphan insert allowed';
  exception when foreign_key_violation then
    raise notice 'T4 PASS: FK blocked orphan insert';
  end;
end$$;

\echo '-- T5a: RLS — alice sees only her own rows'
begin;
  set local role anon_user;
  set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
  select (
    (select count(*) from public.profiles) = 1
    and (select count(*) from public.daily_activity) = 1
  ) as t5a_pass;
commit;

\echo '-- T5b: RLS — alice cannot update Bob'
begin;
  set local role anon_user;
  set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
  with attempted as (
    update public.profiles set macaron_balance = 99999
      where id = '22222222-2222-2222-2222-222222222222'
      returning 1
  )
  select count(*) = 0 as t5b_pass from attempted;
commit;
select macaron_balance = 0 as t5b_bob_balance_unchanged
  from public.profiles where id = '22222222-2222-2222-2222-222222222222';
SQL

echo "==> Cleaning up"
run_psql -c "drop database $DB_NAME;" > /dev/null
echo "DONE"
