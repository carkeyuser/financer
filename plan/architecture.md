# Architektur

Tech Stack, Projektstruktur und aktuelles Datenmodell.

---

## Tech Stack

| Bereich | Entscheidung | Begründung |
|---|---|---|
| Framework | **Next.js 16 App Router + TypeScript** | SSR/RSC, API Routes, `output: 'standalone'` für Docker |
| Auth | **NextAuth.js v5 (Auth.js)** + Credentials Provider | Multi-User, kein OAuth-Overhead nötig |
| Datenbank | **PostgreSQL 16 + Prisma 7** | Sicherer Umgang mit Dezimalzahlen, Migrations-Workflow |
| UI | **shadcn/ui + Tailwind CSS v4 + next-themes** | Dark/Light Toggle, Radix-Primitives |
| Charts | **Recharts** | Flexible Komposition, keine Design-Konflikte mit shadcn |
| Dashboard-Grid | **react-grid-layout** | Drag & Drop + Resize, DB-backed Layout |
| Data Fetching | **TanStack Query v5** | Client-Cache, optimistische Mutations |
| Formulare | **React Hook Form + Zod** | Shared Zod-Schemas zwischen Frontend und API |
| DnD (Investments) | **@dnd-kit** | Asset-Reihenfolge per Drag & Drop |
| Hilfspakete | `bcryptjs`, `date-fns`, `lucide-react` | Passwort-Hashing, Datumsrechnung, Icons |
| Wertpapiersuche | **Yahoo Finance (inoffiziell)** + **CoinGecko** | Yahoo für Aktien/ETFs/Kurse/Forex; CoinGecko-Fallback für Krypto |
| Marktkalender | **Nasdaq Calendar API** (`api.nasdaq.com`) | Earnings + Ex-Dividenden; optional abschaltbar per Env |

---

## Projektstruktur

