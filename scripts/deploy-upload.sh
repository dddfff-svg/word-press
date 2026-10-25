#!/bin/sh
set -eu
cd "$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
[ "$(id -u)" = 0 ] || { echo 'Run as root'; exit 1; }
[ -f deploy.env ] && [ -f .secrets/admin_password_hash ] || { echo 'Upload the update into the existing project first. Keep deploy.env and .secrets.'; exit 1; }
sh scripts/backup.sh ./backups/before-layout
docker image tag daily-blog:local daily-blog:before-layout
docker compose --env-file deploy.env -f compose.yaml -f compose.vault.yaml -f compose.spark.yaml build --build-arg NODE_IMAGE=public.ecr.aws/docker/library/node:22-bookworm-slim blog
docker compose --env-file deploy.env -f compose.yaml -f compose.vault.yaml -f compose.spark.yaml up -d --no-deps --no-build --pull never blog
sh scripts/install-backup-timer.sh
docker compose --env-file deploy.env -f compose.yaml -f compose.vault.yaml -f compose.spark.yaml ps
echo 'Update finished. Refresh your blog with Ctrl+F5.'
