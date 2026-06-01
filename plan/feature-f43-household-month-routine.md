# F-43 — Haushaltskasse-Monatsroutine mit Partner-Status

Spezifikation und Implementierungsplan. Kurzbeschreibung in [`features.md`](features.md).

| | |
|---|---|
| **Status** | 🟨 offen (geplant 2026-06-02) |
| **Aufwand** | mittel |
| **Abhängigkeiten** | **F-42** für Bell-Reminder (`HOUSEHOLD_MONTH`, später `HOUSEHOLD_PARTNER_PENDING`); UI und API können **vor** F-42 liefern |
| **Voraussetzung für** | Partner-Ampel in **F-40**; sinnvoller Daily-Hook für Zwei-Personen-Haushalt |

---

## Ist-Zustand (Codebase)

| Bereich | Heute |
|---------|--------|
| Monatsstatus | Abgeleitet in `calculateHouseholdFinance()` — `leer` / `vorkalkuliert` / `fertig` nur aus **ob** Einnahmen/Auszahlungen existieren (haushaltsweit, nicht pro User) |
| Daten | `MonthlyIncome`, `MonthlyPayout` pro `userId`; Fixkosten-Snapshot `MonthlyFixedCostSnapshot` pro Monat |
| Überweisungen | Berechnet (`transfers`), nicht persistiert — `TransferPreviewSection` / `previewMonthTransfers` |
| UI | `HouseholdFinanceTable` + `MonthlyEntryDialog` — keine Checkliste, keine Partner-Ampel |
| Widget | `HouseholdSummaryWidget` — nur Zahlen des aktuellen Monats |

**Lücke:** Kein Ritual „wer hat was erledigt“; `fertig` bedeutet nicht „Überweisungen sind raus“.

---

## Ziel-Flow

1. Checkliste pro Monat: Einkommen → Fixkosten → Auszahlungen → **Überweisungen erledigt**
2. Häkchen **pro User** (unabhängig setzbar/entfernbar)
3. Aggregat-Ampel: z. B. „Juni: Max fertig, Anna: 2/4 offen“
4. Ab Tag 5 + Monat `leer`: Notification (**F-42**, Typ `HOUSEHOLD_MONTH`)
5. Quick-Link: Beträge aus `transfers` des aktuellen Monats (`calculateHouseholdFinance`)

---

## Datenmodell (festgelegt)

Neues Modell — **keine** Flags auf `MonthlyIncome`/`MonthlyPayout` (vermischt Buchhaltung mit Ritual).

```prisma
enum HouseholdChecklistStep {
  INCOME
  FIXED_COSTS
  PAYOUTS
  TRANSFERS_DONE
}

model HouseholdMonthChecklist {
  id          String                 @id @default(cuid())
  householdId String
  userId      String
  year        Int
  month       Int
  step        HouseholdChecklistStep
  completedAt DateTime               @default(now())

  household Household @relation(...)
  user      User      @relation(...)

  @@unique([householdId, year, month, userId, step])
  @@index([householdId, year, month])
}
```

### Semantik der Steps

| Step | Bedeutung | Auto-Hint (optional, UI only) |
|------|-----------|-------------------------------|
| `INCOME` | Eigene Einnahmen für den Monat erfasst | `MonthlyIncome` für `(userId, year, month)` vorhanden |
| `FIXED_COSTS` | Fixkosten für den Monat „abgehakt“ | `MonthlyFixedCostSnapshot` für Monat existiert **oder** manuell |
| `PAYOUTS` | Eigene Auszahlung erfasst | `MonthlyPayout` vorhanden |
| `TRANSFERS_DONE` | Eigene Überweisungen laut Vorschau erledigt | nur manuell |

**FIXED_COSTS:** Haushaltsweiter Schritt, aber **pro User** abhakbar („ich habe Fixkosten geprüft“) — passt zum Paar-Ritual; Snapshot-Erstellung bleibt wie heute (beim ersten Income-Eintrag).

---

## Aggregat-Logik

Neu: `src/lib/utils/household-checklist.ts`

```text
aggregateChecklistStatus(members, completions, year, month)
→ {
    perUser: { userId, name, done: Step[], pending: Step[] }
    household: "all_done" | "partial" | "none"
    currentMonthFinanceStatus: HouseholdFinanceStatus  // aus bestehender Berechnung
  }
```

- Ampel-Farben: `all_done` → grün; `partial` → gelb; `none` + `leer` → rot/grau
- Für **F-40:** exportierte Hilfsfunktion `getPartnerRoutineSummary(householdId, year, month)` — ein API-Call oder Teil von `/api/today`

