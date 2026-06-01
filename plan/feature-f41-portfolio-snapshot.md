# F-41 — Täglicher Vermögens-Snapshot

Spezifikation und Implementierungsplan. Kurzbeschreibung in [`features.md`](features.md).

| | |
|---|---|
| **Status** | 🟨 offen (geplant 2026-06-02) |
| **Aufwand** | mittel |
| **Abhängigkeiten** | Phase 7 EUR-Logik (✅); optional Anbindung **F-40** (Briefing-Zeile), **F-42** (kein harter Blocker) |
| **Voraussetzung für** | Sinnvolles „seit gestern“ in F-40 ohne Rekonstruktion aus `AssetEntry` |

---

## Ist-Zustand (Codebase)

| Bereich | Heute |
|---------|--------|
| Kurs-Refresh | `POST /api/assets/refresh-prices` — Yahoo → `PRICE_UPDATE` pro Asset/Tag (`security-price.ts`) |
| Portfolio-Gesamtwert | `GET /api/dashboard/summary` — `computePortfolioSummary()` + `getEurRate()` |
| Chart-Historie | `getPortfolioValueHistory()` in `calculations.ts` — **rekonstruiert** aus Einträgen, nicht tagesgenaue Marktwerte |
| Login-Popup | `LoginSnapshotDialog` — zeigt **Kostenbasis-G/V**, nicht Tagesdelta |
| Persistenz | Kein `PortfolioDailySnapshot` im Schema |

**Entscheidung:** Snapshot speichert den **aktuellen Marktwert in EUR** zum Zeitpunkt des Upserts (wie Dashboard-Summary), nicht die entry-basierte Historie.

---

## Datenmodell

```prisma
model PortfolioDailySnapshot {
  id           String   @id @default(cuid())
  householdId  String
  date         DateTime @db.Date   // Kalendertag (UTC oder Europe/Berlin — einheitlich dokumentieren)
  totalEur     Decimal  @db.Decimal(18, 2)
  gainLossEur  Decimal? @db.Decimal(18, 2)  // totalEur − Vortag.totalEur (beim Upsert setzen)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  household Household @relation(...)

  @@unique([householdId, date])
  @@index([householdId, date])
}
```

- `gainLossEur` optional beim ersten Tag / fehlendem Vortag → `null`
- Prozent „seit gestern“ in API/UI aus `gainLossEur / prev.totalEur` ableiten (nicht extra speichern)

---

## Implementierungsschritte

### 1 — Schema & Migration

- [ ] Modell in `prisma/schema.prisma`, Relation auf `Household`
- [ ] Migration `npx prisma migrate dev --name f41_portfolio_daily_snapshot`
- [ ] `architecture.md` — Abschnitt Investments/Dashboard ergänzen

### 2 — Service `portfolio-snapshot.ts`

Neu: `src/lib/services/portfolio-snapshot.ts`

| Funktion | Aufgabe |
|----------|---------|
| `loadPortfolioSummaryItems(householdId, scope?)` | Assets + Entries laden (Pattern aus `dashboard/summary/route.ts`); `excludeInterestTicker`; EUR-Rates |
| `computeHouseholdTotalEur(householdId)` | Wrapper → `computePortfolioSummary().portfolioTotal` |
| `upsertTodaySnapshot(householdId, date?)` | `upsert` auf `@@unique([householdId, date])`; Vortag laden → `gainLossEur` setzen |
| `getSnapshotSeries(householdId, days)` | Letzte N Tage sortiert für Chart/API |

**Idempotenz:** Mehrfacher Aufruf am selben Tag überschreibt `totalEur`/`gainLossEur` (letzter Refresh gewinnt).

**FX-Fehler:** Wie Summary-Route — kein Snapshot schreiben, Fehler loggen (kein falscher EUR-Wert).

### 3 — Erzeugung anbinden

**Primär (MVP):** Am Ende von `POST /api/assets/refresh-prices`:

1. Nach erfolgreichem Preis-Update (mindestens ein `updated` **oder** immer einmal pro Request — Entscheidung: **immer einmal pro Request**, damit auch reine Quantity-Änderungen später ergänzbar)
2. `upsertTodaySnapshot(householdId)` aufrufen

**Optional Phase 2:** Cron/Script im Container (z. B. 23:00) für Haushalte ohne Login — nur wenn 2h-Refresh Lücken zeigt.

### 4 — API

`GET /api/portfolio/snapshots?days=90`

- Session + `householdId` aus JWT
- Zod: `days` 1–365, Default 90
- Response: `{ snapshots: [{ date, totalEur, gainLossEur, changePercent? }], latestDelta?: { eur, percent } }`
- `latestDelta` = heute vs. letzter Vortag (für Widget/Briefing)

### 5 — UI

| Teil | Dateien |
|------|---------|
| Widget `portfolio-delta` | `src/components/dashboard/PortfolioDeltaWidget.tsx` — große Zeile „+€… (+x %) seit gestern“, Fallback-Text |
| Sparkline 30/90d | Recharts, Daten aus Snapshots-API (nicht `getPortfolioValueHistory`) |
| Registry | `src/hooks/useWidgets.ts` — `WIDGET_REGISTRY`, `DashboardContent.tsx` switch, `WidgetManager` Icons |
| F-40 (später) | Block in `/api/today` — `latestDelta` wiederverwenden |

### 6 — Querschnitt

- [ ] **Backup:** `GET/POST /api/backup` — Snapshots export/import (`backupSchema`, `backup/route.ts`)
- [ ] **i18n:** `de.ts` / `en.ts` — Widget-Titel, „keine Vergleichsdaten“, Prozent-Format
- [ ] **Tests:** `portfolio-snapshot.test.ts` — Upsert idempotent, Delta mit/ohne Vortag, leeres Portfolio → kein Crash

---

## Betroffene Dateien (Übersicht)

| Aktion | Pfad |
|--------|------|
| neu | `src/lib/services/portfolio-snapshot.ts` |
| neu | `src/app/api/portfolio/snapshots/route.ts` |
| neu | `src/components/dashboard/PortfolioDeltaWidget.tsx` |
| neu | `src/test/portfolio-snapshot.test.ts` |
| ändern | `prisma/schema.prisma` |
| ändern | `src/app/api/assets/refresh-prices/route.ts` |
| ändern | `src/hooks/useWidgets.ts`, `DashboardContent.tsx`, `WidgetManager.tsx` |
| ändern | `src/lib/validations/backup.ts`, `src/app/api/backup/route.ts` |
| optional | `src/components/dashboard/LoginSnapshotDialog.tsx` — später Tagesdelta statt Kostenbasis |

---

## Akzeptanzkriterien

- [ ] Pro Haushalt max. ein Snapshot pro Kalendertag; wiederholter Refresh aktualisiert denselben Datensatz
- [ ] Widget zeigt Delta zu gestern; fehlender Vortag → i18n-Hinweis
- [ ] Sparkline aus persistierten Snapshots (min. 2 Tage sichtbar)
- [ ] Unit-Tests für Service + Delta-Logik grün

---

## Nicht im MVP

- Rekord-Hoch, längste Plus-Serie
- Scope `mine` vs. Haushalt (Default: **Haushalt**, wie Dashboard-Summary ohne `scope=mine`)
- Nächtlicher Cron (Phase 2)