```text
financer/
├── plan/
│   ├── README.md
│   ├── architecture.md
│   ├── phases.md
│   ├── setup.md
│   ├── features.md
│   ├── aenderungen.md
│   ├── bugs.md
│   └── changelog.md
├── CLAUDE.md
├── .env.local                        # lokale Secrets (nie committen)
├── .env.example
├── .gitignore
├── next.config.ts                    # output: 'standalone', allowedDevOrigins
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.ts
├── package.json
├── docker-compose.yml
├── Dockerfile
├── push.ps1                          # Windows → LXC Deploy-Skript
│
├── prisma/
│   ├── schema.prisma                 # aktuelles Schema
│   ├── prisma.config.ts              # Prisma 7: DB-URL-Konfiguration
│   ├── seed.ts                       # Demo-User + Fixkosten + Sample-Daten
│   └── migrations/
│       ├── 20260522212211_init/
│       ├── 20260522_phase6_haushaltskasse/
│       ├── 20260523_phase7_asset_order_notes/
│       ├── 20260523_f06_username_2fa/
│       ├── 20260523_f08_two_factor/
│       ├── 20260523_b02_fixkosten_snapshot/
│       ├── 20260523_f10_asset_account/
│       ├── 20260523_f11_dashboard_widgets/
│       ├── 20260525_user_locale/
│       ├── 20260525_f33_household_finance_simulations/
│       └── 20260525_f32_dividends/
│
└── src/
    ├── app/
    │   ├── layout.tsx                # ThemeProvider + SessionProvider + QueryProvider
    │   ├── page.tsx                  # Redirect → /dashboard oder /auth/login
    │   ├── globals.css
    │   ├── auth/
    │   │   ├── login/page.tsx
    │   │   ├── register/page.tsx
    │   │   └── accept-invite/page.tsx
    │   ├── dashboard/
    │   │   ├── layout.tsx            # AuthGuard
    │   │   ├── page.tsx
    │   │   └── DashboardContent.tsx  # Widget-Grid (react-grid-layout)
    │   ├── haushaltskasse/
    │   │   ├── layout.tsx            # AuthGuard
    │   │   ├── page.tsx
    │   │   └── simulation/page.tsx    # Subtab: gespeicherte Szenarien
    │   ├── investments/
    │   │   ├── layout.tsx
    │   │   ├── page.tsx
    │   │   ├── InvestmentsContent.tsx  # DnD, Card/List-Toggle
    │   │   ├── new/page.tsx
    │   │   ├── [id]/page.tsx
    │   │   ├── [id]/AssetDetailContent.tsx
    │   │   └── [id]/entry/page.tsx
    │   ├── dividenden/
    │   │   ├── layout.tsx
    │   │   ├── page.tsx
    │   │   └── DividendsContent.tsx
    │   ├── household/                # "Benutzer"-Tab
    │   │   ├── layout.tsx
    │   │   ├── page.tsx
    │   │   └── HouseholdContent.tsx  # Mitglieder, User anlegen, Invite
    │   ├── settings/
    │   │   ├── layout.tsx
    │   │   ├── page.tsx
    │   │   ├── SettingsContent.tsx   # Profil, Passwort, 2FA
    │   │   └── BackupCard.tsx        # Backup-Export + Restore
    │   └── api/
    │       ├── auth/[...nextauth]/route.ts
    │       ├── register/route.ts
    │       ├── admin/users/route.ts       # POST: OWNER legt User direkt an
    │       ├── assets/
    │       │   ├── route.ts               # GET alle Haushalt-Assets; POST mit Nachkauf-Logik
    │       │   ├── reorder/route.ts       # POST: Reihenfolge speichern
    │       │   ├── refresh-prices/route.ts # POST: Yahoo-Kurse → PRICE_UPDATE (Bulk)
    │       │   ├── merge-suggestions/route.ts  # GET Duplikat-Scan (optional NDJSON)
    │       │   ├── merge/route.ts         # POST Einzel-Merge
    │       │   ├── merge/batch/route.ts   # POST Batch high-confidence
    │       │   └── [id]/route.ts          # GET/PUT/DELETE
    │       ├── investments/
    │       │   ├── import/trade-republic/preview/route.ts
    │       │   ├── import/trade-republic/apply/route.ts
    │       │   └── accounts/route.ts      # DELETE Depot leeren
    │       ├── asset-entries/
    │       │   ├── route.ts
    │       │   └── [id]/route.ts
    │       ├── securities/
    │       │   ├── search/route.ts        # GET ?q= → Yahoo + CoinGecko parallel
    │       │   └── price/route.ts         # GET ?symbol= → Kurs + eurRate
    │       ├── household-finance/
    │       │   ├── summary/route.ts       # GET ?year= → Jahresübersicht mit Snapshots
    │       │   ├── income/route.ts        # POST upsert + Fixkosten-Snapshot anlegen
    │       │   ├── payout/route.ts        # POST upsert Auszahlung
    │       │   ├── fixed-costs/route.ts
    │       │   ├── fixed-costs/[id]/route.ts
    │       │   └── simulations/           # gespeicherte Szenarien + Monatsupdates
    │       ├── household/
    │       │   ├── route.ts
    │       │   ├── invite/route.ts
    │       │   ├── invite/[id]/route.ts   # DELETE: Invite widerrufen
    │       │   ├── switch/route.ts
    │       │   ├── accept-invite/route.ts
    │       │   └── members/[userId]/route.ts
    │       ├── dashboard/
    │       │   ├── summary/route.ts       # Portfolio-KPIs in EUR
    │       │   ├── widgets/route.ts       # GET/PUT/DELETE Widget-Layout
    │       │   └── market-calendar/route.ts  # Nasdaq-Kalender (begrenzt, fehlertolerant)
    │       ├── dividends/
    │       │   ├── summary/route.ts       # manuelle Jahresübersicht + Positionsauswahl
    │       │   └── payments/              # manuelle Dividenden-Buchungen
    │       ├── backup/
    │       │   └── route.ts               # GET: Export als JSON; POST: Restore (Admin/Owner)
    │       └── user/
    │           ├── profile/route.ts
    │           └── password/route.ts
    │
    ├── components/
    │   ├── ui/                            # shadcn generierte Komponenten
    │   ├── layout/
    │   │   ├── Sidebar.tsx                # Nav + Haushaltskasse-Subtab Simulation
    │   │   ├── MobileTopBar.tsx           # Hamburger + Theme (mobil)
    │   │   ├── HouseholdSwitcher.tsx
    │   │   ├── ThemeToggle.tsx
    │   │   └── AuthGuard.tsx              # inkl. PortfolioPriceRefresh
    │   ├── dashboard/
    │   │   ├── ClockWidget.tsx
    │   │   ├── MarketCalendarWidget.tsx   # Nasdaq-Kalender (client → API)
    │   │   ├── TopFlopWidget.tsx
    │   │   ├── HouseholdSummaryWidget.tsx
    │   │   ├── CurrencyExposureWidget.tsx
    │   │   ├── NetWorthWidget.tsx
    │   │   ├── DividendSummaryWidget.tsx
    │   │   └── WidgetManager.tsx
    │   ├── household-finance/
    │   │   ├── HouseholdFinanceTable.tsx  # Jahrestabelle + Fixkosten
    │   │   ├── MonthlyEntryDialog.tsx     # Einnahmen + Auszahlungen eintragen
    │   │   ├── SimulationManager.tsx      # Szenario-Auswahl + CRUD
    │   │   ├── SimulationTable.tsx        # Simulationszeitraum Desktop/Mobile
    │   │   └── SimulationMonthDialog.tsx  # Simulationswerte je Monat
    │   └── investments/
    │       ├── SecuritySearch.tsx         # Yahoo + CoinGecko Suche
    │       ├── AssetCard.tsx              # Konto + Besitzer-Tags
    │       ├── AssetForm.tsx              # inkl. account-Feld
    │       ├── AssetEditDialog.tsx        # inkl. account-Feld
    │       ├── AssetEntryForm.tsx
    │       ├── PortfolioChartPanel.tsx    # 4 Chart-Tabs
    │       ├── PortfolioAllocationChart.tsx
    │       ├── PortfolioValueChart.tsx
    │       ├── PortfolioGainLossChart.tsx
    │       ├── AssetGainLossBarChart.tsx
    │       ├── tr-import/TradeRepublicImportWizard.tsx
    │       └── merge/PositionMergeWizard.tsx
    │
    ├── hooks/
    │   ├── useAssets.ts                   # CRUD + reorder + entries + portfolio history
    │   ├── useInvestmentAccount.ts        # DELETE Depot leeren
    │   ├── useTradeRepublicImport.ts      # Preview/Apply NDJSON
    │   ├── useSecuritySearch.ts
    │   ├── useHousehold.ts                # useHouseholdFinance, useSaveMonthlyEntry, useDashboardSummary
    │   ├── useHouseholdFinanceSimulations.ts
    │   ├── useDividends.ts                # Summary + Payment-Mutations
    │   └── useWidgets.ts                  # useWidgets, useSaveWidgets, useMarketCalendar
    │
    ├── lib/
    │   ├── prisma.ts                      # Singleton PrismaClient mit @prisma/adapter-pg
    │   ├── auth.ts                        # NextAuth v5; trustHost: true; householdId in JWT
    │   ├── household-auth.ts              # requireSession, requireHouseholdAdmin
    │   ├── validations/
    │   │   ├── asset.ts                   # assetSchema (inkl. account), assetEntrySchema, assetEditSchema
    │   │   ├── household.ts
    │   │   ├── household-finance-simulation.ts
    │   │   ├── dividend.ts
    │   │   └── settings.ts
    │   ├── services/
    │   │   ├── security-price.ts          # Yahoo-Kurs + Tages-PRICE_UPDATE-Upsert
    │   │   └── nasdaq-calendar.ts         # Marktkalender-Abruf (limits, Fail-fast)
    │   └── utils/
    │       ├── calculations.ts            # VWAP, getCurrentValue, getTotalGainLoss, …
    │       ├── household-finance.ts       # echte Haushaltskasse + Simulationen berechnen
    │       ├── dividends.ts               # manuelle Dividenden-Summen, Monatsreihe, KPIs
    │       ├── currency.ts                # getEurRate() mit 60s In-Memory-Cache
    │       ├── dates.ts
    │       └── household-auth.ts
    │
    ├── test/
    │   ├── setup.ts
    │   ├── calculations.test.ts           # 22 Tests
    │   ├── household-finance.test.ts      # 5 Tests
    │   ├── dividends.test.ts              # 6 Tests
    │   ├── currency.test.ts               # 3 Tests
    │   ├── security-price.test.ts         # 5 Tests
    │   ├── nasdaq-calendar.test.ts        # 5 Tests
    │   ├── i18n.test.ts                   # 12 Tests
    │   └── validations.test.ts            # 39 Tests
    │
    └── generated/
        └── prisma/                        # Prisma 7 Client (aus @/generated/prisma)
```

