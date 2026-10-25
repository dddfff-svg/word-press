#!/bin/sh
set -eu
cd "$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
umask 077
mkdir -p backups/daily backups/weekly
# Use a host lock to avoid overlapping scheduled/manual runs of this wrapper.
exec 9>backups/.daily-lock
flock -n 9 || exit 0
sh scripts/backup.sh ./backups/daily
latest="$(find backups/daily -maxdepth 1 -type f -name 'journal-*.tar.gz' | sort | tail -n 1)"
if [ "$(date -u +%u)" = 7 ]; then
  cp -p "$latest" "backups/weekly/$(basename "$latest")"
fi
find backups/daily -maxdepth 1 -type f -name 'journal-*.tar.gz' -mtime +6 -delete
find backups/weekly -maxdepth 1 -type f -name 'journal-*.tar.gz' -mtime +27 -delete
echo 'Backup retention: 7 daily days and 4 weekly weeks. Vaultwarden uses its separate backup script.'
