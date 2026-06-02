# Implementierungsphasen

Historie und Architektur der großen Implementierungsblöcke.

---

## Phase 1 — Auth + Skeleton ✅

Implementiert 2026-05-20. Login, Register, NextAuth v5 Credentials, Sidebar, ThemeToggle, AuthGuard, Docker `standalone`.

## Phase 2 — Expenses-Modul ✅ (entfernt)

Implementiert 2026-05-20, dann vollständig entfernt in Phase 6 (2026-05-22/23). Code existiert nicht mehr.

---

## Phase 3 — Investments-Modul ✅

**Status:** Implementiert (2026-05-20), zuletzt angepasst 2026-05-24 (Inline-Korrekturen).

**Kernprinzipien:**
- `Asset` = eine Position; Unique auf `(householdId, userId, ticker)` — zwei User können denselben Ticker halten
- `AssetEntry` = PURCHASE, SALE, PRICE_UPDATE, QUANTITY_UPDATE oder VWAP_UPDATE
- `Asset.quantity` wird bei jedem Kauf/Verkauf aktualisiert (gecacht); QUANTITY_UPDATE setzt den Wert absolut
- Gewinn/Verlust basiert auf VWAP; VWAP_UPDATE setzt die Kostenbasis absolut (chronologisches Reset)
- Alle Werte in EUR (Phase 7) — `eurRate` pro Asset aus Yahoo Forex-Ticker

**AssetEntry-Typen im Detail:**

| Typ | Bedeutung | Speicherung | Effekt auf Asset |
|---|---|---|---|
| `PURCHASE` | Kauf | price + quantity (Pflicht) | quantity += qty |
| `SALE` | Verkauf | price + quantity (Pflicht) | quantity -= qty |
| `PRICE_UPDATE` | Kursaktualisierung | price, quantity = null | kein Effekt auf quantity |
| `QUANTITY_UPDATE` | Mengenkorrektur (absolut) | price = VWAP zum Zeitpunkt, quantity = neuer absoluter Wert | quantity = qty (direkt gesetzt) |
| `VWAP_UPDATE` | Kaufpreis-Korrektur (absolut) | price = neuer VWAP, quantity = aktuelle Menge als Kontext | kein Effekt auf quantity |

**Inline-Korrekturen auf der Asset-Detail-Seite (`/investments/[id]`):**

| Steuerelement | Karte | Aktion |
|---|---|---|
| RefreshCw-Button (Header) | — | Holt Kurs von Yahoo Finance → erstellt/updated `PRICE_UPDATE` für heute |
| Auto-Refresh (2h) | — | `PortfolioPriceRefresh` in `AuthGuard` → `POST /api/assets/refresh-prices` → gleiche Tages-Upsert-Logik für alle Haushalts-Positionen; `usePortfolioHistory` refetch ebenfalls 2h |
| Pencil-Icon | Aktueller Wert | User gibt EUR-Gesamtwert ein → `newPrice = EUR-Wert ÷ Menge ÷ eurRate` → `PRICE_UPDATE` für heute |
| Pencil-Icon | Menge | User gibt neue Gesamtmenge ein → `QUANTITY_UPDATE`-Eintrag + `asset.quantity` direkt gesetzt |
| Pencil-Icon | Ø Kaufpreis (VWAP) | User gibt neuen VWAP (in Originalwährung) ein → `VWAP_UPDATE`-Eintrag |

PRICE_UPDATE-Logik: existiert bereits ein `PRICE_UPDATE` für **heute** → Update; sonst neuer Eintrag. So entsteht pro Tag maximal ein automatischer Eintrag.

Einträge der Typen `QUANTITY_UPDATE` und `VWAP_UPDATE` zeigen im `AssetEntryEditDialog` den Typ als Text (kein Umschalten auf Kauf/Verkauf möglich).

**Yahoo Finance Proxy-Routen:**

```typescript
// GET /api/securities/search?q=<query>
// Yahoo Finance (enableFuzzyQuery=true, quotesCount=10) + CoinGecko parallel
// Funktioniert mit: Ticker (EUNL.DE), Name (iShares MSCI), ISIN, Krypto-Name (Bitcoin)
// Nicht unterstützt: deutsche WKN (A142N1 etc.)

// GET /api/securities/price?symbol=<ticker>
// Yahoo Finance v8/chart-Endpoint — gibt price + currency + eurRate zurück
```

**Nachkauf-Logik:**

