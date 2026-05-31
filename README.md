# Financer — Persönliches Finanz-Dashboard

Self-hosted Finance-Dashboard für kleine Haushalte (Paar/WG). Manuelle Datenerfassung — keine Bank- oder Broker-APIs.

## Vorschau

Konfigurierbares Dashboard mit Widget-Grid — Uhr, Top/Flop, Allokation und Positionen (Light/Dark):

| Light | Dark |
|---|---|
| ![Dashboard — Light Mode](docs/screenshots/dashboard-light.png) | ![Dashboard — Dark Mode](docs/screenshots/dashboard-dark.png) |

| Bereich | Inhalt |
|---|---|
| **Investments** | Portfolio-Tracking (Aktien, ETFs, Krypto), Yahoo-Finance-Kurse, VWAP, 4 Chart-Typen, historische Kurven |
| **Haushaltskasse** | Fixkosten, Monatseinkommen, Auszahlungslogik mit Quartals-Bonus |
| **Dashboard** | Frei konfigurierbares Widget-Grid (Drag & Drop, 10 Widgets) |
| **Multi-User** | Haushalte, Rollen, Einladungen, Benutzer direkt anlegen |
| **Sicherheit** | Username + Passwort, optional 2FA (TOTP), JSON-Backup/Restore |
| **Sprache** | Deutsch / Englisch (pro User in Einstellungen) |

**Tech-Stack:** Next.js 16 · React 19 · TypeScript · PostgreSQL 16 · Prisma 7 · NextAuth v5 · shadcn/ui · Tailwind CSS v4 · Recharts  
**Deployment:** Docker Compose auf Proxmox LXC (Debian 12)  
**Projektplan:** [plan/README.md](plan/README.md) — Architektur, Schema, Backlogs, Änderungslog

---

## Inhaltsverzeichnis

