# F-45 — Persönlicher Einkommen-Tab

| | |
|---|---|
| **Status** | ✅ erledigt 2026-06-02 |
| **Route** | `/einkommen` |
| **Sichtbarkeit** | Nur `session.user.id` — API und UI |

## Funktionen

- Monatstabelle mit Brutto, Netto, Boni (Monatsbonus + Sonderzahlungen), Jahr-Umschaltung
- Monats-Overlay: Erfassung, Sonder-Boni CRUD, optional Netto → `MonthlyIncome` (Haushaltskasse)
- Mehrjahres-Matrix: Brutto / Netto / Boni nebeneinander (letzte 5 Jahre)
- Backup: nur eigene Privatdaten beim Export; Restore nur für importierenden User

## Datenmodell

- `PersonalIncomeMonth` — `@@unique([householdId, userId, year, month])`
- `PersonalIncomeBonus` — Sonderzahlungen mit `date`, `label`, `amount`

## API

```text
GET    /api/personal-income/summary?year=
GET    /api/personal-income/years?from=&to=
PUT    /api/personal-income/months
GET    /api/personal-income/bonuses?year=&month=
POST   /api/personal-income/bonuses
DELETE /api/personal-income/bonuses/[id]
POST   /api/personal-income/sync-household
```

## Code

- Service: `src/lib/services/personal-income.ts`
- Utils: `src/lib/utils/personal-income.ts`
- UI: `src/components/personal-income/*`
