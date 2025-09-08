#!/usr/bin/env bash
set -euo pipefail

# Prisma safe deploy script with baseline support
# - If DB is not empty and migrations history is empty, baseline to the latest migration
# - Then run prisma migrate deploy

echo "[prisma-deploy] Starting Prisma deploy..."

# Ensure DATABASE_URL is set
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[prisma-deploy] ❌ DATABASE_URL is not set" >&2
  exit 1
fi

# Try to detect if migrations table exists and has rows
HAS_MIGRATIONS=0
if npx prisma migrate status --schema=./prisma/schema.prisma >/tmp/prisma_status.txt 2>&1; then
  if grep -q "Database schema is up to date" /tmp/prisma_status.txt; then
    echo "[prisma-deploy] ✅ Already up to date"
    npx prisma migrate deploy --schema=./prisma/schema.prisma
    exit 0
  fi
  if grep -q "No migration found in prisma/migrations" /tmp/prisma_status.txt; then
    echo "[prisma-deploy] ⚠️ No migrations found; skipping deploy"
    exit 0
  fi
  if grep -q "Following migration have not yet been applied" /tmp/prisma_status.txt; then
    HAS_MIGRATIONS=1
  fi
fi

# If migrate deploy fails with P3005 (non-empty DB), do baseline
set +e
OUTPUT=$(npx prisma migrate deploy --schema=./prisma/schema.prisma 2>&1)
CODE=$?
set -e
if [[ $CODE -ne 0 && "$OUTPUT" == *"P3005"* ]]; then
  echo "[prisma-deploy] ⚠️ P3005 detected (non-empty DB). Attempting baseline..."
  # Baseline by marking all migrations as applied in order
  MIGRATIONS=( $(ls -1 prisma/migrations | sort) )
  if [[ ${#MIGRATIONS[@]} -eq 0 ]]; then
    echo "[prisma-deploy] ❌ No migrations found to baseline" >&2
    echo "$OUTPUT"
    exit 1
  fi
  for m in "${MIGRATIONS[@]}"; do
    echo "[prisma-deploy] Marking applied: $m"
    npx prisma migrate resolve --applied "$m" --schema=./prisma/schema.prisma
  done
  echo "[prisma-deploy] Retrying migrate deploy..."
  npx prisma migrate deploy --schema=./prisma/schema.prisma
  echo "[prisma-deploy] ✅ Baseline + deploy complete"
  exit 0
elif [[ $CODE -ne 0 ]]; then
  echo "[prisma-deploy] ❌ migrate deploy failed:"
  echo "$OUTPUT"
  exit $CODE
else
  echo "[prisma-deploy] ✅ migrate deploy succeeded"
fi
