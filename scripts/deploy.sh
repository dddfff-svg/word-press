#!/bin/sh
set -eu
cd "$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed. Install Docker Engine and Compose before running this script." >&2
  exit 1
fi
docker compose version >/dev/null
if [ ! -f deploy.env ]; then
  cp deploy.env.example deploy.env
  chmod 600 deploy.env
  echo "Created deploy.env. Set SITE_URL, BLOG_PORT and BIND_ADDRESS, then run again."
  exit 0
fi
if [ ! -f .secrets/admin_password_hash ]; then
  mkdir -p .secrets
  chmod 700 .secrets
  docker run --rm -v "$PWD:/workspace" -w /workspace node:22-bookworm-slim node scripts/init-admin.cjs
fi
docker compose --env-file deploy.env config --quiet
docker compose --env-file deploy.env up -d --build
docker compose --env-file deploy.env ps
