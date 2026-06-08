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

is_host_mount_path() {
  local path=$1
  [ -n "$path" ] && [ "$path" != "/deploy" ]
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

# In-app update runs inside the app container as nextjs (uid 1001); host clone is often root-owned.
ALPINE_GIT_IMAGE="alpine/git:2.45.2"
COMPOSE_CLI_IMAGE="${FINANCER_COMPOSE_CLI_IMAGE:-docker.io/docker:27-cli}"
GIT_CONTAINER_DIR="/deploy"
APP_CONTAINER_NAME="${FINANCER_APP_CONTAINER:-finance_app}"
TRACKED_COMPOSE_OVERLAYS=(docker-compose.update.yml docker-compose.prod.yml)

host_mount_from_docker_inspect() {
  if [ ! -S /var/run/docker.sock ]; then
    return 0
  fi
  docker inspect "$APP_CONTAINER_NAME" \
    --format '{{range .Mounts}}{{if eq .Destination "/deploy"}}{{.Source}}{{end}}{{end}}' 2>/dev/null || true
}

resolve_host_mount() {
  local candidate=""

  if is_host_mount_path "${FINANCER_HOST_MOUNT:-}"; then
    echo "$FINANCER_HOST_MOUNT"
    return
  fi

  candidate="$(read_env FINANCER_HOST_APP_DIR "")"
  if is_host_mount_path "$candidate"; then
    echo "$candidate"
    return
  fi

  candidate="$(host_mount_from_docker_inspect)"
  if is_host_mount_path "$candidate"; then
    echo "$candidate"
    return
  fi

  echo ""
}

# cwd /deploy in the app container would default project name "deploy" — must match host (/opt/financer → financer).
resolve_compose_project_name() {
  if [ -n "${COMPOSE_PROJECT_NAME:-}" ]; then
    echo "$COMPOSE_PROJECT_NAME"
    return
  fi

  local from_env host_mount
  from_env="$(read_env COMPOSE_PROJECT_NAME "")"
  if [ -n "$from_env" ]; then
    echo "$from_env"
    return
  fi

  host_mount="$(resolve_host_mount)"
  if is_host_mount_path "$host_mount"; then
    basename "$host_mount"
    return
  fi

  if [ "$APP_DIR" != "/deploy" ]; then
    basename "$APP_DIR"
    return
  fi

  echo "financer"
}

compose_project_args() {
  echo "-p" "$(resolve_compose_project_name)"
}

compose() {
  local project_args
  project_args=($(compose_project_args))

  if docker compose version >/dev/null 2>&1; then
    docker compose "${project_args[@]}" "${compose_files[@]}" "$@"
    return
  fi

  local host_mount
  host_mount="$(resolve_host_mount)"
  if ! is_host_mount_path "$host_mount"; then
    echo "FEHLER: docker compose Plugin fehlt und Host-Pfad für Fallback unbekannt" >&2
    return 1
  fi

  echo "→ docker compose via ${COMPOSE_CLI_IMAGE} (Projekt: $(resolve_compose_project_name)) …"
  docker run --rm \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -v "${host_mount}:${GIT_CONTAINER_DIR}:rw" \
    -w "${GIT_CONTAINER_DIR}" \
    -e "COMPOSE_PROJECT_NAME=$(resolve_compose_project_name)" \
    "${COMPOSE_CLI_IMAGE}" \
    compose "${project_args[@]}" "${compose_files[@]}" "$@"
}

should_use_docker_git() {
  local host_mount
  host_mount="$(resolve_host_mount)"
  [ "$(id -u)" -ne 0 ] \
    && is_host_mount_path "$host_mount" \
    && [ -S /var/run/docker.sock ]
}

git_via_docker() {
  local host_mount
  host_mount="$(resolve_host_mount)"
  if ! is_host_mount_path "$host_mount"; then
    echo "FEHLER: Host-Pfad für /deploy nicht ermittelbar (FINANCER_HOST_APP_DIR in .env oder Container-Mount)" >&2
    return 1
  fi
  docker run --rm -u root \
    -v "${host_mount}:${GIT_CONTAINER_DIR}:rw" \
    -w "${GIT_CONTAINER_DIR}" \
    "${ALPINE_GIT_IMAGE}" \
    -c "safe.directory=${GIT_CONTAINER_DIR}" \
    "$@"
}

git_direct() {
  git -c "safe.directory=${APP_DIR}" "$@"
}

git_in_deploy() {
  if should_use_docker_git; then
    git_via_docker "$@"
  else
    git_direct "$@"
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
  discard_local_compose_overlays
  if should_use_docker_git; then
    echo "→ git pull via Docker (root, Berechtigung Repo) …"
    git_via_docker pull --ff-only
    return
  fi

  echo "→ git pull (Compose/Config) …"
  if git_direct pull --ff-only; then
    return
  fi

  if [ "$(id -u)" -ne 0 ] && [ -S /var/run/docker.sock ] && is_host_mount_path "$(resolve_host_mount)"; then
    echo "→ git pull erneut via Docker (root, Berechtigung Repo) …"
    git_via_docker pull --ff-only
    return
  fi

  return 1
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
