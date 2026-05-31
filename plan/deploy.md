# Server-Deploy (LXC)

> **Merksatz für Agents:** Nach Push auf `main` reicht auf dem Server **`git pull` + `docker compose up -d --build`**. Kein Release-Tag, kein GHCR, kein `docker-compose.prod.yml`.

---

## Standard-Workflow (nach jedem Commit/Push)

**Auf dem Server** (`/opt/financer`):

```bash
cd /opt/financer
git pull
docker compose up -d --build
```

**Oder ein Befehl:**

```bash
bash /opt/financer/scripts/deploy.sh
```

(`deploy.sh` = `git fetch` + `reset --hard origin/main` + `compose up -d --build` + Health-Check)

Der Build dauert ein paar Minuten. Die App läuft danach mit dem Code aus dem Git-Checkout.

---

## Warum `--build`?

`docker compose up -d` **ohne** `--build` startet nur den **bestehenden** Container neu — **ohne** neuen Code.

`--build` baut das Image aus `/opt/financer` und startet den neuen Container.

---

## Was **nicht** tun

| Befehl | Problem |
|---|---|
| `docker compose … -f docker-compose.prod.yml up -d` | App kommt aus **GHCR** (`:latest`), nicht aus `git pull` — oft **älter** als `main` |
| Nur `git pull` | Dateien neu, **laufende App unverändert** |
| Nur `docker compose up -d` | Alter Container, **kein Rebuild** |

`docker-compose.prod.yml` ist optional (GHCR nach Release-Tag `v*`). Für den normalen Betrieb **weglassen**.

---

## Von Windows (optional)

Wenn der Code nicht per Git auf dem Server liegt, sondern per SCP:

```powershell
.\push -Deploy
```

Das kopiert den Stand nach `/opt/financer` und führt dort `docker compose up -d --build` aus.

---

## Release vs. Alltags-Deploy

| Anlass | Aktion |
|---|---|
| **Bugfix/Feature auf `main`** | Server: `git pull && docker compose up -d --build` |
| **Version sichtbar machen** (Update-Dialog, GitHub Release) | Zusätzlich lokal: `package.json`-Version, `CHANGELOG.md`, `release-notes.ts`, Tag `vX.Y.Z` |

Release-Tag ist **nicht** nötig, damit der Server neuen Code fährt.

---

## Pfad & SSH

- Server-Pfad: `/opt/financer`
- Typisch: `ssh root@YOUR_SERVER` (oder eigene IP)
- App-URL: Port **3000** (`NEXTAUTH_URL` in `.env`)