---

## Datenbank-Schema

Datei: `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
  // URL kommt aus prisma.config.ts (CLI) bzw. @prisma/adapter-pg (Runtime) — kein url-Feld hier
}

// ─── User & Household ────────────────────────────────────────────────────────

model User {
  id              String    @id @default(cuid())
  name            String?
  username        String    @unique
  email           String?   @unique
  passwordHash    String?
  twoFactorSecret String?
  twoFactorEnabled Boolean  @default(false)
  locale           String   @default("de")
  role            Role      @default(MEMBER)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  householdMemberships HouseholdMember[]
  assets               Asset[]
  monthlyIncomes       MonthlyIncome[]
  monthlyPayouts       MonthlyPayout[]
  dashboardWidgets     DashboardWidget[]
}

enum Role { ADMIN  MEMBER }

model Household {
  id        String   @id @default(cuid())
  name      String
  currency  String   @default("EUR")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  members            HouseholdMember[]
  assets             Asset[]
  invites            HouseholdInvite[]
  fixedCosts         FixedCost[]
  monthlyIncomes     MonthlyIncome[]
  monthlyPayouts     MonthlyPayout[]
  fixedCostSnapshots MonthlyFixedCostSnapshot[]
}

model HouseholdMember {
  id          String        @id @default(cuid())
  userId      String
  householdId String
  role        HouseholdRole @default(MEMBER)
  joinedAt    DateTime      @default(now())

  user      User      @relation(...)
  household Household @relation(...)
  @@unique([userId, householdId])
}

enum HouseholdRole { OWNER  ADMIN  MEMBER }

model HouseholdInvite {
  id          String    @id @default(cuid())
  householdId String
  email       String    // wird nicht aktiv genutzt (kein E-Mail-Matching)
  token       String    @unique @default(cuid())
  expiresAt   DateTime
  usedAt      DateTime?
  createdAt   DateTime  @default(now())
  household   Household @relation(...)
}

// ─── Haushaltskasse ───────────────────────────────────────────────────────────

model FixedCost {
  id          String    @id @default(cuid())
  householdId String
  name        String
  amount      Decimal   @db.Decimal(12, 2)
  order       Int       @default(0)
  household   Household @relation(...)
  @@index([householdId])
}

model MonthlyIncome {
  id          String   @id @default(cuid())
  householdId String
  userId      String
  year        Int
  month       Int      // 1–12
  amount      Decimal  @db.Decimal(12, 2)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  household   Household @relation(...)
  user        User      @relation(...)
  @@unique([householdId, userId, year, month])
}

model MonthlyPayout {
  id          String   @id @default(cuid())
  householdId String
  userId      String
  year        Int
  month       Int      // 1–12
  amount      Decimal  @db.Decimal(12, 2)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  household   Household @relation(...)
  user        User      @relation(...)
  @@unique([householdId, userId, year, month])
}

// Fixkosten werden beim ersten Einkommenseintrag eines Monats eingefroren (B-02).
model MonthlyFixedCostSnapshot {
  id          String   @id @default(cuid())
  householdId String
  year        Int
  month       Int
  fixedCosts  Decimal  @db.Decimal(12, 2)
  household   Household @relation(...)
  @@unique([householdId, year, month])
}

// F-33: gespeicherte Was-wäre-wenn-Szenarien, strikt getrennt von echten Monatsdaten.
model HouseholdFinanceSimulation {
  id          String   @id @default(cuid())
  householdId String
  createdById String?
  name        String
  startYear   Int
  startMonth  Int
  endYear     Int
  endMonth    Int
  months      HouseholdFinanceSimulationMonth[]
}

model HouseholdFinanceSimulationMonth {
  id           String  @id @default(cuid())
  simulationId String
  year         Int
  month        Int
  fixedCosts   Decimal @db.Decimal(12, 2)
  entries      HouseholdFinanceSimulationEntry[]
  @@unique([simulationId, year, month])
}

model HouseholdFinanceSimulationEntry {
  id                String @id @default(cuid())
  simulationMonthId String
  userId            String
  type              SimulationEntryType // INCOME oder PAYOUT
  amount            Decimal @db.Decimal(12, 2)
  @@unique([simulationMonthId, userId, type])
}

enum SimulationEntryType { INCOME  PAYOUT }

// ─── Investments ─────────────────────────────────────────────────────────────

model Asset {
  id          String    @id @default(cuid())
  householdId String
  userId      String
  ticker      String
  name        String
  type        AssetType
  currency    String    @default("EUR")
  isin        String?
  wkn         String?
  notes       String?
  account     String    @default("")  // Pflichtfeld: Depot/Konto (z. B. "Trade Republic")
  quantity    Decimal   @db.Decimal(18, 6)
  order       Int       @default(0)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  household Household    @relation(...)
  user      User         @relation(...)
  entries   AssetEntry[]

  // Zwei Mitglieder können denselben Ticker an verschiedenen Konten halten
  @@unique([householdId, userId, ticker])
}

enum AssetType { STOCK  ETF  CRYPTO  BOND  OTHER }

model AssetEntry {
  id        String         @id @default(cuid())
  assetId   String
  type      AssetEntryType
  price     Decimal        @db.Decimal(18, 6)
  quantity  Decimal?       @db.Decimal(18, 6)
  date      DateTime
  note      String?
  createdAt DateTime       @default(now())

  asset Asset @relation(...)
}

enum AssetEntryType { PURCHASE  SALE  PRICE_UPDATE  QUANTITY_UPDATE  VWAP_UPDATE }

// F-32/Ä-09: Manuelle Dividenden-Buchungen; keine automatische Dividendenquelle.
model DividendPayment {
  id             String         @id @default(cuid())
  householdId    String
  assetId        String
  userId         String
  year           Int
  exDate         DateTime
  payDate        DateTime?
  amountPerShare Decimal        @db.Decimal(18, 6)
  quantity       Decimal        @db.Decimal(18, 6)
  grossAmount    Decimal        @db.Decimal(12, 2)
  taxAmount      Decimal        @db.Decimal(12, 2)
  netAmount      Decimal        @db.Decimal(12, 2)
  currency       String
  eurRate        Decimal        @db.Decimal(18, 6)
  status         DividendStatus // EXPECTED oder RECEIVED
  source         DividendSource // bleibt aus Bestandsmodell, neue Einträge immer MANUAL
  note           String?
}

enum DividendStatus { EXPECTED  RECEIVED }
enum DividendSource { YAHOO  MANUAL }

// ─── Dashboard ────────────────────────────────────────────────────────────────

// Widget-Layout pro User — gespeichert in DB, geladen beim ersten Dashboard-Aufruf.
model DashboardWidget {
  id       String @id @default(cuid())
  userId   String
  widgetId String  // siehe WIDGET_REGISTRY in useWidgets.ts (11 Widget-Typen)
  x        Int    @default(0)
  y        Int    @default(0)
  w        Int    @default(4)
  h        Int    @default(3)

  user User @relation(...)
  @@unique([userId, widgetId])
}
```

