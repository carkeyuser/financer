#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# .env prüfen
if [ ! -f "$DIR/.env" ]; then
  echo "FEHLER: .env nicht gefunden."
  echo "Erstelle sie mit:"
  echo "  cp $DIR/.env.example $DIR/.env && nano $DIR/.env"
  exit 1
fi

# Image laden
echo "→ Docker-Image laden..."
docker load -i "$DIR/finance_app.tar.gz"

# Laufende Container stoppen (graceful)
echo "→ Alte Container stoppen..."
docker compose -f "$DIR/docker-compose.yml" --env-file "$DIR/.env" down --remove-orphans 2>/dev/null || true

# Services starten
echo "→ Services starten..."
docker compose -f "$DIR/docker-compose.yml" --env-file "$DIR/.env" up -d

echo ""
echo "✓ Deployment fertig."
echo "  App: \${NEXTAUTH_URL:-http://localhost:3000}"
echo ""
echo "Logs:"
echo "  docker compose -f $DIR/docker-compose.yml logs -f app"
