#!/bin/sh
set -e
cd /app

if [ ! -f server.js ]; then
  echo "FEHLER: server.js fehlt — kein Next.js-Standalone-Image."
  echo "  GHCR: FINANCER_IMAGE=ghcr.io/carkeyuser/financer:0.1.5 und compose pull + up -d --force-recreate"
  echo "  Oder FINANCER_DEPLOY_MODE=build und bash scripts/update.sh"
  exit 1
fi

if [ ! -f .next/BUILD_ID ]; then
  echo "FEHLER: .next/BUILD_ID fehlt — Image unvollständig (nicht next start nutzen)."
  echo "  Prüfe: docker compose -f docker-compose.yml -f docker-compose.prod.yml config | grep image"
  exit 1
fi

./node_modules/.bin/prisma db push
exec node server.js
