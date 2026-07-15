#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?Set DATABASE_URL to the target Supabase/Postgres connection string.}"
: "${BACKUP_FILE:?Set BACKUP_FILE to the .dump file that should be restored.}"

if [[ "${ALLOW_DATABASE_RESTORE:-false}" != "true" ]]; then
  printf 'Restore blocked. Set ALLOW_DATABASE_RESTORE=true after confirming the target database.\n' >&2
  exit 1
fi

if [[ ! -f "${BACKUP_FILE}" ]]; then
  printf 'Backup file not found: %s\n' "${BACKUP_FILE}" >&2
  exit 1
fi

pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  --dbname="${DATABASE_URL}" \
  "${BACKUP_FILE}"

printf 'Database restore completed from: %s\n' "${BACKUP_FILE}"
