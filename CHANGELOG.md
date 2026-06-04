# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Changed

- **CI** — Parallel `quality` (lint/test) and `build` jobs; Docker assembles from pre-built Next.js standalone (`Dockerfile.ci`) instead of running `next build` again (~3–4 min faster on release runs)

## [0.1.4] - 2026-06-04

### Added

- **Retrowave theme (F-47)** — Third appearance option alongside light and dark: synthwave neon palette (violet background, magenta/cyan accents), horizon grid overlay, Orbitron headings, theme picker in Settings, three-way cycle toggle in the shell, chart colors via CSS variables
- **Retrowave V2** — Starfield with shooting stars (`RetrowaveAmbience` canvas), glassy neon cards, stronger horizon grid; respects `prefers-reduced-motion`
- **Local dev bootstrap** — `docker-compose.dev.yml`, `npm run setup:dev` / `db:up`, dev server on port **3001** (avoids WSL hijacking `localhost:3000` on Windows)

### Changed

- **Prisma seed** — Re-running seed resets `demo` / `demo2` password to `demo1234` (or `SEED_DEMO_PASSWORD`) and clears 2FA on demo accounts for reliable local login

## [0.1.3] - 2026-06-04

### Added

- **ESLint** — Next.js 16 flat config (`eslint.config.mjs`, `eslint` + `eslint-config-next`); `npm run lint` / `lint:fix`; CI runs lint before tests

### Fixed

- **In-app update** — `docker-compose.update.yml` sets `FINANCER_HOST_APP_DIR=/deploy` in the app container; host path in `.env` is only used for the volume mount (fixes “Update-Skript fehlt” when `.env` had `/opt/financer`)
- **React / ESLint** — Dialogs and forms reset state via remount or derived state instead of `setState` in `useEffect` (dividends, Haushaltskasse, simulations, personal income, dashboard widget layout, release-notes popup, locale picker, TR import, security search debounce)

### Changed

- **Deploy** — `scripts/update.sh` includes GHCR + update Compose overlays automatically; `plan/deploy.md` documents short pull workflow and clarifies `FINANCER_HOST_APP_DIR` (host volume vs `/deploy` in container)

## [0.1.2] - 2026-06-04

### Added

- **In-app update** — Compare installed version with latest GitHub release (and git behind `origin/main`); show “no update available” and disable redundant updates

### Fixed

- **In-app update** — Use `/bin/bash` and container `PATH` so update no longer fails with `spawn bash ENOENT`
- **In-app update** — Rate limit applies only after a successful update, not after failed attempts

## [0.1.1] - 2026-06-04

### Added

- **In-app update (F-46)** — Settings card for OWNER/ADMIN: version via `GET /api/version`, update stream via `POST /api/admin/update` (NDJSON logs from `scripts/update.sh`); opt-in `docker-compose.update.yml` with Docker socket + host repo mount; 10s restart countdown and health poll

### Changed

- **i18n** — API/Zod errors map to `errors.*` / `validation.*` message keys; `translateApiError` unwraps nested flatten payloads; personal-income validation is locale-aware
- **CI** — Doc-only pushes/PRs (`**.md`, `plan/**`, `release-notes.ts`, `LICENSE`) skip workflow; `v*` tag pushes always run

### Fixed

- **Personal income** — Zod 4–compatible validation messages for locale-aware forms

## [0.1.0] - 2026-06-04

### Added

