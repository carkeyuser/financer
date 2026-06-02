# Setup, UI und Tests

Bedienoberfläche, lokale Entwicklung, Docker-Setup und Teststand.

---

## Schlüssel-Seiten

| Seite | Sidebar-Label | Inhalt |
|---|---|---|
| `/dashboard` | Dashboard | Widget-Grid (11 Typen): KPIs, Charts, Positionen, Uhr, Marktkalender, Top/Flop, Haushalt, Währungen, Vermögen, Dividenden |
| `/investments` | Investments | Portfolio-Header, Charts, Asset-Cards/Liste (DnD); Filter/Sort nach Depot; Buttons **Import**, **Zusammenführen** (Admin) |
| `/investments/new` | — | SecuritySearch + AssetForm (inkl. Konto-Feld) |
| `/investments/[id]` | — | Asset-Detail: 4 KPI-Cards (Wert, G/V, Menge, VWAP) je mit Inline-Edit; RefreshCw-Button für Yahoo-Kurs; Entry-Tabelle mit QUANTITY_UPDATE/VWAP_UPDATE-Badges; AssetEntryEditDialog |
| `/dividenden` | Dividenden | Manuelle Dividenden-Buchungen auf bestehende Positionen, Jahres-KPIs, Monats-Chart, Positionsübersicht |
| `/haushaltskasse` | Haushaltskasse | Jahrestabelle: Einnahmen, Fixkosten, Restgeld, Auszahlung, Quartals-Bonus |
| `/haushaltskasse/simulation` | Simulation (Subtab) | Gespeicherte Haushaltskassen-Szenarien mit frei wählbarem Zeitraum |
| `/household` | Benutzer | Mitgliederliste, User direkt anlegen, Invite-Link |
| `/settings` | Einstellungen | Profil, Passwort, 2FA, Datensicherung (Backup/Restore) |

**Sidebar-Einträge (Reihenfolge):**
1. Dashboard (`LayoutDashboard`)
2. Investments (`TrendingUp`)
3. Dividenden (`DollarSign`)
4. Haushaltskasse (`PiggyBank`)
   - Simulation (`Calculator`) als Desktop-Subtab
5. Benutzer (`Users`)
6. Einstellungen (`Settings`)

---

## Dev-Setup

### Erster Start

```powershell
npm install
cp .env.example .env.local
# DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL, AUTH_TRUST_HOST=true eintragen

npx prisma generate
npx prisma migrate deploy    # alle Migrationen anwenden
npx prisma db seed           # Demo-User + Fixkosten
npm run dev
```

### Netzwerkzugriff (LAN)

Wenn der Browser die App über eine andere IP aufruft als `NEXTAUTH_URL` (z. B. `192.168.x.x:3000`):

**`next.config.ts`:** `allowedDevOrigins: ["192.168.x.x"]` (eigene LAN-IP eintragen)  
**`.env.local`:** `AUTH_TRUST_HOST=true`  
**`src/lib/auth.ts`:** `trustHost: true` direkt im `NextAuth({...})`-Objekt setzen — nötig, wenn der Browser-Host von `NEXTAUTH_URL` abweicht (LAN-IP vs. localhost); ohne diesen Wert schlagen Login/Callbacks auf Self-hosted fehl.

**Produktion:** `ALLOW_REGISTRATION=false` in `.env`, wenn keine öffentliche Registrierung gewünscht ist (Invite-only bleibt über Token möglich).

### Layout-Regel: AuthGuard nur im `layout.tsx`

Jede Hauptroute hat `layout.tsx` mit `<AuthGuard>`. Page-Komponenten dürfen `AuthGuard` **nicht** nochmal wrappen — das erzeugt eine doppelte Sidebar.

### Prisma 7 — Breaking Changes

- Kein `url` im Schema — URL kommt aus `prisma.config.ts` (CLI) bzw. Adapter (Runtime)
- Driver Adapter Pflicht: `@prisma/adapter-pg` im PrismaClient-Konstruktor
- Import-Pfad: immer `from "@/generated/prisma"` — nie `from "@prisma/client"`
- `prisma migrate dev` ist interaktiv → manuell SQL schreiben + `prisma migrate deploy`
- **Nach Schema-Änderungen:** `npx prisma generate` ausführen
- **Nach manuellen SQL-Migrationen:** `npx prisma migrate deploy` lokal nachziehen

### Nützliche Befehle

```bash
npm run dev                            # Dev-Server (localhost:3000)
npm run build                          # Production-Build prüfen
npm run lint                           # ESLint
npm run test                           # Unit-Tests (vitest run)
npm run test:watch                     # vitest watch

npx prisma studio                      # DB-Daten im Browser
npx prisma migrate deploy              # Migrationen anwenden
npx prisma db seed                     # Demo-Daten
npx prisma generate                    # Client nach Schema-Änderung
```

