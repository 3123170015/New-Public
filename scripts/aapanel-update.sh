#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://api.github.com/repos/3123170015/New-Public/releases/latest"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

LOCAL_VERSION="$(node -e "console.log(require('./package.json').version)")"

AUTH_HEADER=""
if [ -n "${GITHUB_TOKEN:-}" ]; then
  AUTH_HEADER="Authorization: Bearer ${GITHUB_TOKEN}"
fi

notify_telegram() {
  local message="$1"
  if [ -z "${TELEGRAM_BOT_TOKEN:-}" ] || [ -z "${TELEGRAM_CHAT_ID:-}" ]; then
    return 0
  fi
  curl -fsSL --connect-timeout 5 --max-time 10 \
    -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d "chat_id=${TELEGRAM_CHAT_ID}" \
    --data-urlencode "text=${message}" >/dev/null || true
}

fail_notify() {
  local exit_code=$?
  if [ "$exit_code" -ne 0 ]; then
    notify_telegram "aaPanel update failed (exit ${exit_code}). Check logs."
  fi
}
trap fail_notify EXIT

backup_before_migrate() {
  if [ "${BACKUP_BEFORE_MIGRATE:-0}" != "1" ]; then
    return 0
  fi
  if ! command -v mysqldump >/dev/null 2>&1; then
    echo "mysqldump not found; skipping backup."
    return 0
  fi

  local export_vars
  export_vars="$(node -e "require('dotenv').config({path:'${ROOT_DIR}/.env'});const url=process.env.DATABASE_URL;if(!url){process.exit(1)};const u=new URL(url);const esc=(s)=>String(s||'').replace(/'/g,\"'\\\\''\");console.log(\"DB_HOST='\"+esc(u.hostname)+\"'\\nDB_PORT='\"+esc(u.port||'3306')+\"'\\nDB_USER='\"+esc(u.username)+\"'\\nDB_PASS='\"+esc(u.password)+\"'\\nDB_NAME='\"+esc(u.pathname.replace(/^\\//,'')) +\"'\");" 2>/dev/null)" || {
    echo "DATABASE_URL not available; skipping backup."
    return 0
  }

  eval "$export_vars"
  if [ -z "${DB_NAME:-}" ]; then
    echo "DATABASE_URL missing database name; skipping backup."
    return 0
  fi

  local backup_dir="${BACKUP_DIR:-${ROOT_DIR}/backups}"
  mkdir -p "$backup_dir"
  local ts
  ts="$(date +%Y%m%d_%H%M%S)"
  local backup_file="${backup_dir}/db_${DB_NAME}_${ts}.sql"
  local pass_arg=""
  if [ -n "${DB_PASS:-}" ]; then
    pass_arg="-p${DB_PASS}"
  fi

  echo "Backing up DB to ${backup_file}..."
  if ! mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" $pass_arg "$DB_NAME" > "$backup_file"; then
    echo "Database backup failed."
    notify_telegram "aaPanel update failed: database backup error."
    exit 1
  fi

  if [ "${BACKUP_GZIP:-0}" = "1" ]; then
    gzip -f "$backup_file"
    backup_file="${backup_file}.gz"
  fi

  notify_telegram "aaPanel backup complete: $(basename "$backup_file")."
}

restart_services() {
  if [ "${AUTO_RESTART:-0}" != "1" ]; then
    return 0
  fi

  local restarted=0
  local pm2_web="${PM2_WEB_NAME:-videoshare-web}"
  local pm2_worker="${PM2_WORKER_NAME:-videoshare-worker}"

  if command -v pm2 >/dev/null 2>&1; then
    if pm2 describe "$pm2_web" >/dev/null 2>&1; then
      pm2 restart "$pm2_web"
      restarted=1
    fi
    if pm2 describe "$pm2_worker" >/dev/null 2>&1; then
      pm2 restart "$pm2_worker"
      restarted=1
    fi
  fi

  if [ -n "${SYSTEMD_WEB_SERVICE:-}" ]; then
    systemctl restart "$SYSTEMD_WEB_SERVICE"
    restarted=1
  fi
  if [ -n "${SYSTEMD_WORKER_SERVICE:-}" ]; then
    systemctl restart "$SYSTEMD_WORKER_SERVICE"
    restarted=1
  fi

  if [ "$restarted" -eq 1 ]; then
    notify_telegram "aaPanel update: services restarted."
  else
    echo "AUTO_RESTART enabled but no services detected."
    notify_telegram "aaPanel update complete, but services not restarted (no PM2/systemd target)."
  fi
}

cleanup_logs() {
  if [ "${LOG_CLEANUP:-0}" != "1" ]; then
    return 0
  fi
  local log_file="${UPDATE_LOG_FILE:-${ROOT_DIR}/logs/update.log}"
  local max_bytes="${LOG_MAX_BYTES:-10485760}"
  if [ ! -f "$log_file" ]; then
    return 0
  fi
  local size
  size="$(wc -c < "$log_file" | tr -d ' ')"
  if [ "$size" -le "$max_bytes" ]; then
    return 0
  fi
  local mode="${LOG_TRUNCATE:-1}"
  if [ "$mode" = "0" ]; then
    rm -f "$log_file"
    notify_telegram "aaPanel update: log removed (size ${size} bytes)."
  else
    tail -c "$max_bytes" "$log_file" > "${log_file}.tmp" && mv "${log_file}.tmp" "$log_file"
    notify_telegram "aaPanel update: log truncated to ${max_bytes} bytes."
  fi
}

LATEST_TAG="$(curl -fsSL --connect-timeout 5 --max-time 10 -H "$AUTH_HEADER" "$REPO_URL" | node -e "const fs=require('fs');const data=JSON.parse(fs.readFileSync(0,'utf8'));console.log(data.tag_name||'');")"
LATEST_VERSION="${LATEST_TAG#v}"

if [ -z "$LATEST_VERSION" ]; then
  echo "Unable to detect latest release tag."
  exit 1
fi

if [ "$LATEST_VERSION" = "$LOCAL_VERSION" ]; then
  echo "No update available. Current version: $LOCAL_VERSION"
  notify_telegram "aaPanel update: no changes (version ${LOCAL_VERSION})."
  exit 0
fi

echo "Update available: $LOCAL_VERSION -> $LATEST_VERSION"
notify_telegram "aaPanel update available: ${LOCAL_VERSION} -> ${LATEST_VERSION}."
if [[ "${1:-}" != "--yes" ]]; then
  read -rp "Pull latest and rebuild now? (y/N): " CONFIRM || true
  if [[ ! "${CONFIRM}" =~ ^[Yy]$ ]]; then
    exit 0
  fi
fi

if ! git pull --ff-only; then
  echo "git pull failed. Resolve local changes/conflicts then re-run."
  notify_telegram "aaPanel update failed: git pull error. Check repo status."
  exit 1
fi
npm ci || npm install
backup_before_migrate
npm run prisma:migrate
npm run build

echo "Update complete. Restart web + worker processes (pm2/systemd)."
notify_telegram "aaPanel update completed: ${LOCAL_VERSION} -> ${LATEST_VERSION}."
restart_services
if [ "${POST_UPDATE_VERIFY:-0}" = "1" ]; then
  local_status=""
  if curl -fsSL --connect-timeout 5 --max-time 10 "http://127.0.0.1:${VERIFY_PORT:-3000}/api/verify/status" >/dev/null; then
    local_status="OK"
  else
    local_status="FAIL"
  fi
  notify_telegram "aaPanel verify status: ${local_status}."
fi
cleanup_logs
