#!/usr/bin/env bash
# Financer one-click install — LXC/server bootstrap or in-repo setup.
# One-liner: curl -fsSL https://raw.githubusercontent.com/carkeyuser/financer/main/install.sh | bash
set -euo pipefail

FINANCER_DIR="${FINANCER_DIR:-/opt/financer}"
FINANCER_REPO="${FINANCER_REPO:-https://github.com/carkeyuser/financer.git}"
FINANCER_REF="${FINANCER_REF:-main}"

POSTGRES_PASSWORD_PLACEHOLDER="changeme_sicher"
NEXTAUTH_SECRET_PLACEHOLDER="aendern_bitte_generieren"

usage() {
  cat <<'EOF'
Financer — One-Click Docker Installation

One-liner (frischer LXC):
  curl -fsSL https://raw.githubusercontent.com/carkeyuser/financer/main/install.sh | bash

Optional:
  FINANCER_DIR=/opt/financer   Installationsverzeichnis (Default: /opt/financer)
  FINANCER_REPO=<git-url>      Git-Repository (Default: github.com/carkeyuser/financer)
  FINANCER_REF=main            Branch oder Tag (Default: main)

Im geklonten Repo:
  ./install.sh

Flags:
  --help    Diese Hilfe
EOF
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

log() { echo "→ $*"; }
ok() { echo "✓ $*"; }
fail() { echo "✗ $*" >&2; exit 1; }

require_root_hint() {
  if ! docker info >/dev/null 2>&1; then
    if [[ "$(id -u)" -ne 0 ]]; then
      fail "Docker nicht erreichbar. Als root ausführen oder User zur docker-Gruppe hinzufügen."
    fi
  fi
}

docker_compose_ok() {
  docker compose version >/dev/null 2>&1
}

install_apt_packages() {
  local pkgs=("$@")
  if command -v apt-get >/dev/null 2>&1; then
    log "Pakete installieren: ${pkgs[*]} …"
    apt-get update -qq
    DEBIAN_FRONTEND=noninteractive apt-get install -y -qq "${pkgs[@]}"
  else
    fail "Pakete fehlen (${pkgs[*]}). Bitte manuell installieren."
  fi
}

ensure_base_tools() {
  local missing=()
  for cmd in git curl openssl; do
    command -v "$cmd" >/dev/null 2>&1 || missing+=("$cmd")
  done
  if [[ ${#missing[@]} -gt 0 ]]; then
    if [[ -f /etc/debian_version ]]; then
      install_apt_packages ca-certificates curl gnupg git openssl
    else
      fail "Fehlende Tools: ${missing[*]}. Siehe README.md"
    fi
  fi
}

install_docker_debian() {
  if docker_compose_ok; then
    ok "Docker + Compose bereits vorhanden"
    return 0
  fi

  if [[ ! -f /etc/debian_version ]]; then
    fail "Docker nicht installiert. Automatische Installation nur auf Debian — siehe README.md §4."
  fi

  log "Docker CE + Compose Plugin installieren (Debian) …"
  install_apt_packages ca-certificates curl gnupg

  install -m 0755 -d /etc/apt/keyrings
  if [[ ! -f /etc/apt/keyrings/docker.asc ]]; then
    curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc
  fi

  local codename
  codename="$(. /etc/os-release && echo "${VERSION_CODENAME:-bookworm}")"
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian ${codename} stable" \
    > /etc/apt/sources.list.d/docker.list

  apt-get update -qq
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
    docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

  systemctl enable docker >/dev/null 2>&1 || true
  systemctl start docker >/dev/null 2>&1 || true

  docker_compose_ok || fail "Docker Compose nach Installation nicht verfügbar."
  ok "Docker installiert: $(docker --version)"
}

bootstrap_clone() {
  if [[ -f docker-compose.yml ]]; then
    return 0
  fi

  log "Bootstrap: Repository nach ${FINANCER_DIR} …"
  ensure_base_tools

  if [[ -d "$FINANCER_DIR" ]]; then
    if [[ -d "$FINANCER_DIR/.git" ]]; then
      log "Verzeichnis existiert — nutze bestehendes Git-Repo"
      cd "$FINANCER_DIR"
      return 0
    fi
    if [[ -n "$(ls -A "$FINANCER_DIR" 2>/dev/null)" ]]; then
      fail "${FINANCER_DIR} existiert und ist kein Git-Repo. Leeren oder FINANCER_DIR setzen."
    fi
  fi

  mkdir -p "$(dirname "$FINANCER_DIR")"
  git clone --depth 1 -b "$FINANCER_REF" "$FINANCER_REPO" "$FINANCER_DIR"
  cd "$FINANCER_DIR"
  ok "Repository geklont nach ${FINANCER_DIR}"
}

read_env_value() {
  local key=$1
  local default=${2:-}
  local line val
  [[ -f .env ]] || { echo "$default"; return; }
  line="$(grep -E "^${key}=" .env 2>/dev/null | tail -1 || true)"
  [[ -n "$line" ]] || { echo "$default"; return; }
  val="${line#*=}"
  val="${val%$'\r'}"
  val="${val#\"}"; val="${val%\"}"
  val="${val#\'}"; val="${val%\'}"
  echo "${val:-$default}"
}

set_env_key() {
  local key=$1
  local value=$2
  local tmp
  tmp="$(mktemp)"

  if [[ -f .env ]] && grep -qE "^${key}=" .env; then
    awk -v k="$key" -v v="$value" '
      BEGIN { done=0 }
      $0 ~ "^" k "=" { print k "=" v; done=1; next }
      { print }
      END { if (!done) print k "=" v }
    ' .env > "$tmp"
  else
    [[ -f .env ]] && cp .env "$tmp" || : > "$tmp"
    echo "${key}=${value}" >> "$tmp"
  fi
  mv "$tmp" .env
}

generate_secret() {
  openssl rand -base64 32 | tr -d '/+=' | head -c 32
}

generate_password() {
  openssl rand -base64 24 | tr -d '/+=' | head -c 24
}

suggest_nextauth_url() {
  local ip=""
  if command -v ip >/dev/null 2>&1; then
    ip="$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src") print $(i+1); exit}' || true)"
  fi
  if [[ -z "$ip" ]] && command -v hostname >/dev/null 2>&1; then
    ip="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"
  fi
  if [[ -n "$ip" && "$ip" != "127.0.0.1" ]]; then
    echo "http://${ip}:3000"
  else
    echo "http://localhost:3000"
  fi
}

prompt_nextauth_url() {
  local current suggestion input
  current="$(read_env_value NEXTAUTH_URL "")"
  suggestion="$(suggest_nextauth_url)"

  if [[ -n "$current" && "$current" != "http://localhost:3000" ]]; then
    ok "NEXTAUTH_URL=${current}"
    return 0
  fi

  echo ""
  echo "URL, unter der du Financer im Browser öffnest (wichtig für Login und Session)."
  read -r -p "NEXTAUTH_URL [${suggestion}]: " input
  input="${input:-$suggestion}"
  set_env_key "NEXTAUTH_URL" "$input"
  ok "NEXTAUTH_URL=${input}"
}

setup_env() {
  if [[ ! -f .env.example ]]; then
    fail ".env.example nicht gefunden — bist du im Financer-Repo?"
  fi

  if [[ ! -f .env ]]; then
    log ".env aus .env.example anlegen …"
    cp .env.example .env
  fi

  local user pass db secret
  user="$(read_env_value POSTGRES_USER financeuser)"
  pass="$(read_env_value POSTGRES_PASSWORD "")"
  db="$(read_env_value POSTGRES_DB finance)"
  secret="$(read_env_value NEXTAUTH_SECRET "")"

  if [[ -z "$pass" || "$pass" == "$POSTGRES_PASSWORD_PLACEHOLDER" ]]; then
    pass="$(generate_password)"
    set_env_key "POSTGRES_PASSWORD" "$pass"
    ok "POSTGRES_PASSWORD generiert"
  fi

  if [[ -z "$secret" || "$secret" == "$NEXTAUTH_SECRET_PLACEHOLDER" ]]; then
    secret="$(generate_secret)"
    set_env_key "NEXTAUTH_SECRET" "$secret"
    ok "NEXTAUTH_SECRET generiert"
  fi

  set_env_key "POSTGRES_USER" "$user"
  set_env_key "POSTGRES_DB" "$db"
  set_env_key "DATABASE_URL" "postgresql://${user}:${pass}@db:5432/${db}"

  if ! grep -qE '^FINANCER_DEPLOY_MODE=' .env 2>/dev/null; then
    set_env_key "FINANCER_DEPLOY_MODE" "build"
  fi

  prompt_nextauth_url
}

is_env_truthy() {
  local v="${1,,}"
  [[ "$v" == "1" || "$v" == "true" || "$v" == "yes" || "$v" == "on" ]]
}

# App container runs as uid 1001 (nextjs); in-app update needs writable clone (not only .git)
fix_in_app_update_git_permissions() {
  local dir enabled
  dir="$(pwd)"
  enabled="$(read_env_value FINANCER_UPDATE_ENABLED false)"
  if is_env_truthy "$enabled" && [[ -d "$dir/.git" ]] && [[ "$(id -u)" -eq 0 ]]; then
    log "In-App-Update aktiv — Deploy-Verzeichnis für Container-User (1001) freigeben …"
    chown -R 1001:1001 "$dir"
    ok "Ownership angepasst (uid 1001)"
  fi
}

wait_for_db() {
  local user db i
  user="$(read_env_value POSTGRES_USER financeuser)"
  db="$(read_env_value POSTGRES_DB finance)"
  log "Warte auf PostgreSQL …"
  for i in $(seq 1 30); do
    if docker compose exec -T db pg_isready -U "$user" -d "$db" >/dev/null 2>&1; then
      ok "Datenbank bereit"
      return 0
    fi
    sleep 2
  done
  fail "Datenbank-Timeout — docker compose logs db"
}

wait_for_app() {
  log "Warte auf App (Port 3000) …"
  local i
  for i in $(seq 1 20); do
    if curl -sf http://localhost:3000/auth/login -o /dev/null 2>/dev/null; then
      ok "App erreichbar"
      return 0
    fi
    sleep 3
  done
  echo "✗ App-Health-Check fehlgeschlagen" >&2
  docker compose logs app --tail 30
  exit 1
}

start_stack() {
  log "Docker Compose Build & Start …"
  docker compose --env-file .env up -d --build
}

print_success() {
  local url dir
  url="$(read_env_value NEXTAUTH_URL http://localhost:3000)"
  dir="$(pwd)"
  echo ""
  ok "Financer läuft unter: ${url}"
  echo "  Verzeichnis: ${dir}"
  echo "  Logs:   cd ${dir} && docker compose logs -f app"
  echo "  Update: cd ${dir} && ./scripts/update.sh"
  echo ""
}

main() {
  echo ""
  echo "Financer — One-Click Installation"
  echo ""

  bootstrap_clone

  [[ -f docker-compose.yml ]] || fail "docker-compose.yml nicht gefunden in $(pwd)"

  ensure_base_tools
  install_docker_debian
  require_root_hint

  setup_env
  fix_in_app_update_git_permissions
  start_stack
  wait_for_db
  wait_for_app
  print_success
}

main "$@"
