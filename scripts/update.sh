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

# In-app update runs inside the app container as nextjs (uid 1001); host .git is often root-owned.
ALPINE_GIT_IMAGE="alpine/git:2.45.2"
GIT_CONTAINER_DIR="/deploy"
TRACKED_COMPOSE_OVERLAYS=(docker-compose.update.yml docker-compose.prod.yml)

resolve_host_mount() {
  if [ -n "${FINANCER_HOST_MOUNT:-}" ]; then
    echo "$FINANCER_HOST_MOUNT"
    return
  fi
  read_env FINANCER_HOST_APP_DIR ""
}

should_use_docker_git() {
  local host_mount=$1
  [ "$(id -u)" -ne 0 ] \
    && [ -n "$host_mount" ] \
    && [ -S /var/run/docker.sock ]
}

git_in_deploy() {
  local host_mount
  host_mount="$(resolve_host_mount)"
  if should_use_docker_git "$host_mount"; then
    docker run --rm -u root \
      -v "${host_mount}:${GIT_CONTAINER_DIR}:rw" \
      -w "${GIT_CONTAINER_DIR}" \
      "${ALPINE_GIT_IMAGE}" \
      -c "safe.directory=${GIT_CONTAINER_DIR}" \
      "$@"
  else
    git -c "safe.directory=${APP_DIR}" "$@"
  fi
}

discard_local_compose_overlays() {
  local f status
  for f in "${TRACKED_COMPOSE_OVERLAYS[@]}"; do
    [ -f "$f" ] || continue
    status="$(git_in_deploy status --porcelain -- "$f" 2>/dev/null || true)"
    if [ -n "$status" ]; then
      echo "→ Verwerfe lokale Änderungen an $f (Repo-Version für Pull) …"
      git_in_deploy checkout -- "$f"
    fi
  done
}

git_pull_ff() {
  local host_mount
  host_mount="$(resolve_host_mount)"
  discard_local_compose_overlays
  if should_use_docker_git "$host_mount"; then
    echo "→ git pull via Docker (root, Berechtigung .git) …"
  else
    echo "→ git pull (Compose/Config) …"
  fi
  git_in_deploy pull --ff-only
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