---

## Implementierungsschritte

### 1 — Schema & Migration

- [ ] Enum + Modell in `prisma/schema.prisma`
- [ ] Migration `f43_household_month_checklist`
- [ ] `architecture.md` — Haushaltskasse-Abschnitt

### 2 — API

| Route | Methode | Verhalten |
|-------|---------|-----------|
| `/api/household-finance/checklist` | `GET` | Query `year`, `month` (Default: aktueller Monat); Liste Completions + Aggregat + optional Auto-Hints |
| `/api/household-finance/checklist` | `PUT` | Body: `{ year, month, step, completed: boolean }` — Toggle für **session userId** nur |
| `/api/household-finance/checklist` | — | Kein `householdId` im Body |

Zod-Schemas in `src/lib/validations/household-finance.ts` (oder eigene Datei).

### 3 — Hooks & UI Haushaltskasse

- [ ] `useHouseholdChecklist(year, month)` in `useHousehold.ts`
- [ ] `MonthRoutineCard.tsx` — oberhalb `HouseholdFinanceTable` auf `/haushaltskasse`
  - Zeile pro Member × Step (Checkbox)
  - Ampel-Zeile oben
  - Link/Button „Überweisungen“ → scrollt zu `TransferPreviewSection` oder expandiert Beträge
- [ ] Mobile: große Touch-Targets (min-h 44px)

### 4 — Dashboard / F-40-Vorbereitung

- [ ] `HouseholdSummaryWidget` erweitern **oder** separater Mini-Block — Partner-Ampel für aktuellen Monat
- [ ] Dokumentieren: F-40 Briefing importiert `getPartnerRoutineSummary`

### 5 — F-42-Integration (nach F-42 MVP)

- [ ] Generator-Regel: Tag ≥ 5 && `status === "leer"` → `HOUSEHOLD_MONTH`
- [ ] Optional: `HOUSEHOLD_PARTNER_PENDING` wenn ein Partner `all_done`, anderer `partial`

### 6 — Querschnitt

- [ ] **Backup** — Checklist-Einträge export/import (username-Auflösung wie Income/Payout)
- [ ] **i18n** — Step-Labels, Ampel-Texte, „Partner A/B“ via `members[].name`
- [ ] **Tests:** Toggle idempotent, Aggregat bei 2 Mitgliedern, fremder `userId` nicht änderbar

---

## Betroffene Dateien (Übersicht)

| Aktion | Pfad |
|--------|------|
| neu | `src/lib/utils/household-checklist.ts` |
| neu | `src/app/api/household-finance/checklist/route.ts` |
| neu | `src/components/household-finance/MonthRoutineCard.tsx` |
| neu | `src/test/household-checklist.test.ts` |
| ändern | `prisma/schema.prisma` |
| ändern | `src/app/haushaltskasse/page.tsx` |
| ändern | `src/hooks/useHousehold.ts` |
| ändern | `src/lib/validations/household-finance.ts` (oder neu) |
| ändern | `src/components/dashboard/HouseholdSummaryWidget.tsx` (optional) |
| ändern | `src/app/api/backup/route.ts`, `src/lib/validations/backup.ts` |
| später | `src/lib/services/notifications.ts` (F-42) |

---

## Abgrenzung zu bestehendem `status`

| | `calculateHouseholdFinance().status` | Checkliste F-43 |
|--|--------------------------------------|-----------------|
| Ebene | Haushalt (Daten vorhanden?) | Pro User (Ritual erledigt?) |
| `fertig` | Income + Payout existieren | Alle 4 Steps pro User optional |
| Überweisungen | nicht abgebildet | `TRANSFERS_DONE` explizit |

Beide können parallel angezeigt werden (Badge „Daten: vorkalkuliert“ + „Du: 2/4“).

---

## Akzeptanzkriterien

- [ ] Beide Haushaltsmitglieder können Steps unabhängig toggeln
- [ ] Aggregat-Ampel auf `/haushaltskasse` und im Widget sichtbar
- [ ] Quick-Link zeigt Überweisungsbeträge des aktuellen Monats
- [ ] F-42-Meldung dokumentiert / implementiert wenn F-42 existiert

---

## Nicht im MVP

- Admin setzt Häkchen für anderen User
- Automatisches Setzen von `TRANSFERS_DONE` bei Bank-API (bewusst ausgeschlossen)
- Quartalsbonus als eigener Checklist-Step (weiterhin Quartalslogik in Tabelle)
