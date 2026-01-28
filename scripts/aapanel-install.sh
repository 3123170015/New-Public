#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required. Please install Node.js LTS in aaPanel."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required. Please install Node.js + npm in aaPanel."
  exit 1
fi

prompt() {
  local var_name="$1"
  local label="$2"
  local default_value="$3"
  local value=""
  read -rp "${label} [${default_value}]: " value || true
  if [ -z "$value" ]; then
    value="$default_value"
  fi
  printf -v "$var_name" '%s' "$value"
}

DEFAULT_SITE_URL="https://your-domain.com"
DEFAULT_DB_URL="mysql://videoshare:password@127.0.0.1:3306/videoshare"
DEFAULT_REDIS_URL="redis://127.0.0.1:6379"
DEFAULT_AUTH_SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"

echo "== aaPanel install helper (Stable 7.0.x) =="
prompt SITE_URL "SITE_URL" "$DEFAULT_SITE_URL"
prompt NEXTAUTH_URL "NEXTAUTH_URL" "$SITE_URL"
prompt AUTH_SECRET "AUTH_SECRET" "$DEFAULT_AUTH_SECRET"
prompt DATABASE_URL "DATABASE_URL" "$DEFAULT_DB_URL"
prompt REDIS_URL "REDIS_URL" "$DEFAULT_REDIS_URL"
prompt R2_ACCOUNT_ID "R2_ACCOUNT_ID" ""
prompt R2_ACCESS_KEY_ID "R2_ACCESS_KEY_ID" ""
prompt R2_SECRET_ACCESS_KEY "R2_SECRET_ACCESS_KEY" ""
prompt R2_BUCKET "R2_BUCKET" ""
prompt R2_PUBLIC_BASE_URL "R2_PUBLIC_BASE_URL" ""

ENV_CONTENT=$(cat <<EOF
SITE_URL="${SITE_URL}"
NEXTAUTH_URL="${NEXTAUTH_URL}"
AUTH_SECRET="${AUTH_SECRET}"
DATABASE_URL="${DATABASE_URL}"
REDIS_URL="${REDIS_URL}"

# Cloudflare R2
R2_ACCOUNT_ID="${R2_ACCOUNT_ID}"
R2_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}"
R2_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}"
R2_BUCKET="${R2_BUCKET}"
R2_PUBLIC_BASE_URL="${R2_PUBLIC_BASE_URL}"
EOF
)

echo ""
echo "== Environment preview (.env) =="
echo "$ENV_CONTENT"
echo ""

read -rp "Write .env to ${ROOT_DIR}/.env? (y/N): " WRITE_ENV || true
if [[ "${WRITE_ENV}" =~ ^[Yy]$ ]]; then
  printf "%s\n" "$ENV_CONTENT" > "${ROOT_DIR}/.env"
  echo ".env written."
else
  echo "Skipped writing .env. Copy the output above into aaPanel Env config."
fi

echo ""
echo "== Installing dependencies =="
npm ci || npm install

echo ""
echo "== Prisma generate =="
npm run prisma:generate

read -rp "Run prisma migrate deploy now? (Y/n): " RUN_MIGRATE || true
if [[ -z "${RUN_MIGRATE}" || "${RUN_MIGRATE}" =~ ^[Yy]$ ]]; then
  npm run prisma:migrate
else
  echo "Skipped prisma migrate deploy."
fi

echo ""
echo "== Build =="
npm run build

echo ""
echo "Install finished. Start web/worker with PM2 or systemd, then verify:"
echo "  - /api/verify"
echo "  - /api/verify/worker"
