#!/bin/sh
set -eu
cd "$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
backup_dir="${1:-./backups}"
mkdir -p "$backup_dir"
backup_dir="$(cd "$backup_dir" && pwd)"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
# Freeze the single writer so JSON records and attachment files form a consistent backup.
docker compose --env-file deploy.env stop blog
trap 'docker compose --env-file deploy.env start blog >/dev/null' EXIT INT TERM
docker compose --env-file deploy.env run --rm --no-deps --user 0 --entrypoint tar -v "$backup_dir:/backup" blog -czf "/backup/journal-$stamp.tar.gz" -C /app/storage .
echo "Backup written: $backup_dir/journal-$stamp.tar.gz"
