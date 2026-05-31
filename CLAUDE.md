# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Pflichtlektüre zum Session-Start

Lies zu Beginn jeder Session **plan/README.md** vollständig durch. Wenn die Aufgabe Architektur, Setup, Phasen, Backlogs oder Historie betrifft, lies zusätzlich die dort verlinkten Dateien in **plan/**.

Nach jeder Codeänderung **plan/README.md** und bei Bedarf die passende Datei in **plan/** aktualisieren: erledigte Aufgaben abhaken, neue Entscheidungen oder Architekturänderungen dokumentieren, Änderungslog in `plan/changelog.md` ergänzen.

## Project Overview

Personal finance dashboard for a small family/team. Self-hosted via Docker on a Proxmox LXC (path: `/opt/financer`). Manual data entry only — no bank APIs or broker connections. Full plan starts in [plan/README.md](plan/README.md); backlogs and changelog live under [plan/](plan/).

## Commands

```bash
npm run dev           # development server (localhost:3000)
npm run build         # production build
npm run lint          # ESLint

npx prisma generate                    # regenerate client after schema changes
npx prisma migrate dev --name <name>   # create and apply a migration
npx prisma studio                      # GUI to inspect the database
npx prisma db seed                     # seed standard categories
```

**Deploy to test server:**
```powershell
# Windows → Server kopieren + auf Server bauen
# push.example.ps1 nach push.ps1 kopieren und YOUR_SERVER anpassen
.\push -Deploy
```

Vollständige Deployment-Dokumentation (LXC-Setup, Docker-Install, Backup, Troubleshooting): **[README.md](README.md)**

Environment variables: `.env.local` (local dev, never commit), `.env` on server. Template: `.env.example`.

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14+ App Router + TypeScript |
| Auth | NextAuth.js v5 (Auth.js) — Credentials Provider only |
| Database | PostgreSQL 16 + **Prisma 7** ORM |
| UI | shadcn/ui + Tailwind CSS + next-themes |
| Charts | Recharts |
| Data fetching | TanStack Query v5 |
| Forms | React Hook Form + Zod |
| Securities | Yahoo Finance (unofficial, no API key needed) |

## Prisma 7 — Breaking Changes beachten

Prisma 7 weicht von älteren Versionen ab:

- **Kein `url` im Schema:** `datasource db` hat keine `url`-Property. URL für CLI-Befehle kommt aus `prisma.config.ts`, für Runtime via Adapter.
- **Driver Adapter Pflicht:** PostgreSQL braucht `@prisma/adapter-pg` im PrismaClient-Konstruktor (siehe `src/lib/prisma.ts`).
- **Import-Pfad:** Immer `from "@/generated/prisma"` — nie `from "@prisma/client"`.

## Architecture

### Multi-tenant Household Model
All data (transactions, assets, budgets, categories) is scoped to a `householdId`. Users belong to one or more households via `HouseholdMember`. **Never** accept `householdId` from the request body — always derive it from the authenticated session.

### API Route Pattern
```ts
const session = await auth()
const householdId = session.user.householdId  // aus JWT, nie aus Request-Body
```

Every API route (`src/app/api/*/route.ts`) must: validate session → extract `householdId` from session → validate body with Zod schema from `src/lib/validations/`.

### Shared Zod Schemas
Schemas in `src/lib/validations/` are used on both the frontend (React Hook Form) and the API routes. Never duplicate validation logic.

### Financial Precision
All monetary amounts are `Decimal(12,2)` (transactions) or `Decimal(18,6)` (asset prices) in Prisma — never `Float`. Use `date-fns` for all date arithmetic.

### Investment Data Model
- `Asset` = one security (ticker) per household — enforced by `@@unique([householdId, ticker])`
- `AssetEntry` = one event: `PURCHASE`, `SALE`, or `PRICE_UPDATE`
- VWAP calculated from purchase history in `src/lib/utils/calculations.ts`

### Data Flow
```
Client → React Hook Form + Zod → API Route (session + Zod) → Prisma → PostgreSQL
Read:  PostgreSQL → Prisma → TanStack Query → React components
External: Yahoo Finance → /api/securities/search + /api/securities/price (proxied)
```

### Key Singletons
- `src/lib/prisma.ts` — PrismaClient singleton mit `@prisma/adapter-pg`
- `src/lib/auth.ts` — NextAuth v5; injiziert `householdId` in JWT

## Deployment

`docker-compose.yml` baut das Image auf dem Server (`build: .`) und startet PostgreSQL 16 + Next.js. `next.config.ts` hat `output: 'standalone'` (Pflicht für Docker). DB-Migrationen laufen automatisch beim Container-Start via `npx prisma migrate deploy`.

`push.example.ps1` (lokal als `push.ps1` kopieren) kopiert den Source per robocopy + scp nach `/opt/financer`; `-Deploy` startet danach `docker compose up -d --build` per SSH.

## Implementation Phases

- [x] **Phase 1** — Auth + Skeleton: Login, Register, NextAuth v5, Sidebar, ThemeToggle, AuthGuard, Dashboard-Platzhalter
- [x] **Phase 2** — Expenses (Transaktionen, Kategorien, Budgets, ExpensesChart, Budgets-Fortschrittsbalken)
- [x] **Phase 3** — Investments (Wertpapiersuche Yahoo Finance, Portfolio CRUD, 4 Charts, VWAP)
- [x] **Phase 4** — Dashboard (4 KPI-Cards, Wert-Verlauf, Allokations-Pie, Positionen-Tabelle)
- [x] **Phase 5** — Multi-User Household-Management (Invites, Rollen, Switcher, Settings)
