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

is_truthy() {
  local v="${1,,}"
  [[ "$v" == "1" || "$v" == "true" || "$v" == "yes" || "$v" == "on" ]]
}

MODE="${FINANCER_DEPLOY_MODE:-$(read_env FINANCER_DEPLOY_MODE build)}"

compose_files=(-f docker-compose.yml)
if [[ "$MODE" == "ghcr" ]]; then
  compose_files+=(-f docker-compose.prod.yml)
elif [[ "$MODE" != "build" ]]; then
  echo "FEHLER: FINANCER_DEPLOY_MODE='$MODE' unbekannt (build|ghcr)"
  exit 1
fi
if is_truthy "$(read_env FINANCER_UPDATE_ENABLED false)"; then
  compose_files+=(-f docker-compose.update.yml)
fi

compose() {
  docker compose "${compose_files[@]}" "$@"
}

case "$MODE" in
  ghcr)
    echo "→ Deploy-Modus: GHCR (pull + up -d)"
    if [ -d .git ]; then
      echo "→ git pull (Compose/Config) …"
      git pull --ff-only
    fi
    compose pull
    compose up -d
    ;;
  build)
    echo "→ Deploy-Modus: Build (git pull + up -d --build)"
    if [ -d .git ]; then
      git pull --ff-only
    fi
    compose up -d --build
    ;;
esac

echo "✓ Update fertig."
