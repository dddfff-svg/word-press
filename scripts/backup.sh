#!/bin/sh
set -eu
cd "$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
backup_dir="${1:-./backups}"
umask 077
mkdir -p "$backup_dir"
backup_dir="$(cd "$backup_dir" && pwd)"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
# Freeze the single writer so JSON records and attachment files form a consistent backup.
docker compose --env-file deploy.env stop blog
trap 'docker compose --env-file deploy.env start blog >/dev/null' EXIT INT TERM
docker compose --env-file deploy.env run --rm -T --pull never --no-deps --entrypoint tar blog -czf - -C /app/storage . > "$backup_dir/journal-$stamp.tar.gz.partial"
mv "$backup_dir/journal-$stamp.tar.gz.partial" "$backup_dir/journal-$stamp.tar.gz"
chmod 600 "$backup_dir/journal-$stamp.tar.gz"
echo "Backup written: $backup_dir/journal-$stamp.tar.gz"
