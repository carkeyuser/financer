# Financer — Personal Finance Dashboard

Self-hosted finance dashboard for small households (couples, roommates). Manual data entry only — no bank or broker APIs.

**Repository:** [github.com/carkeyuser/financer](https://github.com/carkeyuser/financer) · **License:** MIT

## Preview

Configurable dashboard with a widget grid — clock, top/flop movers, allocation, and positions (light/dark):

| Light | Dark |
|---|---|
| ![Dashboard — Light Mode](docs/screenshots/dashboard-light.png) | ![Dashboard — Dark Mode](docs/screenshots/dashboard-dark.png) |

**Mobile:** Responsive layout for phones and tablets — hamburger menu, touch-friendly widget cards (move/close), and a single-column dashboard grid. Same features as desktop, optimized for small viewports (dark mode):

| Dashboard (mobile) | Navigation (mobile) |
|---|---|
| ![Dashboard — mobile, dark mode](docs/screenshots/dashboard-mobile-dark.png) | ![Sidebar — mobile, dark mode](docs/screenshots/sidebar-mobile-dark.png) |

**Investments — value history** (dark): Historical portfolio value with time-range presets (1W through all-time) and Yahoo curves from first purchase date:

![Investments — value history, dark mode](docs/screenshots/investments-value-chart-dark.png)

**Dividends — monthly chart** (dark): Manually recorded dividends and bank interest as a bar chart per month:

![Dividends — monthly chart, dark mode](docs/screenshots/dividends-monthly-chart-dark.png)

**Settings — 2FA** (dark): TOTP two-factor authentication (QR setup in settings, admin toggle under Users):

![Settings — 2FA enabled, dark mode](docs/screenshots/settings-2fa-dark.png)

| Area | Contents |
|---|---|
| **Investments** | Portfolio tracking (stocks, ETFs, crypto), Yahoo Finance prices, VWAP, 4 chart types, historical curves, auto-refresh (2h) |
| **TR import** | Trade Republic CSV (7-step wizard), selection step, conflict resolution, clear depot before re-import |
| **Positions** | Merge duplicates (merge wizard), hide zero positions |
| **Dividends** | Manual dividend entries on positions, annual KPIs, monthly chart |
| **Household cash** | Fixed costs, monthly income, payout logic with quarterly bonus; **simulations** (what-if scenarios) |
| **Dashboard** | Configurable widget grid (drag & drop, **12 widgets** including net-worth snapshot) |
| **Today** | Daily briefing (`/heute`): portfolio, top/flop, calendar, household, dividends, month routine |
| **Notifications** | Notification bell in the sidebar (prices, events, household, dividends) |
| **Multi-user** | Households, roles, invites, tenant provisioning, 2FA (TOTP) |
| **Security** | Username + password, JSON backup/restore (incl. dividends & simulations) |
| **Language** | German / English (per user in settings) |

**Release:** [v0.1.0](CHANGELOG.md#010---2026-06-02) · No expenses/budget module (removed — did not fit the usage model).

**Tech stack:** Next.js 16 · React 19 · TypeScript · PostgreSQL 16 · Prisma 7 · NextAuth v5 · shadcn/ui · Tailwind CSS v4 · Recharts  
**Deployment:** Docker Compose (self-hosted on your server)  
**Project docs:** [plan/README.md](plan/README.md) — architecture, schema, backlogs, changelog

---

## Table of contents

1. [Preview](#preview)
2. [Feature overview](#1-feature-overview)
3. [Tech stack & architecture](#2-tech-stack--architecture)
4. [Prepare your server](#3-prepare-your-server)
5. [Install Docker](#4-install-docker)
6. [Deploy the project](#5-deploy-the-project)
7. [Configuration (.env)](#6-configuration-env)
8. [Start & updates](#7-start--updates)
9. [First login & demo data](#8-first-login--demo-data)
10. [Backups](#9-backups)
11. [Useful commands (server)](#10-useful-commands-server)
12. [Local development](#11-local-development)
13. [Tests](#12-tests)
14. [Troubleshooting](#13-troubleshooting)
15. [Known limitations](#14-known-limitations)
16. [Project structure](#15-project-structure)

---

## 1. Feature overview

### Dashboard (`/dashboard`)

- Configurable widget grid with drag & drop and resize
- **11 widgets:** portfolio KPIs, value history, allocation, positions table, clock, market calendar (Nasdaq), top/flop, household overview, currency exposure, net worth, dividend KPIs
- Layout saved per user in the DB (auto-save after drag/resize); widget manager to show/hide widgets
- Auto-sort button packs widgets without gaps
- Market calendar: primarily US tickers without suffix; without outbound HTTPS → `MARKET_CALENDAR_EXTERNAL=false` (see [Known limitations](#14-known-limitations))

### Investments (`/investments`)

- Security search via Yahoo Finance + CoinGecko (crypto fallback)
- Positions with depot/account, owner, notes, ISIN/WKN
- Buy/sell, add-to-position logic (same ticker → quantity summed, VWAP updated)
- Inline corrections on the detail page: price, quantity, average buy price
- 4 switchable charts: allocation (pie), value history, P/L history, P/L per position
- Historical Yahoo prices in charts (from first purchase date); time presets (1W–all-time)
- All values in EUR (FX via Yahoo Forex; FX errors → API 503, no wrong EUR figures)
- Card/list view, sorting (depot/owner/value), drag & drop for order
- Zero positions hidden by default (filter in the list)
- Auto-refresh of prices every 2h (`PortfolioPriceRefresh` in `AuthGuard`)

**Trade Republic import** (“Import” button):

- CSV from the TR app; 7-step wizard with NDJSON progress and ETA
- Selection step: rows via checkbox, quick select (all/none/new only/…), sort by amount
- Hard dedup via order ID (`importRef`); soft match against manual bookings (skip/import/link/replace)
- ISIN→ticker (portfolio before Yahoo); interest → automatic `Interest` position
- **Clear depot:** delete all positions of an account incl. bookings/dividends before re-import (optional checkbox)

**Merge positions** (admin, “Merge” button):

- Duplicate suggestions (same security, different ticker/missing ISIN) or manual selection
- Entries and dividends move to the target position; quantity recalculated

### Dividends (`/dividenden`)

- Manual dividend payments on existing positions (no Yahoo import)
- Annual KPIs and monthly chart, position overview

### Household cash (`/haushaltskasse`)

- Manage fixed costs (always visible above the annual table)
- Monthly income and payouts per user
- Fixed-cost snapshot: frozen on first income entry of a month
- Quarterly bonus from surpluses (theoretical − actual over 3 months)
- **Simulation** (`/haushaltskasse/simulation`): saved scenarios with a free time range — does not overwrite real monthly data

### Users & household (`/household`)

- Member list with roles (owner, admin, member)
- Create users directly (owner/admin): **member of this household** or **own household (tenant)** — tenant users do not appear in the member list and are data-isolated
- **Provisioned users (own households):** owner’s tenant users can be edited, 2FA toggled, deleted (owner and admin)
- Invite link (7-day token) for the active household
- Household switcher in the sidebar
- Admin: edit household members (name, username, reset password)
- 2FA per user via admin toggle

### Settings (`/settings`)

- Profile (display name, username), change password
- Enable/disable 2FA (TOTP with QR code)
- Language: German / English
- Backup: JSON export + restore
- Release notes / update dialog (also in the sidebar via “Release Notes”)

---

## 2. Tech stack & architecture

```
Browser → Next.js App Router (port 3000)
              ↓
         NextAuth v5 (JWT, username + password, optional 2FA)
              ↓
         Prisma 7 + @prisma/adapter-pg
              ↓
         PostgreSQL 16 (internal Docker network, port 5432 not exposed)
```

| Layer | Technology |
|---|---|
| Framework | Next.js 16 App Router + TypeScript |
| Auth | NextAuth.js v5 (credentials), bcryptjs, TOTP via otplib |
| Database | PostgreSQL 16 + Prisma 7 (driver adapter `@prisma/adapter-pg`) |
| UI | shadcn/ui + Tailwind CSS v4 + next-themes (dark/light) |
| Charts | Recharts |
| Dashboard grid | react-grid-layout |
| Data fetching | TanStack Query v5 |
| Forms | React Hook Form + Zod (shared schemas frontend ↔ API) |
| DnD | @dnd-kit (investment sort order) |
| Prices | Yahoo Finance (stocks/ETFs/FX) + CoinGecko (crypto) |
| i18n | React context + de/en messages (`src/i18n/`) |
| Tests | Vitest + Testing Library |

**Multi-tenant:** All data is bound to a `householdId`. The ID always comes from the session (JWT) — never from the request body.

**Docker network:**

```
finance_app (Next.js :3000) ←── finance_net (bridge) ────→ finance_db (PostgreSQL :5432)
```

Postgres port is not exposed externally. The app starts only after the DB is healthy.

---

## 3. Prepare your server

You need a Linux host (VM, bare metal, or container) with SSH access and enough resources to run Docker:

| Resource | Recommendation |
|---|---|
| CPU | 2 cores |
| RAM | 2048 MB |
| Disk | 20 GB |
| Network | Static IP or DHCP (note the address for `NEXTAUTH_URL`) |

If you run Docker inside a nested container (e.g. LXC), enable nesting and `keyctl` on your **container host** — see your platform’s documentation.

---

## 4. Install Docker

Run on **your server** as root (Debian/Ubuntu example; other distros: [Docker docs](https://docs.docker.com/engine/install/)):

```bash
# System update
apt update && apt upgrade -y

# Dependencies
apt install -y ca-certificates curl gnupg

# Docker GPG key
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg \
  -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

# Add Docker repository
echo "deb [arch=$(dpkg --print-architecture) \
  signed-by=/etc/apt/keyrings/docker.asc] \
  https://download.docker.com/linux/debian \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
apt update
apt install -y docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin

# Enable Docker on boot
systemctl enable docker
systemctl start docker

# Verify
docker --version
docker compose version
```

---

## 5. Deploy the project

### Option A: One-liner on a fresh LXC (recommended)

Inside the container as **root** (Debian 12). Installs Docker if missing, clones to `/opt/financer`, creates `.env`, builds and starts the stack:

```bash
curl -fsSL https://raw.githubusercontent.com/carkeyuser/financer/main/install.sh | bash
```

Optional:

```bash
FINANCER_DIR=/opt/financer FINANCER_REF=main curl -fsSL https://raw.githubusercontent.com/carkeyuser/financer/main/install.sh | bash
```

The script prompts for **NEXTAUTH_URL** (browser URL for login — suggested LAN IP). Updates later: `cd /opt/financer && ./scripts/update.sh` — see [plan/deploy.md](plan/deploy.md).

After cloning locally, you can also run `./install.sh` from the repo root.

**Windows (Docker Desktop):** `.\install.ps1` in the cloned repo.

### Option B: From Windows with `push.ps1` (developer deploy)

> **Developer deploy (optional):** The repo includes `push.example.ps1` and `pack.example.ps1`. Copy them locally to `push.ps1` and `pack.ps1` and set your server IP — these files are **not** committed (see `.gitignore`).

```powershell
# One-time: copy push.example.ps1 → push.ps1, set YOUR_SERVER
Copy-Item push.example.ps1 push.ps1

# In the project directory
.\push              # copy only
.\push -Deploy      # copy + docker compose up -d --build on the server
```

The script copies relevant files via `robocopy` + `scp` to your deployment directory on the server (default in `push.ps1`: `/path/to/financer`). With `-Deploy`, a Docker rebuild follows over SSH. Multiple `ssh`/`scp` calls can share one session (password once if no SSH key is configured).

**Excluded:** `node_modules`, `.next`, `src/generated`, `.env`/`.env.local`, `.codegraph`, `*.tsbuildinfo`, `.claude`

### Option C: Git clone on the server

```bash
ssh root@YOUR_SERVER
git clone https://github.com/carkeyuser/financer.git /path/to/financer
cd /path/to/financer
cp .env.example .env && nano .env
docker compose up -d --build
```

In `.env` set: `FINANCER_DEPLOY_MODE=build` (default) or `ghcr` — see [section 7](#7-start--updates) and [plan/deploy.md](plan/deploy.md).

### Option D: Manual via `scp`

```powershell
scp -r . root@YOUR_SERVER:/path/to/financer/
# Exclude node_modules, .next, and secrets manually beforehand
```

---

## 6. Configuration (.env)

**One-time on the server:**

```bash
ssh root@YOUR_SERVER
cd /path/to/financer
cp .env.example .env
nano .env
```

Fill in the file:

```env
# PostgreSQL
POSTGRES_USER=financeuser
POSTGRES_PASSWORD=<secure_password_here>
POSTGRES_DB=finance

# Used internally by the app (db = Docker service name)
DATABASE_URL=postgresql://financeuser:<password>@db:5432/finance

# Generate random key: openssl rand -base64 32
NEXTAUTH_SECRET=<long_random_key>

# URL where the app is reachable
NEXTAUTH_URL=http://YOUR_SERVER:3000

# Deploy mode: build (git pull + local build) or ghcr (image pull)
FINANCER_DEPLOY_MODE=build

# Optional: no outbound HTTPS to api.nasdaq.com (restricted network)
# MARKET_CALENDAR_EXTERNAL=false
```

> **Never commit** `.env` — it contains secrets. The file stays on the server only.

**Local (`.env.local`):** Same variables, but `DATABASE_URL` points to local PostgreSQL (e.g. `postgresql://financeuser:pass@localhost:5432/finance`). For LAN access in dev mode also:

```env
AUTH_TRUST_HOST=true
NEXTAUTH_URL=http://192.168.x.x:3000
```

---

## 7. Start & updates

### First start

```bash
ssh root@YOUR_SERVER
cd /path/to/financer
docker compose up -d --build
```

On startup, `docker-entrypoint.sh` runs `prisma db push` automatically — the current schema is applied to the database (idempotent). The image only includes the Prisma CLI (not the full builder `node_modules`).

> **Note:** Production uses `db push` because the DB was originally created without migration history. Locally, migrations from `prisma/migrations/` are applied via `npx prisma migrate deploy`.

**Check status:**

```bash
docker compose ps
docker compose logs -f app
```

App URL: `http://YOUR_SERVER:3000` (or the URL set in `NEXTAUTH_URL`)

### Applying updates

Mode in `.env`: `FINANCER_DEPLOY_MODE=build` (default) or `ghcr`. Full reference: **[plan/deploy.md](plan/deploy.md)**.

**One command (both modes):**

```bash
cd /path/to/financer
./scripts/update.sh
```

**Mode `build`** — git clone, local build:

```bash
cd /path/to/financer
git pull
docker compose up -d --build
```

Hard reset to `origin/main`: `./scripts/deploy.sh`

> **`--build` is required** — `docker compose up -d` alone only restarts the old container.

**Mode `ghcr`** — pre-built image (CI pushes `:latest` on every push to `main`):

```bash
cd /path/to/financer
docker compose -f docker-compose.yml -f docker-compose.prod.yml pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

In `.env`: `FINANCER_DEPLOY_MODE=ghcr`. For a private package: `docker login ghcr.io` once.

Image: `ghcr.io/carkeyuser/financer:latest` (override via `FINANCER_IMAGE`).

**From Windows (optional, mode `build`, with `push.ps1`):**

```powershell
.\push -Deploy
```

Copy only without build: `.\push`

Schema changes are applied automatically on container start via `prisma db push`.

---

## 8. First login & demo data

After the first start there is no user yet. Create the first account via the registration page:

```
http://YOUR_SERVER:3000/auth/register
```

That first account automatically becomes **owner** of the household. Additional users can be added via **Users → Create user** or an invite link.

**Optional: load demo data**

```bash
docker compose exec app ./node_modules/.bin/prisma db seed   # seed needs tsx — on failure seed locally with DATABASE_URL
```

Creates demo users + generic default fixed costs (housing, utilities, etc.).

---

## 9. Backups

There are two independent backup strategies:

### In-app backup (recommended for data migration)

Under **Settings → Backup**.

**Export** (all household members):
- Button “Create backup” → JSON file `financer-backup-YYYY-MM-DD.json`
- Includes: fixed costs, monthly income, payouts, snapshots, securities + purchase history, **dividends**, **household-cash simulations**
- Excludes: passwords, sessions, auth tokens, 2FA secrets, dashboard widget layouts

**Restore** (owner/admin only):
- Select JSON file → confirmation dialog
- Deletes all current household data and replaces it completely
- Usernames from the backup are mapped to current household members

> **Use for:** moving to a new server, recovery after mistakes, data migration.

### Database dump (recommended for full server backups)

Backs up the entire PostgreSQL database including user accounts and auth data:

```bash
# Create dump (on the server)
docker compose exec db pg_dump -U financeuser finance > backup_$(date +%Y%m%d).sql

# Restore
docker compose exec -T db psql -U financeuser finance < backup_20260524.sql
```

> **Use for:** full server backup, disaster recovery, scheduled cron backups.

**Cron example** (daily at 3 AM):

```bash
0 3 * * * cd /path/to/financer && docker compose exec -T db pg_dump -U financeuser finance > /backups/financer_$(date +\%Y\%m\%d).sql
```

---

## 10. Useful commands (server)

**Manage containers:**

```bash
docker compose ps                          # show status
docker compose logs -f app                 # app logs live
docker compose logs -f db                  # DB logs live
docker compose down                        # stop (data preserved)
docker compose down -v                     # stop + delete volumes (WARNING: deletes DB!)
docker compose restart app                 # restart app only
docker compose exec app sh                 # shell in app container
```

**Database:**

```bash
# Direct DB access
docker compose exec db psql -U financeuser -d finance

# Prisma Studio (GUI, via SSH tunnel)
ssh -L 5555:localhost:5555 root@YOUR_SERVER \
  "cd /path/to/financer && docker compose exec app ./node_modules/.bin/prisma studio"
# Then in browser: http://localhost:5555

# Schema status
docker compose exec app ./node_modules/.bin/prisma db push --dry-run
```

**Resources:**

```bash
docker system df                           # disk usage
docker compose exec db psql -U financeuser -d finance -c "\dt"  # list tables
```

---

## 11. Local development

**Requirements:** Node.js 20+, PostgreSQL locally or via Docker

```powershell
npm install
cp .env.example .env.local
# Set DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL, AUTH_TRUST_HOST=true

npx prisma generate
npx prisma migrate deploy
npx prisma db seed          # optional
npm run dev
```

App runs at `http://localhost:3000`.

### Important commands

```bash
npm run dev           # dev server
npm run build         # verify production build
npm run lint          # ESLint
npm run test          # unit tests (Vitest)
npm run test:watch    # tests in watch mode

npx prisma generate            # client after schema change
npx prisma migrate deploy      # apply migrations
npx prisma db seed             # demo data
npx prisma studio              # DB GUI (http://localhost:5555)
```

### LAN access in dev mode

If the browser opens the app via a different IP than `NEXTAUTH_URL` (e.g. `192.168.x.x:3000`):

1. `.env.local`: `AUTH_TRUST_HOST=true`, `NEXTAUTH_URL=http://192.168.x.x:3000`
2. `next.config.ts`: add IP to `allowedDevOrigins`
3. `src/lib/auth.ts`: `trustHost: true` is already set

### Prisma 7 — specifics

- No `url` in the schema — URL from `prisma.config.ts` (CLI) and `@prisma/adapter-pg` (runtime)
- Import path: always `from "@/generated/prisma"` — never `from "@prisma/client"`
- After schema changes: `npx prisma generate` + create/apply migration

### Layout rule

`AuthGuard` belongs only in each main route’s `layout.tsx` — not again in page components (avoids duplicate sidebar).

---

## 12. Tests

**202 unit tests** in 26 files (Vitest + Testing Library):

```bash
npm run test          # once
npm run test:watch    # watch mode
```

| Area | Files (sample) |
|---|---|
| Core | `calculations.test.ts`, `validations.test.ts`, `currency.test.ts`, `security-price.test.ts` |
| Household | `household-finance.test.ts` |
| Dividends | `dividends.test.ts`, `interest-asset.test.ts` |
| Dashboard | `nasdaq-calendar.test.ts`, `release-notes.test.ts` |
| TR import | `trade-republic-csv.test.ts`, `tr-import-*.test.ts` (parser, routes, selection, sort, ticker, ISIN) |
| Merge / depot | `asset-merge.test.ts`, `merge-apply.test.ts`, `merge-suggestions-route.test.ts`, `delete-investment-account*.test.ts` |
| Admin | `delete-provisioned-user.test.ts` |
| Other | `i18n.test.ts`, `isin-resolver.test.ts` |

Full list: `src/test/`. Unit tests only — no E2E or API integration tests.

---

## 13. Troubleshooting

### App won’t start / container crashes

```bash
docker compose logs app --tail 50
```

Common causes: missing `.env`, wrong `DATABASE_URL`, DB not healthy yet.

### Build fails (`npm run build` / `docker compose up --build`)

Check locally first:

```bash
npm run build
npm run lint
```

TypeScript errors block the Docker build (multi-stage: `npm run build` in the builder stage).

### Login fails / redirect loop

- `NEXTAUTH_URL` must exactly match the URL where the app is reachable
- On the server: `AUTH_TRUST_HOST=true` (already set in `docker-compose.yml`)
- Local over LAN: see [LAN access](#lan-access-in-dev-mode)

### 404 after logout

Logout redirects to `/auth/login`. Direct visits to `/login` redirect there automatically.

### Security search returns nothing

- Yahoo Finance does **not** support German **WKN** (e.g. `A142N1`)
- Search by ticker (`EUNL.DE`, `VWCE.DE`), name, or ISIN
- Crypto: name or symbol (`Bitcoin`, `BTC`, `Ripple`)

### Prices show wrong currency

EUR assets store the EUR price; USD assets store the native price. The UI converts everything to EUR.

### Widget layout lost

Layout is stored in the DB per user. Auto-saves after drag/resize. If issues persist: clear browser cache, reload (F5).

### App hangs / market calendar timeouts

Logs with many `api.nasdaq.com` errors or `failed to pipe response`: market calendar widget blocks the server.

```env
# In server .env, then restart container
MARKET_CALENDAR_EXTERNAL=false
```

Alternatively: disable the market calendar widget on the dashboard.

### No live prices

Yahoo (`query1.finance.yahoo.com`) must be reachable from the container. Otherwise set prices manually via inline edit or refresh button.

### Prisma errors after schema change

```bash
# Local
npx prisma generate
npx prisma migrate deploy

# Server (automatic on start, manual if needed)
docker compose exec app ./node_modules/.bin/prisma db push
docker compose restart app
```

---

## 14. Known limitations

| Topic | Details |
|---|---|
| **WKN search** | German WKN not supported by Yahoo — use ticker (`EUNL.DE`), name, or ISIN |
| **No bank APIs** | All data manual; dividends only via `/dividenden` |
| **Outbound HTTPS** | Yahoo (prices) and Nasdaq (market calendar) must be reachable from the app container |
| **Market calendar** | Nasdaq: mainly US symbols without suffix (`.DE`, crypto, FX ignored). Without access: `MARKET_CALENDAR_EXTERNAL=false` |
| **EUR history** | Historical charts use current EUR rate as approximation |
| **Widget layouts** | Not included in JSON backup |
| **Lint (dev)** | `npm run lint` (`next lint`) broken on Next.js 16 for now — see backlog Ä-10 in `plan/aenderungen.md` |

**Open backlog** (details in `plan/features.md`): one-click install (F-31), DE/ETF market calendar (F-34).

---

## 15. Project structure

```
financer/
├── docs/
│   └── screenshots/           # README preview (dashboard, mobile, charts, 2FA)
├── plan/                      # project docs, architecture, backlogs, deploy.md
├── scripts/
│   ├── update.sh              # server update (build or ghcr)
│   └── deploy.sh              # hard reset to origin/main + rebuild
├── README.md                  # this file
├── CHANGELOG.md               # release history (Keep a Changelog)
├── .env.example               # env template
├── docker-compose.yml         # PostgreSQL + Next.js
├── docker-compose.prod.yml    # GHCR overlay (pull deploy)
├── Dockerfile                 # multi-stage build (standalone)
├── push.example.ps1           # deploy template (copy locally → push.ps1)
├── pack.example.ps1           # pack template (copy locally → pack.ps1)
├── prisma/
│   ├── schema.prisma          # DB schema
│   ├── prisma.config.ts       # Prisma 7 DB URL
│   ├── seed.ts                # demo data
│   └── migrations/            # SQL migrations (local)
└── src/
    ├── app/                   # Next.js App Router (pages + API routes)
    ├── components/            # UI (shadcn, dashboard, investments, …)
    ├── hooks/                 # TanStack Query hooks
    ├── i18n/                  # German/English
    ├── lib/                   # auth, Prisma, validations, utils
    ├── test/                  # Vitest unit tests
    └── generated/prisma/      # Prisma 7 client (generated)
```

More details: [plan/README.md](plan/README.md)
