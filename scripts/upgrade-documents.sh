#!/bin/sh
set -eu
cd "$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
[ -f deploy.env ] && [ -f .secrets/admin_password_hash ] || { echo 'Run inside the existing deployed project'; exit 1; }
umask 077
temporary="$(mktemp -d)"
trap 'rm -rf -- "$temporary"' EXIT INT TERM
echo 'Downloading source update; existing configuration and secrets will be kept.'
curl -fL --retry 3 --connect-timeout 20 --max-time 300 https://codeload.github.com/dddfff-svg/word-press/tar.gz/refs/heads/main -o "$temporary/source.tar.gz"
mkdir "$temporary/source"
tar -xzf "$temporary/source.tar.gz" -C "$temporary/source" --strip-components=1
cp "$temporary/source/scripts/backup.sh" scripts/backup.sh
sh scripts/backup.sh ./backups/before-documents
docker image tag daily-blog:local daily-blog:before-documents
for file in components/Header.tsx components/Journal.tsx components/Documents.tsx components/Goals.tsx components/Checkin.tsx components/RecentDocuments.tsx components/HomeMark.tsx components/MobileNav.tsx components/journal.css data/headerNavLinks.ts lib/journal-client.ts lib/journal-server.ts lib/documents.ts lib/checkin.ts app/documents/page.tsx app/spark/page.tsx compose.spark.yaml scripts/deploy-upload.sh app/api/files/route.ts app/api/documents/route.ts 'app/api/documents/[id]/route.ts' app/api/backup/route.ts scripts/backup.sh scripts/daily-backup.sh scripts/install-backup-timer.sh Dockerfile DOCUMENTS.md; do
  [ -s "$temporary/source/$file" ] || { echo "Missing update file: $file"; exit 1; }
done
for file in components/Header.tsx components/Journal.tsx components/Documents.tsx components/Goals.tsx components/Checkin.tsx components/RecentDocuments.tsx components/HomeMark.tsx components/MobileNav.tsx components/journal.css data/headerNavLinks.ts lib/journal-client.ts lib/journal-server.ts lib/documents.ts lib/checkin.ts app/documents/page.tsx app/spark/page.tsx compose.spark.yaml scripts/deploy-upload.sh app/api/files/route.ts app/api/documents/route.ts 'app/api/documents/[id]/route.ts' app/api/backup/route.ts scripts/backup.sh scripts/daily-backup.sh scripts/install-backup-timer.sh Dockerfile DOCUMENTS.md; do
  mkdir -p "$(dirname "$file")"
  cp "$temporary/source/$file" "$file"
done
docker compose --env-file deploy.env -f compose.yaml -f compose.vault.yaml -f compose.spark.yaml build --build-arg NODE_IMAGE=public.ecr.aws/docker/library/node:22-bookworm-slim blog
docker compose --env-file deploy.env -f compose.yaml -f compose.vault.yaml -f compose.spark.yaml up -d --no-deps --no-build --pull never blog
sh scripts/install-backup-timer.sh
sh scripts/daily-backup.sh
docker compose --env-file deploy.env -f compose.yaml -f compose.vault.yaml -f compose.spark.yaml ps
echo 'Upgrade complete. Refresh the blog with Ctrl+F5. Open /documents/ for your private files.'
