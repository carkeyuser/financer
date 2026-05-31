# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
- **Deploy** — Production updates are manual: `git pull && docker compose up -d --build`, `.\push -Deploy`, or `scripts/deploy.sh` on the LXC
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

[0.0.6]: https://github.com/carkeyuser/financer/releases/tag/v0.0.6
[0.0.5]: https://github.com/carkeyuser/financer/releases/tag/v0.0.5
[0.0.4]: https://github.com/carkeyuser/financer/releases/tag/v0.0.4
[0.0.3]: https://github.com/carkeyuser/financer/releases/tag/v0.0.3
[0.0.2]: https://github.com/carkeyuser/financer/releases/tag/v0.0.2
[0.0.1]: https://github.com/carkeyuser/financer/releases/tag/v0.0.1
