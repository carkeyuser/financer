# Setup, UI und Tests

Bedienoberfläche, lokale Entwicklung, Docker-Setup und Teststand.

---

## Schlüssel-Seiten

| Seite | Sidebar-Label | Inhalt |
|---|---|---|
| `/dashboard` | Dashboard | Widget-Grid (11 Typen): KPIs, Charts, Positionen, Uhr, Marktkalender, Top/Flop, Haushalt, Währungen, Vermögen, Dividenden |
| `/investments` | Investments | Portfolio-Header, 4 Charts, Asset-Cards/Liste (DnD) |
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

Wenn der Browser die App über eine andere IP aufruft als `NEXTAUTH_URL` (z. B. `192.168.1.50:3000`):

**`next.config.ts`:** `allowedDevOrigins: ["192.168.1.50"]`  
**`.env.local`:** `AUTH_TRUST_HOST=true`  
**`src/lib/auth.ts`:** `trustHost: true` direkt im `NextAuth({...})`-Objekt setzen.

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
npm run test                           # 118 Unit-Tests (vitest run)
npm run test:watch                     # vitest watch

npx prisma studio                      # DB-Daten im Browser
npx prisma migrate deploy              # Migrationen anwenden
npx prisma db seed                     # Demo-Daten
npx prisma generate                    # Client nach Schema-Änderung
```

### Deploy auf LXC (Proxmox)

**Manuell (Git):**
```bash
cd /opt/financer && git pull && docker compose up -d --build
```

Oder mit Hilfsskript:
```bash
bash /opt/financer/scripts/deploy.sh
```

**Von Windows (optional, `push.ps1`):**
```powershell
# push.example.ps1 nach push.ps1 kopieren, YOUR_SERVER anpassen
.\push -Deploy
```

`docker-entrypoint.sh` führt bei Start `prisma db push` aus (Produktions-DB ohne Migrationshistorie — siehe D-01 in `README.md`). Runtime-Image: Standalone + nur Prisma-CLI/dotenv, kein Builder-`node_modules`. Lokal: `npx prisma migrate deploy` für vollständige Migrationen.

---

## Docker-Setup

> Vollständige Deployment-Dokumentation (LXC-Setup, Docker-Install auf Debian, Backup, Troubleshooting): [`../README.md`](../README.md)

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
cd /opt/financer
cp .env.example .env && nano .env   # einmalig
docker compose up -d --build
```

### Release-Checkliste

Bei jedem Release (Version-Bump + Deploy):

1. `package.json` — `version` erhöhen (SemVer)
2. [`CHANGELOG.md`](../CHANGELOG.md) — Abschnitt für neue Version
3. [`src/data/release-notes.ts`](../src/data/release-notes.ts) — kuratierte Highlights (de/en, 3–8 Bullets)
4. Git-Tag `vX.Y.Z` + GitHub Release
5. Deploy: GHCR-Pull nach **Git-Tag `v*`** (CI baut/pusht Image nur bei Tags) oder lokaler Build (`git pull && docker compose up -d --build`) oder `.\push -Deploy`

Nutzer sehen nach dem Deploy einmalig den Update-Dialog; Erstbesuch nach frischer Installation bleibt stumm.

---

## Tests

**118 Unit-Tests, alle grün** (Stand 2026-05-31). Vitest + Testing Library. **Keine E2E- oder API-Integration-Tests.**

```bash
npm run test          # vitest run (einmalig)
npm run test:watch    # vitest (watch-Modus)
```

| Datei | Fokus | Tests |
|---|---|---|
| `calculations.test.ts` | VWAP, Preis, G/V, Portfolio-/G/V-Historie (inkl. SALE, QUANTITY_UPDATE, VWAP_UPDATE) | 22 |
| `validations.test.ts` | Auth, Asset, Entry, Edit, Backup, Simulation | 39 |
| `i18n.test.ts` | Geld/Datum/%, date-fns-Locale, API-Fehlerübersetzung | 12 |
| `dividends.test.ts` | Manuelle Dividenden, KPIs, Zod | 6 |
| `household-finance.test.ts` | Monatsbereiche, Quartalsbonus, Simulation | 5 |
| `security-price.test.ts` | `resolveStoredPrice` (EUR vs. Fremdwährung) | 5 |
| `nasdaq-calendar.test.ts` | Symbol-Filter, Datum, Env-Schalter | 5 |
| `currency.test.ts` | `getEurRate` (EUR, FX, Fehler) | 3 |
| `release-notes.test.ts` | Version-Vergleich, unseen Release-Notes | 8 |

---

## Self-hosted (LXC) — Troubleshooting

| Symptom | Ursache | Maßnahme |
|---|---|---|
| Seite reagiert nicht / Log: `failed to pipe response`, viele `api.nasdaq.com` Timeouts | Marktkalender-Widget blockiert Server | `MARKET_CALENDAR_EXTERNAL=false` in Server-`.env`, Rebuild; oder Widget im Dashboard deaktivieren |
| Keine Live-Kurse | Yahoo nicht erreichbar vom Container | Outbound-HTTPS prüfen; Kurse manuell per PRICE_UPDATE |
| Login von anderer IP | `NEXTAUTH_URL` / Host-Mismatch | `AUTH_TRUST_HOST=true`, `NEXTAUTH_URL` auf öffentliche URL setzen |

**Empfohlene Server-`.env`-Ergänzung** (ohne Nasdaq-Zugang):

```env
MARKET_CALENDAR_EXTERNAL=false
```
