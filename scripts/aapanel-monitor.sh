#!/usr/bin/env bash
set -euo pipefail

HOST="${MONITOR_HOST:-127.0.0.1}"
PORT="${MONITOR_PORT:-3000}"
BASE_URL="http://${HOST}:${PORT}"
STATE_FILE="${MONITOR_STATE_FILE:-/tmp/videoshare-monitor.state}"
CONNECT_TIMEOUT="${MONITOR_CONNECT_TIMEOUT:-5}"
MAX_TIME="${MONITOR_MAX_TIME:-10}"

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

db_ok=0
redis_ok=0
worker_ok=0

verify_json="$(curl -fsSL --connect-timeout "$CONNECT_TIMEOUT" --max-time "$MAX_TIME" "${BASE_URL}/api/verify" || true)"
if [ -n "$verify_json" ]; then
  read -r db_ok redis_ok <<<"$(printf '%s' "$verify_json" | node -e "const fs=require('fs');const data=JSON.parse(fs.readFileSync(0,'utf8'));const db=!!data.checks?.db?.ok;const redis=!!data.checks?.redis?.ok;process.stdout.write(`${db?1:0} ${redis?1:0}`);")"
fi

worker_json="$(curl -fsSL --connect-timeout "$CONNECT_TIMEOUT" --max-time "$MAX_TIME" "${BASE_URL}/api/verify/worker" || true)"
if [ -n "$worker_json" ]; then
  worker_ok="$(printf '%s' "$worker_json" | node -e "const fs=require('fs');const data=JSON.parse(fs.readFileSync(0,'utf8'));const ok=!!data.ok;process.stdout.write(ok?'1':'0');")"
fi

status="db=${db_ok} redis=${redis_ok} worker=${worker_ok}"
prev_status=""
if [ -f "$STATE_FILE" ]; then
  prev_status="$(cat "$STATE_FILE" 2>/dev/null || true)"
fi

if [ "$status" != "$prev_status" ]; then
  if [ "$db_ok" = "1" ] && [ "$redis_ok" = "1" ] && [ "$worker_ok" = "1" ]; then
    notify_telegram "✅ Health check OK (DB/Redis/Worker)."
  else
    notify_telegram "⚠️ Health check FAIL: DB=${db_ok} Redis=${redis_ok} Worker=${worker_ok}."
  fi
fi

printf "%s\n" "$status" > "$STATE_FILE"
