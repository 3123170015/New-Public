#!/usr/bin/env bash
set -euo pipefail

HOST="${MONITOR_HOST:-127.0.0.1}"
PORT="${MONITOR_PORT:-3000}"
BASE_URL="http://${HOST}:${PORT}"
STATE_FILE="${MONITOR_STATE_FILE:-/tmp/videoshare-monitor.state}"
CONNECT_TIMEOUT="${MONITOR_CONNECT_TIMEOUT:-5}"
MAX_TIME="${MONITOR_MAX_TIME:-10}"
AUTO_RESTART_WORKER="${MONITOR_AUTO_RESTART_WORKER:-0}"
PM2_WORKER_NAME="${PM2_WORKER_NAME:-videoshare-worker}"
SYSTEMD_WORKER_SERVICE="${SYSTEMD_WORKER_SERVICE:-}"

to_positive_int() {
  local value="$1"
  local fallback="$2"
  if [[ "$value" =~ ^[0-9]+$ ]] && [ "$value" -gt 0 ]; then
    echo "$value"
    return
  fi
  echo "$fallback"
}

RETRY_COUNT="$(to_positive_int "${MONITOR_RETRY_COUNT:-3}" 3)"
RETRY_DELAY="$(to_positive_int "${MONITOR_RETRY_DELAY:-2}" 2)"

notify_telegram() {
  local message="$1"
  if [ -z "${TELEGRAM_BOT_TOKEN:-}" ] || [ -z "${TELEGRAM_CHAT_ID:-}" ]; then
    return 0
  fi
  curl -fsSL --connect-timeout "$CONNECT_TIMEOUT" --max-time "$MAX_TIME" \
    -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d "chat_id=${TELEGRAM_CHAT_ID}" \
    --data-urlencode "text=${message}" >/dev/null || true
}

fetch_with_retry() {
  local url="$1"
  local attempt=1
  local output=""
  while [ "$attempt" -le "$RETRY_COUNT" ]; do
    if output="$(curl -fsSL --connect-timeout "$CONNECT_TIMEOUT" --max-time "$MAX_TIME" "$url")"; then
      printf "%s" "$output"
      return 0
    fi
    if [ "$attempt" -lt "$RETRY_COUNT" ]; then
      sleep "$RETRY_DELAY"
    fi
    attempt=$((attempt + 1))
  done
  return 1
}

restart_worker() {
  if [ "$AUTO_RESTART_WORKER" != "1" ]; then
    return 0
  fi
  local restarted=0
  if command -v pm2 >/dev/null 2>&1; then
    if pm2 describe "$PM2_WORKER_NAME" >/dev/null 2>&1; then
      if pm2 restart "$PM2_WORKER_NAME" >/dev/null 2>&1; then
        restarted=1
      else
        notify_telegram "⚠️ Worker restart failed (pm2)."
      fi
    fi
  elif [ -n "$SYSTEMD_WORKER_SERVICE" ] && command -v systemctl >/dev/null 2>&1; then
    if systemctl status "$SYSTEMD_WORKER_SERVICE" >/dev/null 2>&1; then
      if systemctl restart "$SYSTEMD_WORKER_SERVICE" >/dev/null 2>&1; then
        restarted=1
      else
        notify_telegram "⚠️ Worker restart failed (systemd)."
      fi
    else
      notify_telegram "⚠️ Worker systemd service not found."
    fi
  fi
  if [ "$restarted" -eq 1 ]; then
    notify_telegram "♻️ Worker restarted automatically."
  else
    notify_telegram "⚠️ Worker down but no restart target found."
  fi
}

db_ok=0
redis_ok=0
worker_ok=0

verify_json="$(fetch_with_retry "${BASE_URL}/api/verify" || true)"
if [ -n "$verify_json" ]; then
  read -r db_ok redis_ok <<<"$(printf '%s' "$verify_json" | node -e "const fs=require('fs');const data=JSON.parse(fs.readFileSync(0,'utf8'));const db=!!data.checks?.db?.ok;const redis=!!data.checks?.redis?.ok;process.stdout.write(`${db?1:0} ${redis?1:0}`);" || echo "0 0")"
fi

worker_json="$(fetch_with_retry "${BASE_URL}/api/verify/worker" || true)"
if [ -n "$worker_json" ]; then
  worker_ok="$(printf '%s' "$worker_json" | node -e "const fs=require('fs');const data=JSON.parse(fs.readFileSync(0,'utf8'));const ok=!!data.ok;process.stdout.write(ok?'1':'0');" || echo "0")"
fi

status="db=${db_ok} redis=${redis_ok} worker=${worker_ok}"
prev_status=""
LOCK_FILE="${STATE_FILE}.lock"
if command -v flock >/dev/null 2>&1; then
  exec 9>"$LOCK_FILE"
  if ! flock -n 9; then
    exit 0
  fi
fi
if [ -f "$STATE_FILE" ]; then
  prev_status="$(cat "$STATE_FILE" 2>/dev/null || true)"
fi

if [ "$status" != "$prev_status" ]; then
  if [ "$db_ok" = "1" ] && [ "$redis_ok" = "1" ] && [ "$worker_ok" = "1" ]; then
    notify_telegram "✅ Health check OK (DB/Redis/Worker)."
  else
    notify_telegram "⚠️ Health check FAIL: DB=${db_ok} Redis=${redis_ok} Worker=${worker_ok}."
    if [ "$worker_ok" = "0" ]; then
      restart_worker
    fi
  fi
fi

printf "%s\n" "$status" > "$STATE_FILE"