- **Personal income tab (F-45)** — Private salary tracking at `/einkommen` (sidebar “Income” / “Einkommen”): gross and net salary per month, optional monthly bonus, separate extra payments (e.g. holiday bonus), year totals, and multi-year comparison matrix
- **Personal income year chart** — Grouped bar chart on `/einkommen` comparing gross, net, and bonuses by year (below the year overview table)
- **Personal income past years** — Add calendar years before the current year for capture and comparison (`PersonalIncomeTrackedYear`); persisted per user, included in backup
- **Household sync** — Apply net salary to your own `MonthlyIncome` in Haushaltskasse with one click (fix-cost snapshot rules unchanged; partner data untouched)
- **Privacy** — APIs and UI only expose data for the logged-in user; not visible to household partner or admins
- **Backup** — Export/import includes only your personal income rows
- **Daily habit (F-40–F-44)** — `/heute` briefing, notification bell with inbox, daily portfolio snapshots (“since yesterday”), household month routine checklist with partner status, depot-filtered calendar widget
- **One-click Docker install (F-31)** — `install.sh` bootstrap for fresh servers/LXC (`curl | bash`: optional Docker on Debian, clone to `/opt/financer`, `.env`/secrets, `NEXTAUTH_URL` prompt, compose + health wait); `install.ps1` for Windows/Docker Desktop
- **TR import (Ä-12/Ä-13)** — Separate dividend preview table (gross/tax/net, position); date-range filter with in-range default selection and “show outside range” toggle

### Changed

- **Personal income year comparison** — Matrix and chart use only explicit years from the available-years list (no gap-filling); past-year tracking validated in Zod; bonus year lookup optimized; max 30-year span on years API
- **Security** — JWT `householdId` only after DB membership check on `session.update`; backup restore without admin fallback for unknown usernames (10 MB limit); optional `ALLOW_REGISTRATION`; security headers in `next.config.ts`; securities symbol/query validation; TR preview rate limit
- **Docs** — Deployment docs anonymized (generic paths); README in English for public repo
- **Tests** — 235 unit tests total

## [0.0.10] - 2026-06-01

### Changed

- **i18n** — Locale-aware Zod schemas on API routes (`sessionLocale`); simulation, dividend, and depot validation use message keys in de/en
- **i18n** — Extended `API_ERROR_MAP` for English users (FX, TR import, interest asset, etc.)
- **i18n** — Root layout sets `html lang` from session; accessible close label on dialogs/sheets

### Added

- **Tests** — i18n key parity between `de.ts` and `en.ts`; 200 unit tests total

## [0.0.9] - 2026-06-01

### Added

- **Investments — Merge positions (F-39)** — Wizard to combine duplicate assets (same security, different ticker/ISIN gap); NDJSON scan for suggestions; hide zero-quantity positions by default
- **TR import — Clear depot** — Delete all positions for an account (including entries and dividends) before re-import; optional checkbox in wizard
- **TR import — Selection step** — Checkbox per row, quick filters (all/none/new/matched/with amount), sort by amount
- **Admin — Delete provisioned tenant users** — `DELETE /api/admin/users/[userId]`; household admins can manage tenants created by the owner

### Changed

- **Deploy** — Documented `FINANCER_DEPLOY_MODE` (`build` vs `ghcr`), `./scripts/update.sh`, and [plan/deploy.md](plan/deploy.md)

## [0.0.8] - 2026-05-31

### Added

- **Investments — Trade Republic CSV import (F-38)** — Official transaction export via 7-step wizard (preview, conflict resolution, ticker mapping, apply in one transaction)
- **Ticker reconciliation** — Portfolio ISIN match preferred over Yahoo; manual SecuritySearch assignment when unresolved; conflict hint when tickers differ
- **`importRef`** on `AssetEntry` and `DividendPayment` for idempotent re-import

## [0.0.7] - 2026-05-31

### Changed

- **Update dialog** — Release notes per version are collapsible; only the latest version is expanded by default

## [0.0.6] - 2026-05-31

### Changed

- **Docker** — Slim runtime image: Prisma CLI + dotenv only (no full builder `node_modules`); `docker-entrypoint.sh` for `db push` + `node server.js`
- **Docker build** — BuildKit cache mounts for `npm ci` and `.next/cache`; `.dockerignore`; selective builder `COPY` (plan/tests no longer invalidate the build)
- **Next.js** — `outputFileTracingIncludes` for generated Prisma client in standalone output

## [0.0.5] - 2026-05-31

### Added