### Git: Commit-E-Mail privat halten

GitHub zeigt in `.patch`-URLs die **Author-/Committer-E-Mail** aus dem Commit — nicht nur den Hash. Für öffentliche Repos:

1. GitHub → **Settings → Emails** → „Keep my email addresses private“ aktivieren.
2. Commits nur mit der No-Reply-Adresse (Format `ID+login@users.noreply.github.com`, bei diesem Repo z. B. `289468508+carkeyuser@users.noreply.github.com`).

**Nur für dieses Repo** (ohne globale `git config`):

```powershell
git config user.email "289468508+carkeyuser@users.noreply.github.com"
git config user.name "Financer"
```

Oder pro Commit:

```powershell
git -c user.email="289468508+carkeyuser@users.noreply.github.com" -c user.name="Financer" commit -m "..."
```

**Bereits gepushte Commits mit echter E-Mail umschreiben** (History ändert sich — Force-Push nötig):

```powershell
git filter-repo --force --email-callback "if email == b'<alte-email>':
    return b'289468508+carkeyuser@users.noreply.github.com'
return email"
git remote add origin https://github.com/carkeyuser/financer.git   # filter-repo entfernt origin
git push --force origin main
git push --force origin <branch>
```

Prüfen: `https://github.com/carkeyuser/financer/commit/<hash>.patch` — dort nur noch No-Reply. Alte Hashes sind nach Force-Push in der Regel nicht mehr erreichbar; GitHub kann Diffs kurz cachen.

### Deploy auf dem Server (Docker)

→ Vollständige Anleitung: **[`deploy.md`](deploy.md)**

**Kurzform:**

| Modus (`.env`) | Update |
|---|---|
| `FINANCER_DEPLOY_MODE=build` (Default) | `git pull && docker compose up -d --build` |
| `FINANCER_DEPLOY_MODE=ghcr` | `compose -f docker-compose.yml -f docker-compose.prod.yml pull && up -d` |

Beide: `./scripts/update.sh` — Details in [`deploy.md`](deploy.md)

Hard-Reset: `bash /path/to/financer/scripts/deploy.sh`

`docker-entrypoint.sh` führt bei Start `prisma db push` aus (Produktions-DB ohne Migrationshistorie — siehe D-01 in `README.md`). Runtime-Image: Standalone + nur Prisma-CLI/dotenv, kein Builder-`node_modules`. Lokal: `npx prisma migrate deploy` für vollständige Migrationen.

---

## Docker-Setup

> Vollständige Deployment-Dokumentation (Server-Setup, Docker-Install, Backup, Troubleshooting): [`../README.md`](../README.md)

### Architektur

```text
finance_app (Next.js :3000) ←──── finance_net (Bridge) ────→ finance_db (PostgreSQL :5432)
```

- Postgres-Port **nicht** nach außen exposed — nur intern im `finance_net`-Netzwerk erreichbar
- `app` startet erst wenn `db` gesund ist (`healthcheck`)
- Beim Container-Start läuft `prisma db push` (Schema-Sync, kein `migrate deploy` auf dem Server)

### `docker-compose.yml` (Kurzfassung)

```yaml
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    # Kein ports-Mapping → DB nur intern erreichbar
    networks: [finance_net]
    healthcheck: ...

  app:
    build: .
    restart: unless-stopped
    depends_on: { db: { condition: service_healthy } }
    ports: ["3000:3000"]
    networks: [finance_net]
    # ENTRYPOINT: docker-entrypoint.sh (db push + node server.js)

networks:
  finance_net:
    driver: bridge
```

### Deployment (Kurzform)

```powershell
# Windows → Server kopieren + Docker-Rebuild
.\push -Deploy

# Nur kopieren (Build manuell auf dem Server):
.\push
ssh root@YOUR_SERVER
cd /path/to/financer
cp .env.example .env && nano .env   # einmalig
docker compose up -d --build
```

### Release-Checkliste

Bei jedem Release (Version-Bump + Deploy):

1. `package.json` — `version` erhöhen (SemVer)
2. [`CHANGELOG.md`](../CHANGELOG.md) — Abschnitt für neue Version
3. [`src/data/release-notes.ts`](../src/data/release-notes.ts) — kuratierte Highlights (de/en, 3–8 Bullets)
4. Git-Tag `vX.Y.Z` + GitHub Release
5. Deploy auf Server: `git pull && docker compose up -d --build` (siehe [`plan/deploy.md`](plan/deploy.md)) — Release-Tag nur für sichtbare Versionsnummer/Update-Dialog, nicht für Code-Deploy

