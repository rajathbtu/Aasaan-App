#!/usr/bin/env bash
set -euo pipefail

# Wait for the database to become available before running Prisma migrations.
# This prevents Render startup failures when the DB socket is not ready immediately.

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[startup] ❌ DATABASE_URL is not set"
  exit 1
fi

MAX_ATTEMPTS=10
SLEEP_SECONDS=5

for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
  echo "[startup] Attempt $attempt/$MAX_ATTEMPTS: running prisma migrate deploy..."
  if npx prisma migrate deploy --schema=./prisma/schema.prisma; then
    echo "[startup] ✅ migrate deploy succeeded"
    exec npm start
  fi

  if [[ "$attempt" -lt "$MAX_ATTEMPTS" ]]; then
    echo "[startup] ⚠️ migrate deploy failed, waiting $SLEEP_SECONDS seconds before retrying..."
    sleep "$SLEEP_SECONDS"
  else
    echo "[startup] ❌ migrate deploy failed after $MAX_ATTEMPTS attempts"
    exit 1
  fi
done