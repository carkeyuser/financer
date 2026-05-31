# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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

[0.0.1]: https://github.com/carkeyuser/financer/releases/tag/v0.0.1
