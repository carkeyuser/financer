#!/usr/bin/env bash
# Update running Financer stack — mode from FINANCER_DEPLOY_MODE in .env (build|ghcr).
set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
cd "$APP_DIR"

if [ ! -f .env ]; then
  echo "FEHLER: .env nicht gefunden in $APP_DIR"
  echo "  cp .env.example .env && nano .env"
  exit 1
fi

read_env() {
  local key=$1
  local default=$2
  local line val
  line="$(grep -E "^${key}=" .env 2>/dev/null | tail -1 || true)"
  if [ -z "$line" ]; then
    echo "$default"
    return
  fi
  val="${line#*=}"
  val="${val%$'\r'}"
  val="${val#\"}"; val="${val%\"}"
  val="${val#\'}"; val="${val%\'}"
  echo "${val:-$default}"
}

MODE="${FINANCER_DEPLOY_MODE:-$(read_env FINANCER_DEPLOY_MODE build)}"

compose_ghcr() {
  docker compose -f docker-compose.yml -f docker-compose.prod.yml "$@"
}

case "$MODE" in
  ghcr)
    echo "→ Deploy-Modus: GHCR (pull + up -d)"
    if [ -d .git ]; then
      echo "→ git pull (Compose/Config) …"
      git pull --ff-only
    fi
    compose_ghcr pull
    compose_ghcr up -d
    ;;
  build)
    echo "→ Deploy-Modus: Build (git pull + up -d --build)"
    if [ -d .git ]; then
      git pull --ff-only
    fi
    docker compose up -d --build
    ;;
  *)
    echo "FEHLER: FINANCER_DEPLOY_MODE='$MODE' unbekannt (build|ghcr)"
    exit 1
    ;;
esac

echo "✓ Update fertig."
