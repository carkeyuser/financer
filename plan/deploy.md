# Server-Deploy (Self-hosted Docker)

Zwei gleichwertige Update-Pfade — Modus einmalig in `.env` setzen (`FINANCER_DEPLOY_MODE`).

---

## Modus wählen (einmalig)

In `.env` auf dem Server:

```env
# Standard: Repo klonen, lokal bauen
FINANCER_DEPLOY_MODE=build

# Alternative: vorgefertigtes Image von GHCR (kein Build auf dem Server)
# FINANCER_DEPLOY_MODE=ghcr
# FINANCER_IMAGE=ghcr.io/carkeyuser/financer:latest
```

| Modus | Wann sinnvoll | Update-Befehl |
|---|---|---|
| **build** (Default) | Git-Clone, Entwickler-Server, schnellste Code-Updates von `main` | `git pull && docker compose up -d --build` |
| **ghcr** | Schwacher Server, kein Build-Tooling gewünscht | `docker compose -f docker-compose.yml -f docker-compose.prod.yml pull && … up -d` |

Beide Modi: `./scripts/update.sh` (liest `FINANCER_DEPLOY_MODE` aus `.env`).

---

## Modus `build` (Standard)

**Erstinstallation** (Git-Clone):

```bash
git clone https://github.com/carkeyuser/financer.git /opt/financer
cd /opt/financer
cp .env.example .env && nano .env   # FINANCER_DEPLOY_MODE=build (Default)
docker compose up -d --build
```

**Update nach Push auf `main`:**

```bash
cd /opt/financer
git pull
docker compose up -d --build
```

**Oder:**

```bash
bash /opt/financer/scripts/update.sh
```

**Hard-Reset auf `origin/main`** (z. B. nach lokalem Experiment):

```bash
bash /opt/financer/scripts/deploy.sh
```

(`deploy.sh` = `git fetch` + `reset --hard origin/main` + `compose up -d --build` + Health-Check)

`--build` ist **Pflicht** — nur `docker compose up -d` startet den alten Container neu.

---

## Modus `ghcr`

GHCR-Image wird bei jedem Push auf `main` (und bei Release-Tags) von CI gebaut.

**Erstinstallation:**

```bash
git clone https://github.com/carkeyuser/financer.git /opt/financer
cd /opt/financer
cp .env.example .env && nano .env
# FINANCER_DEPLOY_MODE=ghcr setzen
docker compose -f docker-compose.yml -f docker-compose.prod.yml pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

Bei **privatem** GHCR-Paket einmalig: `docker login ghcr.io`

**Update:**

```bash
cd /opt/financer
docker compose -f docker-compose.yml -f docker-compose.prod.yml pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

**Oder:**

```bash
bash /opt/financer/scripts/update.sh
```

(`update.sh` zieht bei `ghcr` optional `git pull` für Compose-/Skript-Änderungen, App-Code kommt aus dem Image.)

---

## Von Windows (optional, Modus `build`)

Wenn der Code nicht per Git auf dem Server liegt:

```powershell
.\push -Deploy
```

Kopiert nach `/opt/financer` und führt `docker compose up -d --build` aus.

---

## Release vs. Alltags-Deploy

| Anlass | build | ghcr |
|---|---|---|
| **Commit auf `main`** | `git pull && compose up -d --build` | `compose … pull && up -d` (nach CI-Lauf) |
| **Version sichtbar** (Update-Dialog) | Zusätzlich Tag `vX.Y.Z` + Release-Notes | `:latest` folgt `main`; Tag-Images optional via `FINANCER_IMAGE` |

Release-Tag ist für Modus **build** nicht nötig. Für **ghcr** liefert CI `:latest` automatisch mit jedem `main`-Push.

---

## Pfad & SSH

- Server-Pfad: `/opt/financer`
- App-URL: Port **3000** (`NEXTAUTH_URL` in `.env`)