Nutzer sehen nach dem Deploy einmalig den Update-Dialog; Erstbesuch nach frischer Installation bleibt stumm.

---

## Tests

**200 Unit-Tests, alle grün** (Stand 2026-06-01). Vitest + Testing Library. **Keine E2E- oder API-Integration-Tests.**

### i18n (Deutsch / Englisch)

- Locales: `de` (Default), `en` — pro User in `User.locale`, JWT/Session, Umschalter unter `/settings`
- UI-Texte: `src/i18n/messages/de.ts` + `en.ts`, Client via `useI18n()` / `t("namespace.key")`
- API-Validierung: `createXSchema(sessionLocale(session))` in Routen — **keine** statischen `createXSchema("de")`-Exports
- API-Fehler: deutsche Server-Strings werden clientseitig über `translateApiError` / `API_ERROR_MAP` gemappt; neue Fehler dort ergänzen
- Release Notes: `src/data/release-notes.ts` — `highlights.de` und `highlights.en`
- Tests: `i18n.test.ts` prüft Formatierung, API-Fehler-Mapping und **Key-Parität** de/en

```bash
npm run test          # vitest run (einmalig)
npm run test:watch    # vitest (watch-Modus)
```

| Datei | Fokus | Tests |
|---|---|---|
| `validations.test.ts` | Auth, Asset, Entry, Backup, Simulation, TR-Import-Schemas | 43 |
| `calculations.test.ts` | VWAP, Preis, G/V, Portfolio-/G/V-Historie | 26 |
| `asset-merge.test.ts` | Merge-Vorschläge, Matching, Clique-Split | 16 |
| `tr-import-progress.test.ts` | NDJSON-Progress, ETA, gewichtete Phasen | 11 |
| `trade-republic-csv.test.ts` | CSV-Parser, Spalten, Betrag÷Stück | 9 |
| `i18n.test.ts` | Geld/Datum/%, Locale, API-Fehler, Key-Parität de/en | 16 |
| `release-notes.test.ts` | Version-Vergleich, Release-Notes | 8 |
| `household-finance.test.ts` | Monatsbereiche, Quartalsbonus, Simulation | 8 |
| `dividends.test.ts` | Manuelle Dividenden, KPIs | 6 |
| `tr-import-sort.test.ts` | Konflikt-/Ticker-Partition, Sortierung | 5 |
| `nasdaq-calendar.test.ts` | Symbol-Filter, Env-Schalter | 5 |
| `security-price.test.ts` | `resolveStoredPrice` | 5 |
| `merge-apply.test.ts` | Merge-Apply, Mengen-Recalc | 4 |
| `tr-import-ticker-mapping.test.ts` | ISIN→Ticker, Overrides | 4 |
| `tr-import-apply-progress.test.ts` | Apply-Fortschritt pro Zeile | 3 |
| `currency.test.ts` | `getEurRate` | 3 |
| `tr-import-routes.test.ts` | Preview/Apply NDJSON-Routes | 2 |
| `merge-suggestions-route.test.ts` | Merge-Suggestions NDJSON | 2 |
| `isin-resolver.test.ts` | Parallele ISIN-Auflösung | 2 |
| `interest-asset.test.ts` | Interest-Platzhalter | 2 |
| `delete-investment-account*.test.ts` | Depot leeren (Service + Route) | 2 |
| `tr-import-isin-backfill.test.ts` | ISIN-Backfill beim Import | 1 |

Weitere Testdateien siehe `src/test/`. Aktuelle Gesamtzahl: `npm run test`.

---

## Self-hosted — Troubleshooting

| Symptom | Ursache | Maßnahme |
|---|---|---|
| Seite reagiert nicht / Log: `failed to pipe response`, viele `api.nasdaq.com` Timeouts | Marktkalender-Widget blockiert Server | `MARKET_CALENDAR_EXTERNAL=false` in Server-`.env`, Rebuild; oder Widget im Dashboard deaktivieren |
| Keine Live-Kurse | Yahoo nicht erreichbar vom Container | Outbound-HTTPS prüfen; Kurse manuell per PRICE_UPDATE |
| Login von anderer IP | `NEXTAUTH_URL` / Host-Mismatch | `AUTH_TRUST_HOST=true`, `NEXTAUTH_URL` auf öffentliche URL setzen |

**Empfohlene Server-`.env`-Ergänzung** (ohne Nasdaq-Zugang):

```env
MARKET_CALENDAR_EXTERNAL=false
```
