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

LATEST_TAG="$(curl -fsSL --connect-timeout 5 --max-time 10 -H "$AUTH_HEADER" "$REPO_URL" | node -e "const fs=require('fs');const data=JSON.parse(fs.readFileSync(0,'utf8'));console.log(data.tag_name||'');")"
LATEST_VERSION="${LATEST_TAG#v}"

if [ -z "$LATEST_VERSION" ]; then
  echo "Unable to detect latest release tag."
  exit 1
fi

if [ "$LATEST_VERSION" = "$LOCAL_VERSION" ]; then
  echo "No update available. Current version: $LOCAL_VERSION"
  exit 0
fi

echo "Update available: $LOCAL_VERSION -> $LATEST_VERSION"
if [[ "${1:-}" != "--yes" ]]; then
  read -rp "Pull latest and rebuild now? (y/N): " CONFIRM || true
  if [[ ! "${CONFIRM}" =~ ^[Yy]$ ]]; then
    exit 0
  fi
fi

if ! git pull --ff-only; then
  echo "git pull failed. Resolve local changes/conflicts then re-run."
  exit 1
fi
npm ci || npm install
npm run prisma:migrate
npm run build

echo "Update complete. Restart web + worker processes (pm2/systemd)."
