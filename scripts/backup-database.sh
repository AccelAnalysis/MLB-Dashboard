#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?Set DATABASE_URL to the Supabase/Postgres connection string before running a backup.}"

backup_dir="${BACKUP_DIR:-backups}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_file="${backup_dir}/mlb-dashboard-${timestamp}.dump"

mkdir -p "${backup_dir}"

pg_dump \
  --format=custom \
  --no-owner \
  --no-acl \
  --file="${backup_file}" \
  "${DATABASE_URL}"

printf 'Database backup created: %s\n' "${backup_file}"