- **Sidebar — Release notes (Ä-11)** — “Release notes” button above Sign out in the desktop sidebar and mobile menu; opens the existing update dialog with curated release notes (de/en) and link to all GitHub releases

## [0.0.4] - 2026-05-31

### Added

- **Dividends — Interest position (F-35)** — Record bank interest on cash balances via reserved position `Interest` in the manual dividend flow; auto-provisioned per user, excluded from portfolio, price refresh, and market calendar

## [0.0.3] - 2026-05-31

### Removed

- **Auto-Deploy** — Self-hosted GitHub Actions runner and CI `deploy` job removed

### Changed

- **CI** — GitHub Actions runs test + build only on `ubuntu-latest` (no deploy step)
- **Deploy** — Production updates are manual: `git pull && docker compose up -d --build`, `.\push -Deploy`, or `scripts/deploy.sh` on your server
- **Docs** — Runner setup removed from `plan/setup.md`; manual deploy paths documented

## [0.0.2] - 2026-05-31

### Added

- **Update-Dialog** — After deploy, one-time “What's New” dialog with curated release notes (de/en); manual view in Settings
- **README preview** — Dashboard screenshots (Light/Dark) in `docs/screenshots/`

## [0.0.1] - 2026-05-31

First public release — self-hosted finance dashboard for small households.

### Added

- **Investments** — Portfolio tracking (stocks, ETFs, crypto), Yahoo Finance prices, VWAP, 4 chart types, historical price curves, EUR conversion via Yahoo Forex
- **Haushaltskasse** — Fixed costs, monthly income/payouts, quarterly bonus logic, simulation tab with persistent scenarios
- **Dashboard** — Configurable widget grid (drag & drop, resize), 10 widget types, per-user layout stored in DB
- **Dividends** — Manual dividend booking (`/dividenden`)
- **Multi-user** — Households, roles (Owner/Admin/Member), invites, household switcher, admin user management
- **Security** — Username + password auth, optional 2FA (TOTP), JSON backup/restore
- **i18n** — German and English (per-user locale)
- **Mobile** — Responsive layout, hamburger navigation, mobile-optimized forms
- **Login snapshot** — Post-login popup with combined unrealized P/L for own positions
- **CI** — GitHub Actions (lint, test, build)
- **Deploy** — Docker Compose production setup, deployment guide in README, `push.example.ps1`

### Tech stack

Next.js 16 · React 19 · TypeScript · PostgreSQL 16 · Prisma 7 · NextAuth v5 · shadcn/ui · Tailwind CSS v4 · Recharts · Vitest (104 unit tests)

[0.1.4]: https://github.com/carkeyuser/financer/releases/tag/v0.1.4
[0.1.3]: https://github.com/carkeyuser/financer/releases/tag/v0.1.3
[0.1.2]: https://github.com/carkeyuser/financer/releases/tag/v0.1.2
[0.1.1]: https://github.com/carkeyuser/financer/releases/tag/v0.1.1
[0.1.0]: https://github.com/carkeyuser/financer/releases/tag/v0.1.0
[0.0.10]: https://github.com/carkeyuser/financer/releases/tag/v0.0.10
[0.0.9]: https://github.com/carkeyuser/financer/releases/tag/v0.0.9
[0.0.8]: https://github.com/carkeyuser/financer/releases/tag/v0.0.8
[0.0.7]: https://github.com/carkeyuser/financer/releases/tag/v0.0.7
[0.0.6]: https://github.com/carkeyuser/financer/releases/tag/v0.0.6
[0.0.5]: https://github.com/carkeyuser/financer/releases/tag/v0.0.5
[0.0.4]: https://github.com/carkeyuser/financer/releases/tag/v0.0.4
[0.0.3]: https://github.com/carkeyuser/financer/releases/tag/v0.0.3
[0.0.2]: https://github.com/carkeyuser/financer/releases/tag/v0.0.2
[0.0.1]: https://github.com/carkeyuser/financer/releases/tag/v0.0.1
