#!/bin/sh
# Ubuntu host setup. Does not rebuild images or remove existing Docker volumes.
set -eu
cd "$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
if [ "$(id -u)" -ne 0 ]; then echo "Run with sudo sh scripts/enable-ip-https.sh SERVER_IP" >&2; exit 1; fi
ip="${1:-}"
if [ -z "$ip" ]; then echo "Usage: sudo sh scripts/enable-ip-https.sh PUBLIC_IPV4" >&2; exit 1; fi
python3 -c 'import ipaddress,sys; value=ipaddress.ip_address(sys.argv[1]); assert value.version==4 and value.is_global, "A public IPv4 is required"' "$ip"
if [ ! -f deploy.env ] || [ ! -f deploy/nginx-vault-ip.conf.template ]; then
  echo "Missing deploy.env or Nginx template. Run this inside the existing deployed project." >&2; exit 1
fi
command -v docker >/dev/null
docker compose version >/dev/null
# Do not replace another web server or disturb an existing proxy.
listeners="$(ss -H -lntp '( sport = :80 or sport = :443 )')"
if [ -n "$listeners" ] && printf '%s\n' "$listeners" | grep -v nginx >/dev/null; then
  printf '%s\n' "$listeners"
  echo "Ports 80/443 are occupied by a service other than Nginx. Stop here and inspect it." >&2; exit 1
fi
if ! curl -fsS http://127.0.0.1:8222/ -o /dev/null; then
  echo "Vaultwarden is not responding on 127.0.0.1:8222. Start it before configuring HTTPS." >&2; exit 1
fi
apt-get update
apt-get install -y nginx python3-venv curl
certbot=/opt/daily-vault-certbot/bin/certbot
if [ ! -x "$certbot" ]; then python3 -m venv /opt/daily-vault-certbot; fi
/opt/daily-vault-certbot/bin/pip install --upgrade 'certbot>=5.4'
"$certbot" --version
mkdir -p /var/www/letsencrypt/.well-known/acme-challenge
conf=/etc/nginx/conf.d/daily-vault.conf
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
if [ -e "$conf" ]; then cp -p "$conf" "$conf.before-$stamp"; fi
# A working HTTP challenge endpoint is needed before loading the TLS certificate.
cat > "$conf" <<EOF
server {
    listen 80;
    server_name $ip;
    location ^~ /.well-known/acme-challenge/ {
        root /var/www/letsencrypt;
    }
    location / { return 404; }
}
EOF
nginx -t
systemctl enable --now nginx
systemctl reload nginx
printf '\nEnsure cloud security rules allow inbound TCP 80 and 443.\n'
printf 'Certbot will ask for your email and agreement to its terms.\n'
"$certbot" certonly --webroot --webroot-path /var/www/letsencrypt --ip-address "$ip" --preferred-profile shortlived --cert-name daily-vault-ip
# This step is reached only after certificate issuance succeeds.
sed "s/@SERVER_IP@/$ip/g" deploy/nginx-vault-ip.conf.template > "$conf"
nginx -t
systemctl reload nginx
mkdir -p /etc/letsencrypt/renewal-hooks/deploy
cat > /etc/letsencrypt/renewal-hooks/deploy/20-daily-vault-nginx.sh <<'EOF'
#!/bin/sh
set -eu
/usr/sbin/nginx -t
/usr/bin/systemctl reload nginx
EOF
chmod 755 /etc/letsencrypt/renewal-hooks/deploy/20-daily-vault-nginx.sh
cat > /etc/systemd/system/daily-vault-cert-renew.service <<EOF
[Unit]
Description=Renew daily vault public IP certificate
Wants=network-online.target
After=network-online.target
[Service]
Type=oneshot
ExecStart=$certbot renew --cert-name daily-vault-ip --quiet
EOF
cat > /etc/systemd/system/daily-vault-cert-renew.timer <<'EOF'
[Unit]
Description=Check daily vault IP certificate every six hours
[Timer]
OnCalendar=*-*-* 00,06,12,18:00:00
RandomizedDelaySec=10min
Persistent=true
[Install]
WantedBy=timers.target
EOF
systemctl daemon-reload
systemctl enable --now daily-vault-cert-renew.timer
"$certbot" renew --cert-name daily-vault-ip --dry-run
cp -p deploy.env "deploy.env.before-https-$stamp"
python3 - "$ip" <<'PY'
from pathlib import Path
import sys
p=Path('deploy.env')
lines=p.read_text(encoding='utf-8-sig').splitlines()
lines=[line for line in lines if not line.startswith('VAULT_PUBLIC_URL=')]
lines.append('VAULT_PUBLIC_URL=https://'+sys.argv[1])
p.write_text('\n'.join(lines)+'\n',encoding='utf-8')
PY
docker compose --env-file deploy.env -f compose.yaml -f compose.vault.yaml config --quiet
docker compose --env-file deploy.env -f compose.yaml -f compose.vault.yaml up -d --no-build --pull never
curl -f --resolve "$ip:443:127.0.0.1" "https://$ip/" -o /dev/null
printf '\nVault URL: https://%s\nBlog URL and credentials were kept. Unlock the vault with its own master password.\n' "$ip"
printf 'Keep TCP 80 open for renewal. Check the renewal timer with: systemctl list-timers daily-vault-cert-renew.timer\n'

