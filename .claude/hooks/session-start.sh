#!/bin/bash
# Claude Code on the web SessionStart hook.
# Installs JS deps + starts Postgres so tests/lint/schema-validation run
# immediately. Idempotent — safe to re-run.

set -euo pipefail

# Only run in remote (web) environments. Local sessions have their own setup.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

echo "==> npm install"
npm install --no-audit --no-fund --prefer-offline >/dev/null

# Start Postgres for supabase/test-schema.sh. Image is preinstalled in the
# environment (postgresql-16). Skip if not available.
if command -v pg_ctlcluster >/dev/null 2>&1; then
  echo "==> starting postgres"
  service postgresql start >/dev/null 2>&1 || true
fi

echo "==> SessionStart hook done"
