#!/usr/bin/env bash
# Server-Deploy: GHCR pull + restart (kein lokaler Build).
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/financer}"
COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
cd "$APP_DIR"

echo "→ Fetch origin/main …"
git fetch origin main
git reset --hard origin/main

echo "→ Pull images …"
$COMPOSE pull

echo "→ Start containers …"
$COMPOSE up -d

echo "→ Health check …"
for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -sf http://localhost:3000/auth/login -o /dev/null; then
    echo "✓ App erreichbar"
    exit 0
  fi
  sleep 3
done

echo "✗ Health check fehlgeschlagen"
$COMPOSE logs app --tail 30
exit 1