1. `POST /api/assets` prüft: existiert `(householdId, userId, ticker)` bereits?
2. JA → kein neues Asset, neuer `AssetEntry` PURCHASE zur bestehenden Position
3. NEIN → neues Asset + ersten Entry anlegen

**Berechnungen `src/lib/utils/calculations.ts`:**

```typescript
getVWAP(entries)                  // gewichteter Durchschnittskaufpreis — chronologisch
                                  // VWAP_UPDATE setzt Kostenbasis auf price×quantity zurück;
                                  // nachfolgende PURCHASE-Einträge werden obendrauf gewichtet
getCurrentValue(asset, entries)   // letzter PRICE_UPDATE-Kurs × asset.quantity
getTotalGainLoss(asset, entries)  // aktueller Wert − (VWAP × Menge)
getGainLossPercent(asset, entries)
getPortfolioValueHistory(...)     // Zeitreihe; QUANTITY_UPDATE als absoluter Mengen-Reset;
                                  // fügt monatliche Zwischenpunkte + today ein
getGainLossHistory(...)           // Kostenbasis-Berechnung ebenfalls chronologisch mit VWAP_UPDATE
mergeHistoricalPrices(...)        // Yahoo-Historienpreise als synthetische PRICE_UPDATE einblenden
```

**4 umschaltbare Charts (`PortfolioChartPanel.tsx`):**

| Typ | Komponente | Basis |
|---|---|---|
| Torte | `PortfolioAllocationChart` | PieChart — nach Typ oder Position |
| Wert-Verlauf | `PortfolioValueChart` | AreaChart |
| G/V-Verlauf | `PortfolioGainLossChart` | LineChart + ReferenceLine |
| G/V pro Position | `AssetGainLossBarChart` | BarChart |

**Asset-Card** zeigt: Name, Ticker, Typ-Badge, **Konto** (Landmark-Icon) + **Besitzer** (User-Icon), Wert in €, G/V, Menge, VWAP.

---

## Phase 4 — Dashboard ✅

**Status:** Widget-System implementiert 2026-05-23 (F-11), erweitert 2026-05-23 (F-20 Dividend-Summary etc.), Marktkalender self-hosted 2026-05-27 (B-21).

