#!/bin/sh
set -eu
cd "$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
[ "$(id -u)" = 0 ] || { echo 'Run as root'; exit 1; }
server_ip="${1:-124.221.187.35}"
case "$server_ip" in ''|*[!0-9.]*) echo 'Expected IPv4 address'; exit 1;; esac
[ -f /etc/letsencrypt/live/daily-vault-ip/fullchain.pem ] || { echo 'Existing IP HTTPS certificate is required. Configure vault HTTPS first.'; exit 1; }
[ -f deploy.env ] || { echo 'deploy.env missing'; exit 1; }
command -v nginx >/dev/null
configuration=/etc/nginx/conf.d/daily-blog-https.conf
listeners="$(ss -H -lntp '( sport = :8443 )')"
if [ -n "$listeners" ] && [ ! -f "$configuration" ]; then
  echo 'Port 8443 already has a listener. Inspect its configuration first; no changes made.'; exit 1
fi
if [ -n "$listeners" ] && printf '%s\n' "$listeners" | grep -vq '"nginx"'; then
  echo 'Port 8443 is occupied by another service. No changes made.'; exit 1
fi
umask 077
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
cp deploy.env "deploy.env.before-public-$stamp"
if [ -f "$configuration" ]; then cp "$configuration" "$configuration.before-$stamp"; fi
temporary="$(mktemp)"
trap 'rm -f -- "$temporary"' EXIT INT TERM
sed "s/@SERVER_IP@/$server_ip/g" deploy/nginx-blog-https.conf.template > "$temporary"
cp "$temporary" "$configuration"
if ! nginx -t; then
  if [ -f "$configuration.before-$stamp" ]; then cp "$configuration.before-$stamp" "$configuration"; else rm -f -- "$configuration"; fi
  echo 'Nginx validation failed; original config restored.'; exit 1
fi
systemctl reload nginx
sed -i '/^SITE_URL=/d' deploy.env
printf '\nSITE_URL=https://%s:8443\n' "$server_ip" >> deploy.env
if [ -f compose.spark.yaml ]; then
  docker compose --env-file deploy.env -f compose.yaml -f compose.vault.yaml -f compose.spark.yaml up -d --no-deps --force-recreate --no-build --pull never blog
else
  docker compose --env-file deploy.env -f compose.yaml -f compose.vault.yaml up -d --no-deps --force-recreate --no-build --pull never blog
fi
echo "Open cloud security group TCP 8443, then visit https://$server_ip:8443/ and log in again."
echo "Vault URL stays https://$server_ip/ . Existing certificate renewal continues to reload Nginx."
