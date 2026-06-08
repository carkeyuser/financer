# F-48 — Performance & Caching (optional Redis)

| | |
|---|---|
| **Bereich** | Architektur / DevOps / Performance |
| **Status** | ⏸ zurückgestellt — Doku für spätere Integration |
| **Priorität** | niedrig (erst bei Skalierung oder messbarem Engpass) |
| **Aufwand** | mittel (Phase 1 ohne Redis) · hoch (Redis + Compose + Ops) |
| **Abhängigkeiten** | bestehendes Docker-Setup (`postgres` + `app`), externe APIs Yahoo/Nasdaq |

## Entscheidung (2026-06-05)

**Redis ist für den aktuellen Betrieb nicht empfohlen.** Das Projekt ist ein Self-hosted-Dashboard für 1–2 Haushalte mit **einer** Next.js-Instanz und PostgreSQL. Der typische Engpass sind **externe HTTP-Calls** (Yahoo Finance, Nasdaq), nicht langsame DB-Queries.

Dieses Dokument hält die Analyse und einen **Integrationspfad** fest, falls sich Rahmenbedingungen ändern (mehrere App-Instanzen, viele Nutzer, geteilter Server-Cache).

---

## Ist-Zustand (Caching heute)

| Ebene | Mechanismus | Ort |
|-------|-------------|-----|
| **Client** | TanStack Query (`staleTime` 60s–∞ je nach Hook) | [`QueryProvider.tsx`](../src/components/providers/QueryProvider.tsx), Hooks |
| **Server (Prozess)** | In-Memory `Map` mit TTL | FX [`currency.ts`](../src/lib/utils/currency.ts) 60s; ISIN [`isin-resolver.ts`](../src/lib/services/isin-resolver.ts); TR-Preview [`tr-import-preview-cache.ts`](../src/lib/services/tr-import-preview-cache.ts) 30min; Update-Check [`update-availability.ts`](../src/lib/services/update-availability.ts) 5min |
| **Persistenz** | Kurse & Snapshots in PG | `PRICE_UPDATE`, `PortfolioDailySnapshot`; Refresh via [`refresh-prices`](../src/app/api/assets/refresh-prices/route.ts) |
| **Extern** | Kein serverseitiger Shared-Cache für Yahoo/Nasdaq | z. B. [`securities/history`](../src/app/api/securities/history/route.ts) mit `cache: "no-store"` |

**Deploy:** [`docker-compose.yml`](../docker-compose.yml) — nur `db` (PostgreSQL 16) + `app` (Next.js standalone). Kein Horizontal Scaling.

---

## Wo Latenz entsteht

1. **Yahoo Finance** — Einzelkurse, Bulk-`refresh-prices` (parallel pro Asset), Forex für EUR-Umrechnung.
2. **Nasdaq Marktkalender** — optional abschaltbar (`MARKET_CALENDAR_EXTERNAL`).
3. **Nicht primär** — PostgreSQL bei kleinen Datenmengen (wenige Assets, ein Haushalt).

Redis beschleunigt vor allem **wiederholte identische Reads über viele Requests und Instanzen**. Das trifft auf die aktuelle Nutzung selten zu.

---

## Wann Redis Sinn machen würde

| Trigger | Nutzen |
|---------|--------|
| **≥2 App-Container** hinter Load Balancer | Geteilter Cache (Yahoo-Quotes, Kalender-Slices), Session/Job-Koordination |
| **Viele gleichzeitige Nutzer** | Gleiche Symbole nicht mehrfach von Yahoo holen |
| **Hintergrund-Jobs** (BullMQ o. ä.) | Nächtlicher Kurs-Refresh, Snapshot-Batch, Notification-Generator entkoppelt |
| **TR-Import-Preview** über Restarts/Instanzen | Heute: In-Memory `Map` — geht bei Multi-Instance verloren |
| **Distributed Rate-Limiting** | Schutz vor Yahoo-Throttling bei hoher Parallelität |

---

## Bewusst ausgeschlossen (ohne Redis-Zwang)

- NextAuth **JWT** — kein serverseitiger Session-Store nötig.
- „PostgreSQL ist langsam“ ohne Profiling — bei diesem Datenmodell unwahrscheinlich.
- Redis **nur** weil es „schneller wirkt“ — zusätzlicher Container, Persistence, Backups, Monitoring.

---