**Widget-IDs** (`WIDGET_REGISTRY`, 12 Spalten, `rowHeight=80px):

| Widget-ID | Titel | Standard-Layout |
|---|---|---|
| `kpi-cards` | Portfolio KPIs | aktiv (0/0/12/2) |
| `value-chart` | Wert-Verlauf | aktiv (0/2/12/5) |
| `allocation-chart` | Allokation | aktiv (0/7/6/5) |
| `positions-table` | Positionen | aktiv (6/7/6/5) |
| `clock` | Uhr | optional |
| `market-calendar` | Marktkalender (Nasdaq) | optional |
| `top-flop` | Top/Flop nach G/V % | optional |
| `household-summary` | Haushaltskasse Monat | optional |
| `currency-exposure` | Währungsverteilung | optional |
| `net-worth` | Vermögen (nur Portfolio) | optional |
| `dividend-summary` | Dividenden-KPIs | optional |

**Widget-Manager** (`WidgetManager.tsx`): Modal zum An-/Abschalten. Aktivierte Widgets erscheinen unten im Grid. Layout wird **nach abgeschlossenem Drag oder Resize** (`onDragStop`/`onResizeStop`) in der DB gespeichert — kein Debounce, kein `onLayoutChange`-Speichern.

**State-Management-Architektur (Widget-Persistenz):**

`react-grid-layout` feuert `onLayoutChange` sowohl bei Nutzer-Interaktionen als auch bei Prop-Änderungen (z. B. wenn das DB-Layout über `setLayout` gesetzt wird). Saves dürfen daher **nie** in `onLayoutChange` passieren — sonst überschreibt jede Prop-Änderung die DB mit `DEFAULT_LAYOUT`.

Korrekte Aufteilung:
- `onLayoutChange` → nur `setLayout(newLayout)` (React-State, kein API-Call)
- `onDragStop` / `onResizeStop` → `saveWidgets.mutate(newLayout)` (feuert genau einmal nach Nutzer-Interaktion)
- `handleToggleWidget` / `handleAutoSort` → `setLayout` + `saveWidgets.mutate` direkt

**TanStack-Query-Cache-Strategie:**
- `staleTime: Infinity` in `useWidgets` → kein automatischer Hintergrund-Refetch nach SPA-Navigation
- `setQueryData` in `useSaveWidgets.onSuccess` → Cache wird nach jedem Save synchron aktualisiert; der nächste Mount liest sofort den korrekten Wert

**Initialer Layout-Zustand (Render-Reihenfolge):**

Nach F5 läuft React so: `useWidgets` gibt `undefined` zurück (Loading) → `useState(() => savedLayout ?? DEFAULT_LAYOUT)` initialisiert mit `DEFAULT_LAYOUT` → `widgetsLoading` wird `false` → `useEffect` setzt `setLayout(savedLayout)` + `setLayoutReady(true)` im selben Batch → GridLayout wird erst gerendert wenn `layoutReady === true`.

`layoutReady` verhindert den Flash: ohne es würde GridLayout einmal mit `DEFAULT_LAYOUT` rendern, bevor der `useEffect` korrigiert — was für den Nutzer wie "Änderungen verloren" aussieht.

Bei SPA-Navigation (kein F5) ist der TanStack-Query-Cache noch gefüllt → `savedLayout` ist sofort verfügbar → lazy initializer `() => savedLayout ?? DEFAULT_LAYOUT` startet direkt mit dem korrekten Layout → `layoutReady` startet als `true` → kein Loading-Flash.

**Marktkalender** (`MarketCalendarWidget.tsx` → `useMarketCalendar`):

- Server: `src/lib/services/nasdaq-calendar.ts` — Nasdaq Calendar API (`earnings` + `dividends` pro Datum)
- Nur Ticker ohne Börsensuffix (`.DE`, Krypto `-USD`, Forex `=X` werden ignoriert)
- **Self-hosted:** max. 14 Werktage, 2 parallele Requests, 8s Gesamt-Deadline, Fail-fast-Probe (1h Cache bei Ausfall)
- Env `MARKET_CALENDAR_EXTERNAL=false` → sofort leere Liste (empfohlen ohne Outbound-HTTPS)
- Route `GET /api/dashboard/market-calendar` fängt Fehler ab → `[]` (kein Absturz der UI)

**API-Routen:**

```text
GET    /api/dashboard/summary              → Portfolio-KPIs (total + gainLoss in EUR)
GET    /api/dashboard/widgets              → Widget-Layout des Users
PUT    /api/dashboard/widgets              → Layout speichern
DELETE /api/dashboard/widgets              → einzelnes Widget entfernen
GET    /api/dashboard/market-calendar      → Kalender-Events für alle Haushalt-Ticker
```

---

## Phase 5 — Multi-User / Household ✅

**Status:** Vollständig implementiert (2026-05-22/23).

**Umgesetzt:**
- `GET /api/household` — Mitglieder, Haushalte, offene Invites
- `POST /api/household/invite` — 7-Tage-Token (ohne E-Mail-Matching)
- `DELETE /api/household/invite/[id]` — Invite widerrufen
- `GET|POST /api/household/accept-invite`
- `POST /api/household/switch` + Session-Update via JWT
- `PATCH|DELETE /api/household/members/[userId]` — Rollen, Entfernen
- `POST /api/admin/users` — OWNER legt User direkt an (bcrypt, kein Invite nötig)
- `/household`-Seite (als „Benutzer" bezeichnet): Mitgliederliste, User-Anlegen-Formular, Invite-Link-Generator
- `HouseholdSwitcher` in Sidebar
- `/settings`: Profil + Passwort ändern

**Auth-Modell:**
- Login/Register nur mit **Username + Passwort** (kein E-Mail-Zwang)
- **2FA (TOTP)** implementiert (F-08): Setup in `/settings`, Admin-Toggle in `/household`, Pending-Setup blockiert App bis Bestätigung

---

## Phase 6 — Haushaltskasse ✅

**Status:** Vollständig implementiert (2026-05-22/23), erweitert um gespeicherte Simulationen (F-33, 2026-05-25).

**Berechnungslogik:**

```text
Pro Monat:
  Restgeld              = kombiniertes Einkommen − Fixkosten
  Theoretische Auszahl. = Restgeld / 2
  Tatsächliche Auszahl. = manuell eingetragen
  Überweisung/Person    = Einkommen − Tatsächliche Auszahlung (→ Gemeinschaftskonto)

Quartalsbonus:
  Überschuss Q = Σ (Theoretisch − Tatsächlich) über 3 Monate
  Bonus/Person = Überschuss Q / 2
```

**Fixkosten-Snapshot (B-02):** Beim ersten Einkommenseintrag eines Monats werden die aktuellen Fixkosten in `MonthlyFixedCostSnapshot` eingefroren. Spätere Fixkosten-Änderungen wirken nur auf leere Monate, nicht auf abgeschlossene.

**Komponenten:**

| Was | Datei |
|---|---|
| Jahrestabelle | `HouseholdFinanceTable.tsx` — Monat, Einnahmen, Fixkosten (Akkordeon), Restgeld, Auszahlung, Status |
| Eintrag-Dialog | `MonthlyEntryDialog.tsx` — Einnahmen + Auszahlungen pro User, Live-Vorschau |
| Simulationen | `SimulationManager.tsx`, `SimulationTable.tsx`, `SimulationMonthDialog.tsx` — gespeicherte Was-wäre-wenn-Szenarien mit frei wählbarem Zeitraum |
| Eigener Tab | `/haushaltskasse` |

**API-Routen:**

```text
GET    /api/household-finance/summary?year=YYYY
POST   /api/household-finance/income        → upsert + Fixkosten-Snapshot anlegen
POST   /api/household-finance/payout        → upsert
GET    /api/household-finance/fixed-costs
POST   /api/household-finance/fixed-costs
PUT    /api/household-finance/fixed-costs/[id]
DELETE /api/household-finance/fixed-costs/[id]
GET    /api/household-finance/simulations
POST   /api/household-finance/simulations
GET    /api/household-finance/simulations/[id]
PATCH  /api/household-finance/simulations/[id]
DELETE /api/household-finance/simulations/[id]
PUT    /api/household-finance/simulations/[id]/months
```

**F-33 Simulationen:** Szenarien werden in eigenen Tabellen gespeichert (`HouseholdFinanceSimulation*`) und überschreiben nie echte Monatsdaten. Beim Anlegen wird eine Baseline aus vorhandenen Monatsdaten, Snapshots und aktuellen Fixkosten erzeugt. Danach können Einkommen, Fixkosten und Auszahlungen pro Simulationsmonat angepasst und optional ab einem Monat auf alle Folgemonate übernommen werden. Die Berechnung läuft über `src/lib/utils/household-finance.ts` und wird von echter Jahresübersicht und Simulation geteilt. Die UI liegt auf `/haushaltskasse/simulation` und erscheint links als Desktop-Subtab unter „Haushaltskasse"; mobil ist sie über das Hamburger-Menü in der Topbar erreichbar.

**Standard-Fixkosten** (bei Register automatisch angelegt):

| Position | Betrag |
|---|---|
| Miete | 900,00 € |
| Allianz Invest + Rent | 400,00 € |
| Versicherung | 220,00 € |
| Auto | 269,60 € |
| Gym | 90,00 € |
| Strom | 80,00 € |
| Verpflegung | 450,00 € |
| Tanken | 150,00 € |
| Internet | 80,00 € |
| Puffer | 100,00 € |

---

## Phase 7 — EUR-Konvertierung ✅

**Status:** Implementiert 2026-05-23.

**Wechselkurs-Abruf via Yahoo Finance Forex-Ticker:**

```text
USD → EUR: Ticker "EURUSD=X" invertieren (1 / rate)
GBP → EUR: Ticker "EURGBP=X" invertieren
CHF → EUR: Ticker "EURCHF=X" invertieren
```

**`src/lib/utils/currency.ts`:** `getEurRate(currency)` mit 60s In-Memory-Cache. EUR → 1.0, andere Währungen → aktueller Kurs.

**Alle monetären Werte in der UI werden in EUR dargestellt.** Originalwährung wird in Klammern oder als Tooltip gezeigt, wo relevant.

---

## Phase 9 — Datensicherung ✅

**Status:** Implementiert 2026-05-24.

**Backup-Format (JSON, `version: 1`):**

```text
exportedAt        ISO-Timestamp
household         name, currency
members[]         username, name, role
fixedCosts[]      name, amount, order
monthlyIncomes[]  username, year, month, amount
monthlyPayouts[]  username, year, month, amount
fixedCostSnapshots[] year, month, fixedCosts
assets[]          username, ticker, name, type, currency, isin, wkn, notes, account, quantity, order
  entries[]       type, price, quantity, date, note
```

Enthalten (seit B-07): Dividenden-Zahlungen, Haushaltskassen-Simulationen inkl. Monats-Entries.  
Nicht enthalten: Passwörter, Sessions, Auth-Tokens, 2FA-Secrets, Dashboard-Widget-Layouts.

**Export (`GET /api/backup`):** Jedes eingeloggte Haushaltsmitglied darf exportieren. Gibt alle Haushaltsdaten direkt als JSON zurück; der Client löst den Download aus.

**Restore (`POST /api/backup`):** Nur OWNER/ADMIN. Validiert das JSON via Zod (`backupSchema`). Löscht in einer Transaktion alle vorhandenen Haushaltsdaten (FixedCost, MonthlyIncome, MonthlyPayout, MonthlyFixedCostSnapshot, Asset → AssetEntry via Cascade) und reimportiert alles. Usernames werden auf aktuelle Haushaltsmitglieder gemappt (`usernameToId`-Map); unbekannte Usernames fallen auf den importierenden User zurück.

**UI (`BackupCard.tsx` in `/settings`):**
- Export-Button → `fetch GET /api/backup` → `Blob` → temporärer `<a>`-Download
- Import-Button → verstecktes `<input type="file">` → Datei-Auswahl → AlertDialog-Bestätigung → `fetch POST /api/backup` → `window.location.reload()`
- Warnung: "Nur Admins und Eigentümer können Backups einspielen"

**API-Routen:**

```text
GET  /api/backup   → JSON-Export aller Haushaltsdaten
POST /api/backup   → Restore aus JSON (löscht + reimportiert, Admin/Owner only)
```

---

## Phase 10 — Trade Republic Import (F-38) ✅

**Status:** Implementiert 2026-05-31, erweitert 2026-06-01 (Depot leeren).

**Wizard:** 7 Schritte (Intro → Upload → Übersicht → Konflikte → Ticker → Bestätigen → Ergebnis). CSV aus TR-App; Hard-Dedup via `importRef` (Order ID); Soft-Match gegen bestehende Buchungen; Konflikt-Aktionen skip/import/link/replace; ISIN→Ticker (Portfolio vor Yahoo); Zinsen → Interest-Asset.

**API:**

```text
POST /api/investments/import/trade-republic/preview   → NDJSON (parse, tickers, dedup)
POST /api/investments/import/trade-republic/apply     → NDJSON Import
DELETE /api/investments/accounts                      → alle Positionen eines Depot-Namens löschen
```

**Depot leeren (v0.0.9):** Im Upload-Schritt Hinweis + Button „Depot leeren“ (AlertDialog); optional Checkbox „vor Import leeren“. Löscht alle `Asset` mit passendem `account` + `userId` (Interest ausgenommen); Einträge/Dividenden per Cascade. Admins können Ziel-User wie beim Import wählen.

**Services:** `trade-republic-csv.ts`, `tr-import-dedup.ts`, `tr-import-apply.ts`, `delete-investment-account.ts`

---

## Phase 11 — Positionen zusammenführen (F-39) ✅

**Status:** Implementiert 2026-06-01. Spezifikation: [`feature-f39-merge-positions.md`](feature-f39-merge-positions.md).

**Ziel:** Duplikat-Assets (gleiches Wertpapier, unterschiedlicher Ticker/ISIN-Lücke) per Wizard zusammenführen; Null-Positionen in der Liste standardmäßig ausblenden.

**Kern-API:**

```text
GET  /api/assets/merge-suggestions   → Duplikat-Gruppen (optional NDJSON-Stream)
POST /api/assets/merge               → target + sources → Einträge/Dividenden verschieben, Menge recalc
```

**Einstieg:** Button „Zusammenführen“ im Investments-Tab; TR-Import Result-Step + optionale Checkbox im Intro.

**Kein Schema-Change.** Merge nur gleicher `userId`; OWNER/ADMIN.

---

## Phase 12 — Persönliches Einkommen (F-45) ✅

**Status:** Implementiert 2026-06-02. Spezifikation: [`feature-f45-personal-income.md`](feature-f45-personal-income.md).

**Kern:**
- Route `/einkommen`, Sidebar-Tab „Einkommen“
- `PersonalIncomeMonth` (Brutto, Netto, Monatsbonus) + `PersonalIncomeBonus` (Sonderzahlungen)
- API nur für `session.user.id`; Partner sieht keine Daten
- Optional: Netto → `MonthlyIncome` (Haushaltskasse) inkl. Fixkosten-Snapshot-Regel
- Mehrjahres-Matrix (Brutto / Netto / Boni)
- Backup-Export/Restore: nur Privatdaten des exportierenden bzw. importierenden Users

**Migration:** `20260602_f45_personal_income`

