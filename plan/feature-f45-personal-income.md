# F-45 — Persönlicher Einkommen-Tab

| | |
|---|---|
| **Status** | ✅ erledigt 2026-06-02 |
| **Route** | `/einkommen` |
| **Sichtbarkeit** | Nur `session.user.id` — API und UI |

## Funktionen

- Monatstabelle mit Brutto, Netto, Boni (Monatsbonus + Sonderzahlungen), Jahr-Umschaltung; **„Jahr hinzufügen“** für vergangene Kalenderjahre
- Monats-Overlay: Erfassung, Sonder-Boni CRUD, optional Netto → `MonthlyIncome` (Haushaltskasse)
- Mehrjahres-Matrix und Balkendiagramm: nur explizite Jahre aus `available-years` (kein Auffüllen zwischen min/max)
- Backup: nur eigene Privatdaten beim Export; Restore nur für importierenden User

## Datenmodell

- `PersonalIncomeMonth` — `@@unique([householdId, userId, year, month])`
- `PersonalIncomeBonus` — Sonderzahlungen mit `date`, `label`, `amount`
- `PersonalIncomeTrackedYear` — manuell angelegte Jahre (auch ohne Monatsdaten)

## API

```text
GET    /api/personal-income/summary?year=
GET    /api/personal-income/years?years=2026,2010   (oder legacy ?from=&to=, max. 30 Jahre)
GET    /api/personal-income/available-years
POST   /api/personal-income/available-years   { year }
PUT    /api/personal-income/months
GET    /api/personal-income/bonuses?year=&month=
POST   /api/personal-income/bonuses
DELETE /api/personal-income/bonuses/[id]
POST   /api/personal-income/sync-household
```

## Code

- Service: `src/lib/services/personal-income.ts`
- Utils: `src/lib/utils/personal-income.ts`
- UI: `src/components/personal-income/*` (inkl. `PersonalIncomeYearChart.tsx`)
