#!/bin/sh
set -eu
[ "$(id -u)" = 0 ] || { echo 'Run as root'; exit 1; }
project="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
case "$project" in *[!a-zA-Z0-9/_.-]*) echo 'Project path must not contain spaces or special characters'; exit 1;; esac
cat > /etc/systemd/system/daily-blog-backup.service <<EOF
[Unit]
Description=Back up daily blog records and private documents
Requires=docker.service
After=docker.service
[Service]
Type=oneshot
WorkingDirectory=$project
ExecStart=/bin/sh $project/scripts/daily-backup.sh
EOF
cat > /etc/systemd/system/daily-blog-backup.timer <<'EOF'
[Unit]
Description=Daily blog backup at 03:00 Asia/Shanghai
[Timer]
OnCalendar=*-*-* 03:00:00 Asia/Shanghai
Persistent=true
[Install]
WantedBy=timers.target
EOF
systemctl daemon-reload
systemctl enable --now daily-blog-backup.timer
echo 'Run a first backup now: sh scripts/daily-backup.sh'
systemctl list-timers daily-blog-backup.timer --no-pager
