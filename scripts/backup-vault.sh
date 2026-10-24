#!/bin/sh
set -eu
cd "$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
backup_dir="${1:-./backups}"
mkdir -p "$backup_dir"
backup_dir="$(cd "$backup_dir" && pwd)"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
compose() { docker compose --env-file deploy.env -f compose.yaml -f compose.vault.yaml "$@"; }
compose stop vaultwarden
trap 'compose start vaultwarden >/dev/null' EXIT INT TERM
# A stopped Vaultwarden guarantees a consistent SQLite/WAL and attachment snapshot.
compose run --rm --no-deps --user 0 --entrypoint tar -v "$backup_dir:/backup" vaultwarden -czf "/backup/vault-$stamp.tar.gz" -C /data .
echo "Vault backup written: $backup_dir/vault-$stamp.tar.gz"
