#!/bin/sh
set -eu
cd "$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
case "$(uname -m)" in
  x86_64|amd64) ;;
  *) echo "This package is linux/amd64. Build an architecture-matching package for this server." >&2; exit 1 ;;
esac
if [ ! -f ../images.tar.gz ] || [ ! -f ../images.sha256 ]; then
  echo "Keep this source directory next to images.tar.gz and images.sha256 from the downloaded artifact." >&2
  exit 1
fi
(cd .. && sha256sum -c images.sha256)
docker load -i ../images.tar.gz
if [ ! -f deploy.env ]; then
  cp deploy.env.example deploy.env
  chmod 600 deploy.env
  echo "Created deploy.env. Fill in the site IP, bind address and vault URL, then run this script again."
  exit 0
fi
if [ ! -f .secrets/admin_password_hash ] && [ ! -f .secrets/session_secret ]; then
  mkdir -p .secrets
  chmod 700 .secrets
  docker run --pull=never --rm -v "$PWD:/workspace" -w /workspace node:22-bookworm-slim node scripts/init-admin.cjs
fi
set -- --env-file deploy.env -f compose.yaml -f compose.vault.yaml
docker compose "$@" config --quiet
docker compose "$@" up -d --no-build --pull never
docker compose "$@" ps

