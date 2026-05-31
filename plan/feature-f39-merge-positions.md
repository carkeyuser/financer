# F-39 — Positionen zusammenführen + Null-Positions-Filter

> Feature-Spezifikation. **Implementiert** 2026-06-01 (Review-Fixes abgeschlossen).

---

## Problem

Positionen sind eindeutig über `(householdId, userId, ticker)` — nicht über ISIN. Nach manuellem Anlegen + TR-Import (oder unterschiedlichen Yahoo-Tickern für dasselbe Wertpapier) entstehen Duplikat-Assets mit geteilten Buchungen. Es gibt kein UI zum Verschieben von Einträgen zwischen Assets; Ticker ist nachträglich nicht änderbar.

---

## Ziel

1. **Merge-Wizard** mit automatischen Vorschlägen und manueller Zuordnung
2. Zwei Einstiegspunkte: **Investments-Tab** und **TR-Import** (nach Apply bzw. optional vor erneutem Import)
3. **Filter:** Positionen mit **0,00 € Marktwert** standardmäßig ausblenden (umschaltbar)

---

## Scope

| In Scope | Out of Scope (später) |
|---|---|
| Merge von 2+ Assets desselben Users | Cross-User-Merge (verschiedene `userId`) |
| Verschieben aller `AssetEntry` + `DividendPayment` | Ticker nachträglich ändern ohne Merge |
| Automatische Duplikat-Erkennung | Bulk-Delete leerer Positionen |
| Null-Wert-Filter in Portfolio-Liste | Filter in Dashboard-Widgets (eigener Backlog) |
| OWNER/ADMIN-only für Merge-Aktion | Import-Dedup auf ISIN umstellen (F-39 Phase 2) |

---

## UX — Einstiegspunkte

### A) Investments-Tab (`InvestmentsContent.tsx`)

- Neuer Button **„Zusammenführen“** (Outline, neben TR-Import) → öffnet `PositionMergeWizard`
- Neuer Toggle **„Leere ausblenden“** (Checkbox/Switch, default **an**) in der Filterleiste neben Konto-Filter
  - Zeile darunter optional: *„3 leere Positionen ausgeblendet“* (klickbar → Toggle aus)

### B) TR-Import-Wizard

- **Intro-Step:** Checkbox *„Nach dem Import auf doppelte Positionen prüfen“* (default **an** wenn ≥2 Assets im Haushalt)
- **Result-Step:** Primär-CTA neben „Fertig“: **„Positionen zusammenführen“** → schließt Import-Dialog, öffnet Merge-Wizard mit Kontext `source: "tr-import"`
- Optional **Upload-Step / vor erneutem Import:** Link *„Bestehende Duplikate bereinigen“* → Merge-Wizard ohne CSV

---

## UX — Merge-Wizard (`PositionMergeWizard.tsx`)

Dialog/Wizard analog TR-Import (shadcn Dialog, Steps, NDJSON-Fortschritt bei Scan).

### Steps