**Schlüsselprinzip:** `amount` und `price` immer als `Decimal` — nie `Float` für Finanzdaten.

---

## Externe APIs & Self-hosted

| API | Verwendung | Env / Verhalten bei Ausfall |
|---|---|---|
| `query1.finance.yahoo.com` | Suche, Kurs, Historie, Forex (`getEurRate`) | Kurs leer / 503 bei FX-Fehler; `refresh-prices` überspringt Ticker |
| `api.coingecko.com` | Krypto-Suche (parallel zu Yahoo) | Leere Krypto-Treffer |
| `api.nasdaq.com` | Marktkalender-Widget | `MARKET_CALENDAR_EXTERNAL=false` → kein Abruf; sonst Fail-fast + leere Liste |

**Multi-Tenant:** `householdId` immer aus Session/JWT — nie aus Request-Body akzeptieren.

**Tenant-Provisioning (F-36, Hybrid):** Haushalts-`OWNER` kann unter **Benutzer → Benutzer anlegen** wählen:

| `tenancy` | Verhalten |
|---|---|
| `household` | User wird `MEMBER` im aktiven Haushalt des Owners (bisheriges Verhalten). |
| `tenant` | Neuer `Household` (optionaler Name, sonst `Haushalt {username}`), User wird `OWNER` dort, Standard-Fixkosten wie bei Register; **keine** `HouseholdMember`-Zeile im Admin-Haushalt. |

Cross-Tenant-Zugriff ist durch Session-Grenzen verhindert (alle Daten-APIs filtern `householdId`). Im **gemeinsamen** Haushalt mit mehreren Mitgliedern bleibt das **gemeinsame** Investment-Portfolio (`GET /api/assets` ohne `userId`-Filter); Einpersonen-Tenant-Haushalte sehen nur eigene Daten.

**Provisionierte Benutzer:** `User.provisionedByUserId` wird bei `POST /api/admin/users` gesetzt. Der Owner sieht Tenant-User, die nicht im aktiven Haushalt sind, unter **Benutzer → Angelegte Benutzer (eigene Haushalte)** (`GET /api/household` → `provisionedUsers`). Bearbeiten/2FA für diese User nur durch den anlegenden Owner.