1. [Vorschau](#vorschau)
2. [Funktionen im Überblick](#1-funktionen-im-überblick)
3. [Tech-Stack & Architektur](#2-tech-stack--architektur)
4. [Proxmox LXC einrichten](#3-proxmox-lxc-einrichten)
5. [Docker auf Debian 12 installieren](#4-docker-auf-debian-12-installieren)
6. [Projekt aufspielen](#5-projekt-aufspielen)
7. [Konfiguration (.env)](#6-konfiguration-env)
8. [Starten & Updates](#7-starten--updates)
9. [Erster Login & Demo-Daten](#8-erster-login--demo-daten)
10. [Datensicherung](#9-datensicherung)
11. [Nützliche Befehle (Server)](#10-nützliche-befehle-server)
12. [Lokale Entwicklung](#11-lokale-entwicklung)
13. [Tests](#12-tests)
14. [Troubleshooting](#13-troubleshooting)
15. [Bekannte Einschränkungen](#14-bekannte-einschränkungen)
16. [Projektstruktur](#15-projektstruktur)

---

## 1. Funktionen im Überblick

### Dashboard (`/dashboard`)

- Konfigurierbares Widget-Grid mit Drag & Drop und Resize
- **10 Widgets:** Portfolio-KPIs, Wert-Verlauf, Allokation, Positionen-Tabelle, Uhr, Marktkalender, Top/Flop, Haushalts-Übersicht, Währungsexposure, Vermögen
- Layout pro User in der DB gespeichert; Widget-Manager zum An-/Abschalten
- Auto-Sort-Button ordnet Widgets lückenlos an

### Investments (`/investments`)

- Wertpapiersuche via Yahoo Finance + CoinGecko (Krypto-Fallback)
- Positionen mit Depot/Konto, Besitzer, Notizen, ISIN/WKN
- Kauf/Verkauf, Nachkauf-Logik (gleicher Ticker → Menge summiert, VWAP aktualisiert)
- Inline-Korrekturen auf der Detailseite: Kurs, Menge, Ø-Kaufpreis
- 4 umschaltbare Charts: Allokation (Torte), Wert-Verlauf, G/V-Verlauf, G/V pro Position
- Historische Yahoo-Kurse in Charts (ab erstem Kaufdatum)
- Alle Werte in EUR (Wechselkurse via Yahoo Forex)
- Card-/Listen-Ansicht, Sortierung (Depot/Besitzer/Wert), Drag & Drop für Reihenfolge

### Haushaltskasse (`/haushaltskasse`)

- Fixkosten verwalten (dauerhaft sichtbar oberhalb der Jahrestabelle)
- Monatliche Einnahmen und Auszahlungen pro User
- Fixkosten-Snapshot: beim ersten Einkommenseintrag eines Monats eingefroren
- Quartals-Bonus aus Überschüssen (Theoretisch − Tatsächlich über 3 Monate)

### Benutzer & Haushalt (`/household`)

- Mitgliederliste mit Rollen (Owner, Admin, Member)
- User direkt anlegen (Owner) oder per Einladungslink (7-Tage-Token)
- Haushalts-Switcher in der Sidebar
- Admin: andere User bearbeiten (Name, Username, Passwort zurücksetzen)
- 2FA für User per Admin-Toggle aktivierbar

### Einstellungen (`/settings`)

- Profil (Anzeigename, Username), Passwort ändern
- 2FA einrichten/deaktivieren (TOTP mit QR-Code)
- Sprache: Deutsch / Englisch
- Datensicherung: JSON-Export + Restore

---

## 2. Tech-Stack & Architektur

```
Browser → Next.js App Router (Port 3000)
              ↓
         NextAuth v5 (JWT, Username + Passwort, optional 2FA)
              ↓
         Prisma 7 + @prisma/adapter-pg
              ↓
         PostgreSQL 16 (internes Docker-Netzwerk, Port 5432 nicht extern)
```

| Layer | Technologie |
|---|---|
| Framework | Next.js 16 App Router + TypeScript |
| Auth | NextAuth.js v5 (Credentials), bcryptjs, TOTP via otplib |
| Datenbank | PostgreSQL 16 + Prisma 7 (Driver Adapter `@prisma/adapter-pg`) |
| UI | shadcn/ui + Tailwind CSS v4 + next-themes (Dark/Light) |
| Charts | Recharts |
| Dashboard-Grid | react-grid-layout |
| Data Fetching | TanStack Query v5 |
| Formulare | React Hook Form + Zod (shared Schemas Frontend ↔ API) |
| DnD | @dnd-kit (Investment-Reihenfolge) |
| Kurse | Yahoo Finance (Aktien/ETFs/Forex) + CoinGecko (Krypto) |
| i18n | React Context + de/en Messages (`src/i18n/`) |
| Tests | Vitest + Testing Library |

**Multi-Tenant:** Alle Daten sind an einen `householdId` gebunden. Die ID kommt immer aus der Session (JWT) — nie aus dem Request-Body.

**Docker-Netzwerk:**

```
finance_app (Next.js :3000) ←── finance_net (Bridge) ────→ finance_db (PostgreSQL :5432)
```

Postgres-Port ist nicht nach außen exposed. Die App startet erst, wenn die DB healthy ist.

---

## 3. Proxmox LXC einrichten

### Container anlegen (Proxmox Web-UI)

| Einstellung | Empfehlung |
|---|---|
| Template | `debian-12-standard` |
| CPU | 2 Kerne |
| RAM | 2048 MB |
| Swap | 512 MB |
| Disk | 20 GB |
| Netzwerk | DHCP oder statische IP (z. B. `192.168.x.x`) |
| **Unprivileged container** | **Nein** (Docker benötigt privilegierten Modus) |

> **Wichtig:** Der Container muss **privileged** sein, damit Docker-Volumes und `cgroups` korrekt funktionieren.

### LXC-Optionen nach dem Erstellen (Proxmox Shell)

Damit Docker innerhalb des Containers läuft, müssen zwei Features aktiviert sein. In der Proxmox-Shell des Hosts (nicht des Containers):

```bash
# Container-ID anpassen (z. B. 100)
CTID=100

pct set $CTID -features keyctl=1,nesting=1
```

Anschließend den Container starten:

```bash
pct start $CTID
pct enter $CTID
```

---

## 4. Docker auf Debian 12 installieren

Alle Befehle **im LXC-Container** als `root` ausführen:

```bash
# Systemaktualisierung
apt update && apt upgrade -y

# Abhängigkeiten
apt install -y ca-certificates curl gnupg

# Docker-GPG-Schlüssel
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg \
  -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

# Docker-Repository hinzufügen
echo "deb [arch=$(dpkg --print-architecture) \
  signed-by=/etc/apt/keyrings/docker.asc] \
  https://download.docker.com/linux/debian \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Docker installieren
apt update
apt install -y docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin

# Docker beim Systemstart aktivieren
systemctl enable docker
systemctl start docker

# Prüfen
docker --version
docker compose version
```

---

## 5. Projekt aufspielen

### Option A: Von Windows mit `push.ps1` (empfohlen)

> **Entwickler-Deploy (optional):** Das Repo enthält `push.example.ps1` und `pack.example.ps1`. Kopiere sie lokal nach `push.ps1` bzw. `pack.ps1` und trage deine Server-IP ein — diese Dateien werden **nicht** committed (siehe `.gitignore`).

```powershell
# Einmalig: push.example.ps1 → push.ps1 kopieren, YOUR_SERVER anpassen
Copy-Item push.example.ps1 push.ps1

# Im Projektverzeichnis
.\push              # nur kopieren
.\push -Deploy      # kopieren + docker compose up -d --build auf dem Server
```

Das Skript kopiert alle relevanten Dateien per `robocopy` + `scp` nach `/opt/financer` auf dem Server. Mit `-Deploy` folgt direkt der Docker-Rebuild per SSH. Mehrere `ssh`/`scp`-Aufrufe teilen sich eine Session (Passwort nur einmal, sofern kein SSH-Key hinterlegt ist).

**Ausgeschlossen:** `node_modules`, `.next`, `src/generated`, `.env`/`.env.local`, `.codegraph`, `*.tsbuildinfo`, `.claude`

### Option B: Manuell per `scp`

```powershell
scp -r . root@YOUR_SERVER:/opt/financer/
# node_modules, .next und Secrets vorher manuell ausschließen
```

---

## 6. Konfiguration (.env)

**Einmalig auf dem Server:**

```bash
ssh root@YOUR_SERVER
cd /opt/financer
cp .env.example .env
nano .env
```

Datei befüllen:

```env
# PostgreSQL
POSTGRES_USER=financeuser
POSTGRES_PASSWORD=<sicheres_passwort_hier>
POSTGRES_DB=finance

# Wird von der App intern genutzt (db = Docker-Dienst-Name)
DATABASE_URL=postgresql://financeuser:<passwort>@db:5432/finance

# Zufälligen Schlüssel generieren: openssl rand -base64 32
NEXTAUTH_SECRET=<langer_zufaelliger_schluessel>

# URL unter der die App erreichbar ist
NEXTAUTH_URL=http://YOUR_SERVER:3000
```

> `.env` **nie committen** — sie enthält Secrets. Die Datei bleibt ausschließlich auf dem Server.

**Lokal (`.env.local`):** Gleiche Variablen, aber `DATABASE_URL` zeigt auf lokale PostgreSQL (z. B. `postgresql://financeuser:pass@localhost:5432/finance`). Zusätzlich für LAN-Zugriff im Dev-Modus:

```env
AUTH_TRUST_HOST=true
NEXTAUTH_URL=http://192.168.x.x:3000
```

---

## 7. Starten & Updates

### Erstmalig starten

```bash
ssh root@YOUR_SERVER
cd /opt/financer
docker compose up -d --build
```

Beim Start führt `docker-entrypoint.sh` automatisch `prisma db push` aus — das aktuelle Schema wird direkt auf die Datenbank angewendet (idempotent). Im Image liegt nur die Prisma-CLI (kein volles `node_modules` aus dem Builder).

> **Hinweis:** Production nutzt `db push`, weil die DB ursprünglich ohne Migrationshistorie aufgebaut wurde. Lokal werden die Migrationen aus `prisma/migrations/` per `npx prisma migrate deploy` angewendet.

**Status prüfen:**

```bash
docker compose ps
docker compose logs -f app
```

Die App ist erreichbar unter: `http://YOUR_SERVER:3000` (oder der in `NEXTAUTH_URL` gesetzten URL)

### Updates einspielen

**Server (Git-Deploy):**

```bash
cd /opt/financer
git pull
docker compose up -d --build
```

> `finance-app:latest` wird lokal gebaut (`pull_policy: build` in `docker-compose.yml`) — kein Docker-Hub-Login nötig.

**Von Windows (optional, mit `push.ps1`):**

```powershell
.\push -Deploy
```

Nur kopieren ohne Build: `.\push`

Schema-Änderungen werden beim Container-Start automatisch via `prisma db push` angewendet.

---

## 8. Erster Login & Demo-Daten

Nach dem ersten Start gibt es noch keinen Benutzer. Den ersten Account über die Registrierungsseite anlegen:

```
http://YOUR_SERVER:3000/auth/register
```

Dieser erste Account wird automatisch **Owner** des Haushalts. Weitere Benutzer können anschließend über **Benutzer → Benutzer anlegen** oder per Einladungslink hinzugefügt werden.

**Optional: Demo-Daten laden**

```bash
docker compose exec app ./node_modules/.bin/prisma db seed   # Seed braucht tsx — bei Fehler lokal mit DATABASE_URL seeden
```

Legt Demo-Benutzer + Standard-Fixkosten an (Miete, Versicherung, Auto, etc.).

---

## 9. Datensicherung

Es gibt zwei unabhängige Backup-Strategien:

### In-App-Backup (empfohlen für Datenmigration)

Unter **Einstellungen → Datensicherung**.

**Export** (alle Haushaltsmitglieder):
- Button „Backup erstellen" → JSON-Datei `financer-backup-YYYY-MM-DD.json`
- Enthält: Fixkosten, Monatseinkommen, Auszahlungen, Snapshots, alle Wertpapiere + Kaufhistorie
- Enthält nicht: Passwörter, Sessions, Auth-Tokens, 2FA-Secrets, Widget-Layouts

**Restore** (nur Owner/Admin):
- JSON-Datei auswählen → Bestätigungsdialog
- Löscht alle aktuellen Haushaltsdaten und ersetzt sie vollständig
- Usernames aus dem Backup werden auf aktuelle Haushaltsmitglieder gemappt

> **Wofür:** Umzug auf neuen Server, Wiederherstellung nach Fehleingaben, Datenmigration.

### Datenbank-Dump (empfohlen für vollständige Server-Backups)

Sichert die gesamte PostgreSQL-Datenbank inklusive User-Accounts und Auth-Daten:

```bash
# Dump erstellen (auf dem Server)
docker compose exec db pg_dump -U financeuser finance > backup_$(date +%Y%m%d).sql

# Wiederherstellen
docker compose exec -T db psql -U financeuser finance < backup_20260524.sql
```

> **Wofür:** Vollständige Server-Sicherung, Notfall-Recovery, regelmäßige Cronjob-Backups.

**Cronjob-Beispiel** (täglich um 3 Uhr):

```bash
0 3 * * * cd /opt/financer && docker compose exec -T db pg_dump -U financeuser finance > /backups/financer_$(date +\%Y\%m\%d).sql
```

---

## 10. Nützliche Befehle (Server)

**Container verwalten:**

```bash
docker compose ps                          # Status anzeigen
docker compose logs -f app                 # App-Logs live
docker compose logs -f db                  # DB-Logs live
docker compose down                        # Stoppen (Daten bleiben erhalten)
docker compose down -v                     # Stoppen + Volumes löschen (ACHTUNG: löscht DB!)
docker compose restart app                 # Nur App neu starten
docker compose exec app sh                 # Shell im App-Container
```

**Datenbank:**

```bash
# Direkter DB-Zugriff
docker compose exec db psql -U financeuser -d finance

# Prisma Studio (GUI, via SSH-Tunnel)
ssh -L 5555:localhost:5555 root@YOUR_SERVER \
  "cd /opt/financer && docker compose exec app ./node_modules/.bin/prisma studio"
# Dann im Browser: http://localhost:5555

# Schema-Status
docker compose exec app ./node_modules/.bin/prisma db push --dry-run
```

**Ressourcen:**

```bash
docker system df                           # Speicherverbrauch
docker compose exec db psql -U financeuser -d finance -c "\dt"  # Tabellen auflisten
```

---

## 11. Lokale Entwicklung

**Voraussetzungen:** Node.js 20+, PostgreSQL lokal oder via Docker

```powershell
npm install
cp .env.example .env.local
# DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL, AUTH_TRUST_HOST=true eintragen

npx prisma generate
npx prisma migrate deploy
npx prisma db seed          # optional
npm run dev
```

App läuft unter `http://localhost:3000`.

### Wichtige Befehle

```bash
npm run dev           # Dev-Server
npm run build         # Production-Build prüfen
npm run lint          # ESLint
npm run test          # Unit-Tests (Vitest)
npm run test:watch    # Tests im Watch-Modus

npx prisma generate            # Client nach Schema-Änderung
npx prisma migrate deploy      # Migrationen anwenden
npx prisma db seed             # Demo-Daten
npx prisma studio              # DB-GUI (http://localhost:5555)
```

### LAN-Zugriff im Dev-Modus

Wenn der Browser die App über eine andere IP aufruft als `NEXTAUTH_URL` (z. B. `192.168.x.x:3000`):

1. `.env.local`: `AUTH_TRUST_HOST=true`, `NEXTAUTH_URL=http://192.168.x.x:3000`
2. `next.config.ts`: IP in `allowedDevOrigins` eintragen
3. `src/lib/auth.ts`: `trustHost: true` ist bereits gesetzt

### Prisma 7 — Besonderheiten

- Kein `url` im Schema — URL kommt aus `prisma.config.ts` (CLI) bzw. `@prisma/adapter-pg` (Runtime)
- Import-Pfad: immer `from "@/generated/prisma"` — nie `from "@prisma/client"`
- Nach Schema-Änderungen: `npx prisma generate` + Migration anlegen/anwenden

### Layout-Regel

`AuthGuard` gehört nur ins `layout.tsx` jeder Hauptroute — nicht zusätzlich in Page-Komponenten (sonst doppelte Sidebar).

---

## 12. Tests

59 Unit-Tests mit Vitest + Testing Library:

```bash
npm run test          # einmalig
npm run test:watch    # Watch-Modus
```

| Datei | Inhalt |
|---|---|
| `calculations.test.ts` | VWAP, G/V, Portfolio-Historie, QUANTITY_UPDATE, VWAP_UPDATE |
| `validations.test.ts` | Zod-Schemas (Auth, Assets, Entries) |
| `i18n.test.ts` | Formatierung, API-Fehler-Übersetzung |

Nur Unit-Tests (Vitest) — keine E2E- oder Browser-Tests geplant.

---

## 13. Troubleshooting

### App startet nicht / Container crasht

```bash
docker compose logs app --tail 50
```

Häufige Ursachen: fehlende `.env`, falsches `DATABASE_URL`, DB noch nicht healthy.

### Build schlägt fehl (`npm run build` / `docker compose up --build`)

Lokal zuerst prüfen:

```bash
npm run build
npm run lint
```

TypeScript-Fehler blockieren den Docker-Build (Multi-Stage: `npm run build` im Builder-Stage).

### Login funktioniert nicht / Redirect-Schleife

- `NEXTAUTH_URL` muss exakt der URL entsprechen, unter der die App erreichbar ist
- Auf dem Server: `AUTH_TRUST_HOST=true` (in `docker-compose.yml` bereits gesetzt)
- Lokal über LAN: siehe [LAN-Zugriff](#lan-zugriff-im-dev-modus)

### 404 nach Abmelden

Logout leitet auf `/auth/login` weiter. Direktaufruf von `/login` wird automatisch dorthin umgeleitet.

### Wertpapiersuche findet nichts

- Yahoo Finance unterstützt **keine deutschen WKN** (z. B. `A142N1`)
- Suche mit Ticker (`EUNL.DE`, `VWCE.DE`), Name oder ISIN
- Krypto: Name oder Symbol (`Bitcoin`, `BTC`, `Ripple`)

### Kurse zeigen falsche Währung

EUR-Assets speichern den EUR-Kurs, USD-Assets den Nativkurs. Die UI rechnet alles in EUR um.

### Widget-Layout geht verloren

Layout wird in der DB pro User gespeichert. Nach Drag/Resize wird automatisch gespeichert. Bei Problemen: Browser-Cache leeren, Seite neu laden (F5).

### Prisma-Fehler nach Schema-Änderung

```bash
# Lokal
npx prisma generate
npx prisma migrate deploy

# Server (automatisch beim Start, manuell falls nötig)
docker compose exec app ./node_modules/.bin/prisma db push
docker compose restart app
```

---

## 14. Bekannte Einschränkungen

| Thema | Details |
|---|---|
| WKN-Suche | Deutsche WKN-Nummern werden von Yahoo Finance nicht unterstützt |
| Keine Bank-APIs | Alle Daten werden manuell eingegeben |
| Mobile | App ist primär für Desktop optimiert; responsive Anpassung offen |
| EUR-Historie | Historische Charts nutzen den aktuellen EUR-Kurs als Näherung |
| Widget-Layouts | Nicht im JSON-Backup enthalten |

---

## 15. Projektstruktur

```
financer/
├── docs/
│   └── screenshots/           # README-Vorschau (Dashboard Light/Dark)
├── plan/                      # Projektdokumentation, Architektur, Backlogs, Änderungslog
├── README.md                  # Diese Datei
├── .env.example               # Env-Template
├── docker-compose.yml         # PostgreSQL + Next.js
├── Dockerfile                 # Multi-Stage Build (standalone)
├── push.example.ps1           # Deploy-Vorlage (lokal → push.ps1 kopieren)
├── pack.example.ps1           # Pack-Vorlage (lokal → pack.ps1 kopieren)
├── prisma/
│   ├── schema.prisma          # DB-Schema
│   ├── prisma.config.ts       # Prisma 7 DB-URL
│   ├── seed.ts                # Demo-Daten
│   └── migrations/            # SQL-Migrationen (lokal)
└── src/
    ├── app/                   # Next.js App Router (Seiten + API Routes)
    ├── components/            # UI-Komponenten (shadcn, Dashboard, Investments, …)
    ├── hooks/                 # TanStack Query Hooks
    ├── i18n/                  # Deutsch/Englisch
    ├── lib/                   # Auth, Prisma, Validations, Utils
    ├── test/                  # Vitest Unit-Tests
    └── generated/prisma/      # Prisma 7 Client (generiert)
```

Weitere Details: [plan/README.md](plan/README.md)