| Step | Inhalt |
|---|---|
| **intro** | Kurzerklärung; Hinweis OWNER/ADMIN; Backup-Empfehlung |
| **scan** | Server analysiert Haushalts-Assets → Fortschrittsbalken |
| **suggestions** | Gruppen mit Confidence-Badge; leere Gruppen → direkt zu manual |
| **review** | Pro Gruppe: Ziel-Position wählen, Vorschau (Ticker, ISIN, #Entries, Menge, Wert), Aktion Merge / Überspringen |
| **manual** | Zwei+ Dropdowns/Listen: Quell-Assets + Ziel-Asset; Suche/Filter |
| **applying** | Fortschritt pro Merge-Gruppe |
| **result** | Zusammenfassung: X zusammengeführt, Y übersprungen, Fehler |

**Navigation:** suggestions → review (nur Gruppen mit ≥2 Assets); jederzeit **„Manuell zuordnen“**; nach result → Portfolio invalidieren.

### Gruppen-Karte (review)

```
┌─────────────────────────────────────────────────┐
│ ISIN IE00B4L5Y983 · 92% Übereinstimmung         │
│ ○ EUNL.DE  — 12 Buchungen · 45 Stk · 4.230 €   │  ← Ziel (Radio)
│ ○ EUNL     —  3 Buchungen ·  0 Stk ·     0 €   │  ← wird aufgelöst
│ [Zusammenführen]  [Überspringen]                 │
└─────────────────────────────────────────────────┘
```

Ziel-Asset bestimmt den **behaltenen Ticker** (Yahoo-tauglich bevorzugen in Vorschlags-Logik).

---

## Duplikat-Erkennung (Server)

Service: `src/lib/services/asset-merge-suggestions.ts`

### Gruppierung (nur gleicher `userId`, gleicher Haushalt, kein Interest-Asset)

| Priorität | Regel | Confidence |
|---|---|---|
| 1 | Gleiche **ISIN** (beide gesetzt, case-insensitive) | `high` (95) |
| 2 | Eine ISIN gesetzt, **Name** ≥85 % Ähnlichkeit (normalisiert) + gleiches `account` | `medium` (75) |
| 3 | **Ticker-Normalisierung:** gleicher Basis-Symbol ohne Börse (`.DE`, `.L`, `-USD` strip) | `medium` (70) |
| 4 | **Name** fuzzy ≥90 %, gleicher `type`, gleiches `account` | `low` (55) |

- Gruppen mit nur 1 Asset → nicht in suggestions, nur manual
- Gruppen mit ≥2 Assets → Vorschlag
- **Ziel-Vorschlag:** Asset mit ISIN + höchstem Buchungsvolumen + bevorzugt `.DE`/`.AS` Suffix für STOCK/ETF

### TR-Import-Kontext (optional)

Wenn Wizard mit `tr-import`-Kontext geöffnet: zusätzlich Gruppen markieren, in denen ein Asset `account === preview.account` und frische TR-`importRef`-Einträge hat.

---

## Merge-Operation (Server)

`POST /api/assets/merge` — Body Zod:

```ts
{
  targetAssetId: string
  sourceAssetIds: string[]  // min 1, max 10 pro Request; target ∉ sources
}
```

`requireHouseholdAdmin()` — wie Entry-Löschung.

### Transaktion pro Merge

1. Validieren: alle Assets same `householdId`, same `userId`, nicht Interest, target existiert
2. **Unique-Constraint:** sources dürfen anderen Ticker haben als target (OK); nach Merge werden sources gelöscht
3. `assetEntry.updateMany({ assetId: source → target })`
4. `dividendPayment.updateMany({ assetId: source → target })`
5. **`recalculateAssetQuantity(targetId)`** — Einträge chronologisch abspielen (PURCHASE/SALE/QUANTITY_UPDATE/**VWAP_UPDATE**; PRICE_UPDATE ignorieren für Menge)
6. Metadaten target: `isin` = target.isin ?? first non-null source; `wkn` analog; `notes` anhängen wenn unterschiedlich
7. `asset.deleteMany(sources)` (Cascade löscht verwaiste Einträge — bereits verschoben)
8. `order`-Feld: Minimum der gemergten Assets übernehmen

### Fehlerfälle

| Fall | HTTP |
|---|---|
| Quell-Asset = Ziel | 400 |
| Verschiedene userId | 422 |
| Interest-Asset | 403 |
| Menge nach Recalc negativ | 422 + Detail welche Buchungen |

---

## API

| Route | Methode | Beschreibung |
|---|---|---|
| `/api/assets/merge-suggestions` | GET | Scan; Query optional `userId`; NDJSON-Stream optional `?stream=1` |
| `/api/assets/merge` | POST | Einzel-Merge (target + sources) |
| `/api/assets/merge/batch` | POST | Optional: `{ merges: [...] }` für review-Step „Alle high-confidence“ |

Response suggestions:

```ts
type MergeSuggestionGroup = {
  id: string
  confidence: "high" | "medium" | "low"
  score: number
  reason: string  // i18n key
  assets: Array<{
    id: string; ticker: string; name: string; isin: string | null
    account: string; entryCount: number; quantity: string
    valueEur: number; ownerName: string
  }>
  suggestedTargetId: string
}
```

---

## Null-Positions-Filter (Teil F-39)

### Definition „leer“

Position ist ausgeblendet wenn **beides** zutrifft:

- `parseFloat(asset.quantity) === 0` (mit Toleranz `1e-6`)
- **oder** `getCurrentValue(asset, entries) * eurRate < 0.01` (unter 1 Cent)

Interest-Asset (`__INTEREST__`) nie ausblenden.

### Verhalten

| Aspekt | Verhalten |
|---|---|
| Default | Filter **an** |
| Persistenz | `localStorage` Key `financer.hideZeroPositions` |
| Listen/Grid/DnD | Nur sichtbare Assets |
| Header „X Positionen“ | Nur sichtbare; Zusatz *„(+N leer)“* wenn Filter an |
| Portfolio-Summen (Header + Charts) | **Alle** Assets (inkl. versteckte) — sonst verwirrende Totals |
| Empty State | Nur wenn wirklich 0 Assets gesamt, nicht wenn alle gefiltert |

---

## TR-Import Phase 2 (optional, gleiches Feature)

`getOrCreateAsset` in `tr-import-apply.ts` erweitern:

1. Zuerst Lookup `(householdId, userId, isin)` wenn ISIN gesetzt
2. Dann bestehend `(householdId, userId, ticker)`

Verhindert neue Duplikate; kein Ersatz für Merge bestehender Daten.

---

## Dateien (Implementierung)

| Neu | Geändert |
|---|---|
| `src/lib/utils/ndjson-stream.ts` | `InvestmentsContent.tsx` — Filter + Button (Admin-only) |
| `src/lib/services/asset-merge-suggestions.ts` | `TradeRepublicImportWizard.tsx` — Checkbox + Result-CTA + trAccount |
| `src/lib/services/asset-merge-apply.ts` | `tr-import-apply.ts` — ISIN-Backfill |
| `src/lib/validations/asset-merge.ts` | `tr-import-progress.ts` — NDJSON-Re-Export |
| `src/app/api/assets/merge-suggestions/route.ts` | i18n `de.ts` / `en.ts` |
| `src/app/api/assets/merge/route.ts` | |
| `src/components/investments/merge/PositionMergeWizard.tsx` | |
| `src/hooks/useAssetMerge.ts` | |
| `src/lib/utils/ndjson-stream.ts` | `tr-import-progress.ts` — NDJSON extrahiert |
| `src/test/merge-apply.test.ts` | `src/test/merge-suggestions-route.test.ts` |
| `src/test/merge-apply.test.ts` | |
| `src/test/merge-suggestions-route.test.ts` | |
| `src/test/tr-import-isin-backfill.test.ts` | |

Kein Schema-Change nötig.

---

## Tests (Vitest)

- Gruppierung: gleiche ISIN → eine Gruppe; verschiedene userId → getrennt
- Ticker-Normalisierung `VUAA` / `VUAA.DE`
- Eine ISIN + ähnlicher Name → medium-Gruppe
- Clique-Split bei transitiven False-Positives (≥3 Assets)
- `trImportRelevant` bei TR-Konto + `importRef`
- Merge verschiebt entries + dividends; quantity korrekt (inkl. VWAP_UPDATE)
- Merge Mock-Tx: cross-userId → 422, Interest → 403, negative qty → 422
- NDJSON merge-suggestions route
- TR ISIN-Backfill bei Ticker-Match
- Null-Filter: qty=0 ausgeblendet; qty>0 mit Wert sichtbar

---

## Implementierungs-Reihenfolge

1. **Backend:** `recalculateAssetQuantity` + merge apply + tests
2. **Suggestions-API** + tests
3. **Merge-Wizard** (Investments-Einstieg)
4. **Null-Filter** (klein, parallel möglich)
5. **TR-Import-Hooks** (Result-CTA + Checkbox)
6. **Phase 2:** ISIN-Lookup im TR-Import

---

## Abhängigkeiten

- Bestehende Berechnungen: `getCurrentValue`, Entry-Typ-Logik aus `asset-entries/[id]/route.ts`
- Auth: `requireHouseholdAdmin`
- UI-Pattern: TR-Import-Wizard, NDJSON-Progress
