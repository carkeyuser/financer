# Server-Deploy (Self-hosted Docker)

Zwei gleichwertige Update-Pfade — Modus einmalig in `.env` setzen (`FINANCER_DEPLOY_MODE`).

Setze `DEPLOY_DIR` auf dein Installationsverzeichnis (Beispiele unten: `/opt/financer`).

---

## Kurz: So pullst du auf dem Server

**Warum nicht nur `docker compose pull && up -d`?** Ein einfaches `docker compose` liest nur [`docker-compose.yml`](../docker-compose.yml). Bei **GHCR** fehlt dann das Prod-Overlay (falsches Image). Bei **In-App-Update** fehlen Socket- und `/deploy`-Mount. Außerdem liegt `update.sh` und die Compose-Dateien im **Git-Clone**, nicht im Container-Image — deshalb immer **`git pull`** (oder `scripts/update.sh`, das das mitmacht).

### Empfohlen (ein Befehl)

```bash
cd /opt/financer
bash scripts/update.sh
```

Das Skript macht: `git pull --ff-only` + die richtigen Compose-Dateien (`prod` bei GHCR, `update` wenn `FINANCER_UPDATE_ENABLED=true`).

### Alternativ: kurze Compose-Befehle

**Einmalig** in `.env` (oder in `~/.bashrc` auf dem Server):

```env
FINANCER_DEPLOY_MODE=ghcr
COMPOSE_FILE=docker-compose.yml:docker-compose.prod.yml:docker-compose.update.yml
```

`docker-compose.update.yml` nur in `COMPOSE_FILE`, wenn In-App-Update aktiv ist. Sonst:

```env
COMPOSE_FILE=docker-compose.yml:docker-compose.prod.yml
```

**Danach bei jedem Update:**

```bash
cd /opt/financer
git pull --ff-only
docker compose pull
docker compose up -d
```

### Wann `git checkout --`?

Nur wenn `git pull` abbricht, weil du **getrackte** Dateien lokal geändert hast (z. B. `docker-compose.update.yml`). Nicht bei normalem Betrieb. **`.env` nie committen** — dort sind Secrets und `FINANCER_*`; Git überschreibt `.env` nicht.

