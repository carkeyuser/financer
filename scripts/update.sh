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

# In-app update runs inside the app container; /deploy is a host mount (often root-owned).
TRACKED_COMPOSE_OVERLAYS=(docker-compose.update.yml docker-compose.prod.yml)

discard_local_compose_overlays() {
  local f status
  for f in "${TRACKED_COMPOSE_OVERLAYS[@]}"; do
    [ -f "$f" ] || continue
    status="$(git -c safe.directory="$APP_DIR" status --porcelain -- "$f" 2>/dev/null || true)"
    if [ -n "$status" ]; then
      echo "→ Verwerfe lokale Änderungen an $f (Repo-Version für Pull) …"
      git -c safe.directory="$APP_DIR" checkout -- "$f"
    fi
  done
}

git_pull_ff() {
  discard_local_compose_overlays
  echo "→ git pull (Compose/Config) …"
  git -c safe.directory="$APP_DIR" pull --ff-only
}

case "$MODE" in
  ghcr)
    echo "→ Deploy-Modus: GHCR (pull + up -d)"
    if [ -d .git ]; then
      git_pull_ff
    fi
    compose pull
    compose up -d --pull always --force-recreate
    ;;
  build)
    echo "→ Deploy-Modus: Build (git pull + up -d --build)"
    if [ -d .git ]; then
      git_pull_ff
    fi
    compose up -d --build
    ;;
esac

echo "✓ Update fertig."
