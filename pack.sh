#!/usr/bin/env bash
set -euo pipefail

IMAGE="finance-app"
TAG="latest"
OUT="finance_deploy.tar.gz"
WORK="$(mktemp -d)"

echo "→ Docker-Image bauen..."
docker build -t "$IMAGE:$TAG" .

echo "→ Image als tar speichern..."
docker save "$IMAGE:$TAG" | gzip > "$WORK/finance_app.tar.gz"

echo "→ Deployment-Dateien bündeln..."
cp docker-compose.yml "$WORK/"
cp .env.example       "$WORK/"
cp deploy.sh          "$WORK/"

echo "→ Paket erstellen..."
tar czf "$OUT" -C "$WORK" .
rm -rf "$WORK"

SIZE=$(du -sh "$OUT" | cut -f1)
echo ""
echo "✓ $OUT ($SIZE)"
echo ""
echo "Auf Testserver kopieren:"
echo "  scp $OUT root@YOUR_SERVER:/path/to/financer/"
echo ""
echo "Erstmalig auf dem Server:"
echo "  ssh root@YOUR_SERVER"
echo "  mkdir -p /path/to/financer && cd /path/to/financer"
echo "  tar xzf finance_deploy.tar.gz"
echo "  cp .env.example .env && nano .env   # Passwörter + NEXTAUTH_SECRET setzen"
echo "  chmod +x deploy.sh && ./deploy.sh"
echo ""
echo "Bei jedem Update:"
echo "  scp $OUT root@YOUR_SERVER:/path/to/financer/"
echo "  ssh root@YOUR_SERVER 'cd /path/to/financer && tar xzf finance_deploy.tar.gz && ./deploy.sh'"