| Situation | Befehl |
|---|---|
| Normal (GHCR + In-App-Update) | `bash scripts/update.sh` |
| Normal (kurz, mit `COMPOSE_FILE`) | `git pull` → `docker compose pull` → `docker compose up -d` |
| Nur App-Image, Config egal | `docker compose -f docker-compose.yml -f docker-compose.prod.yml pull && … up -d` |
| `git pull` Konflikt an `docker-compose.update.yml` | `git checkout -- docker-compose.update.yml` dann `git pull --ff-only` und `bash scripts/update.sh` (ab `main` macht `update.sh` das automatisch) |

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
| **ghcr** | Schwacher Server, kein Build-Tooling gewünscht | `bash scripts/update.sh` (siehe [Kurz](#kurz-so-pullst-du-auf-dem-server)) |

Beide Modi: [`scripts/update.sh`](../scripts/update.sh) (liest `FINANCER_DEPLOY_MODE` und optional `FINANCER_UPDATE_ENABLED` aus `.env`).

---

## Modus `build` (Standard)

**Erstinstallation** (One-Liner — empfohlen für frischen LXC):

```bash
curl -fsSL https://raw.githubusercontent.com/carkeyuser/financer/main/install.sh | bash
```

Installiert bei Bedarf Docker (Debian), klont nach `/opt/financer`, legt `.env` an, startet `docker compose up -d --build`. Alternativ nach manuellem Clone: `./install.sh`.

**Erstinstallation** (manuell):

```bash
git clone https://github.com/carkeyuser/financer.git /path/to/financer
cd /path/to/financer
cp .env.example .env && nano .env   # FINANCER_DEPLOY_MODE=build (Default)
docker compose up -d --build
```

**Update nach Push auf `main`:**

```bash
cd /path/to/financer
git pull
docker compose up -d --build
```

**Oder:**

```bash
bash /path/to/financer/scripts/update.sh
```

**Hard-Reset auf `origin/main`** (z. B. nach lokalem Experiment):

```bash
bash /path/to/financer/scripts/deploy.sh
```

(`deploy.sh` = `git fetch` + `reset --hard origin/main` + `compose up -d --build` + Health-Check)

`--build` ist **Pflicht** — nur `docker compose up -d` startet den alten Container neu.

---

## Modus `ghcr`

GHCR-Image wird bei jedem Push auf `main` (und bei Release-Tags) von CI gebaut. **Pipeline:** `quality` (lint/test) und `build` (`next build`) laufen **parallel**; der Docker-Job packt danach nur noch das Standalone-Artefakt (`Dockerfile.ci`) — kein zweiter `next build` im Container. **Ausnahme:** Commits, die nur Markdown/`plan/**`/`release-notes.ts` ändern, lösen keine CI aus (Tag `v*` immer).

**Erstinstallation:**

```bash
git clone https://github.com/carkeyuser/financer.git /path/to/financer
cd /path/to/financer
cp .env.example .env && nano .env
# FINANCER_DEPLOY_MODE=ghcr setzen
docker compose -f docker-compose.yml -f docker-compose.prod.yml pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

Bei **privatem** GHCR-Paket einmalig: `docker login ghcr.io`

**Update:** [`bash scripts/update.sh`](#kurz-so-pullst-du-auf-dem-server) im Installationsverzeichnis (empfohlen).

---

## Von Windows (optional, Modus `build`)

Wenn der Code nicht per Git auf dem Server liegt:

```powershell
.\push -Deploy
```

Kopiert ins Deployment-Verzeichnis (in `push.ps1` konfigurierbar) und führt `docker compose up -d --build` aus.

---

## Release vs. Alltags-Deploy

| Anlass | build | ghcr |
|---|---|---|
| **Commit auf `main`** | `git pull && compose up -d --build` | `compose … pull && up -d` (nach CI-Lauf) |
| **Version sichtbar** (Update-Dialog) | Zusätzlich Tag `vX.Y.Z` + Release-Notes | `:latest` folgt `main`; Tag-Images optional via `FINANCER_IMAGE` |

Release-Tag ist für Modus **build** nicht nötig. Für **ghcr** liefert CI `:latest` automatisch mit jedem `main`-Push.

---

## In-App-Update (F-46)

Updates aus **Einstellungen** (nur OWNER/ADMIN), ohne SSH. Standard: **deaktiviert**.

**Voraussetzungen:**

1. In `.env` auf dem Server:
   ```env
   FINANCER_UPDATE_ENABLED=true
   FINANCER_HOST_APP_DIR=/opt/financer
   FINANCER_DOCKER_GID=999
   ```
   `FINANCER_HOST_APP_DIR` = **Host-Pfad** für das Volume (`…:/deploy` im Container). Die App nutzt intern immer `/deploy`.
   `FINANCER_DOCKER_GID` = GID der Docker-Gruppe auf dem Host (`getent group docker`).
2. Stack starten — am einfachsten nach Änderung an `.env`:
   ```bash
   bash scripts/update.sh
   ```
   (bindet `docker-compose.update.yml` automatisch ein, wenn `FINANCER_UPDATE_ENABLED=true`.)

**Ablauf:** Die App führt [`scripts/update.sh`](scripts/update.sh) im gemounteten Host-Verzeichnis `/deploy` aus (gleiche Logik wie manuelles Update). Während `docker compose up` kann die Verbindung abbrechen — die UI wartet danach per Health-Check auf `/auth/login`.

**Sicherheit:** Docker-Socket-Zugriff entspricht praktisch Root-Rechten auf dem Host. Nur auf vertrauenswürdigen Self-hosted-Instanzen aktivieren.

**Fehler `.next/BUILD_ID fehlt` (Restart-Loop, GHCR):** Das Image enthält kein gültiges Next-Standalone (oft zusätzlich `plan/`, `src/` unter `/app`). Ursache war `cp -r` beim CI-Artefakt (folgt Symlinks). Ab Fix auf `main`: CI nutzt `cp -a` + Build-Check. **Sofort:** `FINANCER_DEPLOY_MODE=build` und `bash scripts/update.sh`. **Nach neuem Image:** `docker compose pull` und `up -d --force-recreate`. Prüfen:

```bash
docker run --rm --entrypoint sh ghcr.io/carkeyuser/financer:latest -c "test -f /app/.next/BUILD_ID && ! test -d /app/src && echo OK"
```

**Fehler `Could not find a production build in the ./.next directory` (Restart-Loop):** Der Container nutzt oft **nicht** das GHCR-Standalone-Image, sondern ein altes lokales `finance-app:latest` ohne Build. Prüfen: `docker inspect finance_app --format '{{.Config.Image}}'` → sollte `ghcr.io/carkeyuser/financer:…` sein. Fix:

```bash
# .env
FINANCER_DEPLOY_MODE=ghcr
COMPOSE_FILE=docker-compose.yml:docker-compose.prod.yml:docker-compose.update.yml
FINANCER_IMAGE=ghcr.io/carkeyuser/financer:0.1.5

docker compose down
docker compose pull
docker compose up -d --force-recreate
```

Alternativ zuverlässig: `FINANCER_DEPLOY_MODE=build` und `bash scripts/update.sh` (baut auf dem Server mit `Dockerfile`).

**Fehler `dubious ownership` / Exit-Code 128:** Git im App-Container lehnt `/deploy` ab, wenn der Clone auf dem Host einem anderen User gehört (z. B. `root`). Ab `scripts/update.sh` mit `safe.directory` (siehe `main`) — bis `git pull` auf dem Host nachgezogen ist, einmal per SSH im Installationsverzeichnis:

```bash
cd /opt/financer   # dein FINANCER_HOST_APP_DIR
git pull --ff-only
bash scripts/update.sh
```

---

## Pfad & SSH

- Deployment-Verzeichnis: frei wählbar (Platzhalter in Docs: `/path/to/financer`; in `push.ps1` `$Dest` anpassen)
- App-URL: wie in `NEXTAUTH_URL` in `.env` (Compose mappt den App-Port standardmäßig auf den Host)