## Empfohlene Hebel **vor** Redis (Phase 0)

Diese Schritte sind unabhängig von Redis und haben höhere ROI für das aktuelle Setup:

| # | Maßnahme | Ziel |
|---|----------|------|
| 1 | **Kurse aus DB lesen** statt live Yahoo auf jedem Widget-Load | UI schneller; Yahoo nur bei `refresh-prices` / explizitem Abruf |
| 2 | **Server-TTL-Cache** pro Symbol (Yahoo/Nasdaq), analog `getEurRate` | Eine Instanz: In-Memory reicht; Multi-Instance: dann Redis oder PG |
| 3 | **TanStack `staleTime`** gezielt erhöhen | Weniger Refetch-Runden (Widgets/Dividenden teils schon ∞ / 1h) |
| 4 | **DB-Indizes** nur bei gemessenem langsamen Endpoint | Kein vorsorgliches Over-Engineering |
| 5 | **Profiling** | Konkreten Screen/API messen (Dashboard, `refresh-prices`, `/api/today`) |

---

## Integrationspfad (wenn Trigger erfüllt)

### Phase 1 — Ohne Redis (empfohlen als nächster Schritt)

- Zentraler Service `security-quote-cache.ts` (oder Erweiterung [`security-price.ts`](../src/lib/services/security-price.ts)): TTL z. B. 2–15 Min pro `(symbol, quoteType)`.
- Optional Next.js `unstable_cache` / Route-`revalidate` nur für idempotente GET-Proxies.
- TR-Preview bei Bedarf in **PostgreSQL** (kurzlebig, TTL per `expiresAt`) statt Redis — passt zum bestehenden Stack.

### Phase 2 — Redis optional

**Compose** (Skizze):

```yaml
redis:
  image: redis:7-alpine
  restart: unless-stopped
  networks: [finance_net]
  volumes: [redis_data:/data]
  command: redis-server --appendonly yes
```

**App-Env:** `REDIS_URL=redis://redis:6379` (nur wenn gesetzt — sonst Fallback In-Memory).

**Typische Keys:**

| Key-Muster | TTL | Inhalt |
|------------|-----|--------|
| `quote:{symbol}` | 2–15 min | Yahoo-Quote JSON |
| `fx:{currency}` | 60s | EUR-Rate (ersetzt Prozess-`Map` bei Multi-Instance) |
| `calendar:{householdId}:{date}` | 1–24 h | gefilterte Nasdaq-Events |
| `tr:preview:{previewId}` | 30 min | TR-Import-Preview-Payload |

**Client:** `ioredis` oder `@upstash/redis` (nur wenn Cloud); für Self-hosted: `ioredis` + Singleton in `src/lib/redis.ts`.

**Sessions:** Nur wenn von JWT auf DB-Sessions gewechselt wird — aktuell **nicht** geplant.

### Phase 3 — Jobs (optional)

- BullMQ + Redis: Cron-`refresh-prices`, täglicher `upsertTodayPortfolioSnapshot`, Notification-Generator.
- Ersetzt nicht DB-Persistenz der Kurse — Redis nur Queue + kurzlebiger Cache.

---

## Akzeptanzkriterien (falls umgesetzt)

- [ ] `REDIS_URL` optional; App startet ohne Redis mit In-Memory-Fallback (Dev + Single-Instance-Prod).
- [ ] Dokumentation in [`setup.md`](setup.md) / [`deploy.md`](deploy.md): Volume, Backup-Hinweis, RAM.
- [ ] Keine Regression: Single-Container-Deploy ohne Redis unverändert möglich.
- [ ] Messbare Verbesserung: dokumentierter Before/After (z. B. p95 `refresh-prices` oder Dashboard-Ladezeit).
- [ ] Vitest für Cache-Layer (Mock Redis oder Memory-Adapter).

---

## Risiken & Ops

- Zweiter stateful Service (Backup `redis_data`, Memory-Limits).
- Cache-Invalidierung bei `refresh-prices` / Asset-Delete muss definiert sein.
- Stale Quotes akzeptabel nur mit klarer TTL und UI-Hinweis „Stand: …“.

---

## Verweise

- Backlog-Zeile: [`features.md`](features.md) — F-48
- Architektur: [`architecture.md`](architecture.md)
- Bekannte externe Limits: [`README.md`](README.md) (Yahoo, Nasdaq)
