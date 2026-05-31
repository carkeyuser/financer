# Changelog

Änderungslog des Projekts. Architektur, Projektstand und Querverweise starten in [`README.md`](README.md).

| Datum | Änderung |
|---|---|
| 2026-05-31 | **CI:** Docker-Job nur bei Tags `v*` (~4 min Release-CI); `main`/PR nur build/test (~1 min); Concurrency pro Commit; GHA-Cache für Docker-Build |
| 2026-05-31 | **Release v0.0.8** — Trade-Republic-CSV-Import (F-38), Ticker-Abgleich, 126 Tests |
| 2026-05-31 | **F-38 Ticker-Abgleich:** Import-Wizard zeigt alle ISINs; Portfolio-Ticker vor Yahoo; manuelle Zuweisung bei unbekannten ISINs; Konflikt-Hinweis bei abweichenden Tickern |
| 2026-05-31 | **F-38 Trade-Republic-Import:** 7-Schritte-Wizard, CSV-Parser, Hard/Soft-Dedup (`importRef`), Preview/Apply-API, ISIN→Ticker, Konflikt-Aktionen; Migration; Backup; 5 Tests; i18n de/en |
| 2026-05-31 | **F-36 Erweiterung:** `User.provisionedByUserId` — Owner sieht angelegte Tenant-User unter „Angelegte Benutzer (eigene Haushalte)"; Bearbeiten/2FA über provisioned-Check |
| 2026-05-31 | **F-36 Tenant-Provisioning (Hybrid):** `POST /api/admin/users` mit `tenancy: household|tenant`; neuer Haushalt + OWNER + Fixkosten; UI auf `/household`; `default-fixed-costs.ts`; 4 Schema-Tests |
| 2026-05-31 | **README:** An Stand v0.0.7 angepasst — Dividenden, Simulationen, 11 Widgets, 114 Tests, Backup-Inhalt, Marktkalender/`MARKET_CALENDAR_EXTERNAL`, offenes Backlog |
| 2026-05-31 | **Deploy:** `docker-compose.prod.yml` + CI GHCR-Push; `scripts/deploy.sh` nutzt Pull statt Build; Dockerfile ohne `next-env.d.ts` (gitignored) |
| 2026-05-31 | **CI:** GitHub Actions Job `docker` — baut und pusht `ghcr.io/carkeyuser/financer` (`latest`, Package-Version, Git-Tag, SHA) nach grünem Build auf `main`/Tags; `docker-compose.prod.yml` für Pull-Deploy |
| 2026-05-31 | **Release v0.0.7** — Release-Notes im Update-Dialog ein-/ausklappbar (nur neueste Version offen) |
| 2026-05-31 | **Update-Dialog:** Release-Notes pro Version ein-/ausklappbar; nur neueste Version standardmäßig offen |
| 2026-05-31 | **Release v0.0.6** — Schnellere Docker-Builds (schlankes Runtime-Image, BuildKit-Cache, Entrypoint) |
| 2026-05-31 | **Docker Build:** Schlankes Runtime-Image (nur Prisma-CLI statt vollem `node_modules`), BuildKit-Cache, `.dockerignore`, selektiver Builder-COPY, `outputFileTracingIncludes` für Generated Client |
| 2026-05-31 | **Release v0.0.5** — Release-Notes-Button in Sidebar und Mobile-Menü (Ä-11) |
| 2026-05-31 | **Ä-11 Changelog-Button:** Release-Notes-Button über Abmelden in Sidebar und Mobile-Menü; wiederverwendet `UpdateNotesDialog` + `release-notes.ts` |
| 2026-05-31 | **Release v0.0.4** — Bankzinsen als Dividenden-Position `Interest` (F-35) |
| 2026-05-31 | **F-35:** Bankzinsen als Dividenden-Position `Interest` — auto-provisioniert pro User, nur in Dividenden sichtbar, nicht im Portfolio |
| 2026-05-31 | **F-36** (Backlog): Mandantenfähige User-Verwaltung — User in eigenem Haushalt, Investments nur eigene Positionen pro Tenant |
| 2026-05-31 | **Release v0.0.3** — GitHub Release mit Changelog; In-App-Release-Notes erweitert |
| 2026-05-31 | **Release v0.0.3** — Auto-Deploy entfernt, manuelles Deploy |
| 2026-05-31 | **Deploy:** Auto-Deploy entfernt — CI nur noch lint/test/build; Deploy manuell (`git pull`, `.\push -Deploy`, `scripts/deploy.sh`) |
| 2026-05-31 | **Release v0.0.2** — Update-Dialog, README-Vorschau |
| 2026-05-31 | **Docs:** README-Vorschau — Dashboard-Screenshots (Light/Dark) unter `docs/screenshots/` |
| 2026-05-31 | **F-37 Update-Dialog:** Nach App-Update einmalig Dialog mit kuratierten Release-Notes (de/en); Version aus `package.json` via `next.config.ts`; `localStorage` für gesehene Version; Erstbesuch stumm; Login-Snapshot wartet auf Schließen; manuelles Öffnen in Settings |
| 2026-05-31 | **Deploy:** Auto-Deploy via Self-hosted GitHub Actions Runner + `scripts/deploy.sh` (nach grünem CI auf `main`) |
| 2026-05-31 | **Deploy:** `docker-compose.yml` — `pull_policy: build` für `app`, damit Compose `finance-app:latest` nicht von Docker Hub pullt |
| 2026-05-31 | **Docs:** Windows-Pfad `c:\dev\financer` in README/plan durch neutrales `financer/` ersetzt |
| 2026-05-31 | **F-30 GitHub-ready:** `.gitignore` erweitert (`.env*` + `!.env.example`, `push.ps1`/`pack.ps1`, `.claude/`, `.cursor/`, `*.tar.gz`); IPs und persönliche Daten anonymisiert; `push.example.ps1`/`pack.example.ps1`; MIT LICENSE; GitHub Actions CI (lint, test, build); Initial Commit |
| 2026-05-31 | **Deploy:** `push.ps1` — Parameter `-Deploy` kopiert und startet `docker compose up -d --build` per SSH (`.\push -Deploy`) |
| 2026-05-31 | **Fix:** `LoginSnapshotDialog` — Link als Outline-Button via `buttonVariants` (Base UI Button hat kein `asChild`; Docker-Build TypeScript-Fehler) |
| 2026-05-31 | **F-36 Login Portfolio-Snapshot:** Nach Login Popup mit kombiniertem unrealisiertem G/V der eigenen Positionen; `?scope=mine` auf `/api/dashboard/summary`; `LoginSnapshotDialog` in AuthGuard; sessionStorage-Flag in LoginForm |
| 2026-05-31 | **Plan:** F-36 Login Portfolio-Snapshot — nach jedem Login Popup mit kombiniertem unrealisiertem G/V der eigenen Positionen (`plan/features.md`) |
| 2026-05-29 | **Investments Zeitraum-Charts:** Presets 1W–Gesamt für Wert- und G/V-Verlauf (Investments + Dashboard-Widget); Yahoo-Historie mit `1d`/`1wk`/`1mo`; tägliche Füllung bei kurzen Ranges |
| 2026-05-29 | **Haushaltskasse Überweisung:** Monats- und Simulations-Dialog zeigen live die Überweisung ans Gemeinschaftskonto (Einkommen − tatsächliche Auszahlung) inkl. Summe, Fixkosten-Hinweis und Warnung bei Unterdeckung |
| 2026-05-27 | **Plan-Doku:** `plan/` vollständig aktualisiert (97 Tests, 11 Dashboard-Widgets, Nasdaq-Marktkalender, Self-hosted-Troubleshooting, Next.js 16, `prisma db push` auf Server) |
| 2026-05-27 | **Marktkalender self-hosted:** Nasdaq-Abruf auf 14 Werktage / 2 parallel / 8s Deadline begrenzt; Fail-fast-Probe + `MARKET_CALENDAR_EXTERNAL=false`; Route liefert bei Fehler `[]` statt „failed to pipe response“ |
| 2026-05-20 | Initiale Planung: Next.js + TypeScript, PostgreSQL + Prisma, shadcn/ui, Recharts, TanStack Query, NextAuth v5, Docker |
| 2026-05-20 | **Phase 1:** Projekt-Setup, Prisma 7 + `@prisma/adapter-pg`, NextAuth v5, Login/Register, Sidebar, ThemeToggle, AuthGuard |
| 2026-05-20 | **Phase 2:** Vollständiges Expenses-Modul (Categories, Transactions, Budgets, Charts) |
| 2026-05-20 | **Phase 3:** Investments — Yahoo Finance Proxy, Asset+Entry CRUD, VWAP, SecuritySearch, 4 Charts via PortfolioChartPanel |
| 2026-05-20 | **Prisma 7:** Kein `url` im Schema; Driver Adapter; Generated Client in `src/generated/prisma` |
| 2026-05-20 | **Yahoo Finance Fixes:** Search-Pfad korrigiert; Price-API auf v8/chart-Endpoint |
| 2026-05-20 | **Phase 4 (initial):** Investment-Dashboard — KPIs, Wert-Verlauf, Allokation, Positionen |
| 2026-05-20 | **Deployment:** LXC auf Proxmox, `push.ps1`, `docker compose up --build` auf Server |
| 2026-05-22 | **Phase 5:** Household-Management — Invites, accept-invite, Switcher, Rollen-APIs, `/settings` |
| 2026-05-22 | **Dev-Setup-Fixes:** `AUTH_TRUST_HOST=true` + `trustHost: true`; `allowedDevOrigins` für HMR |
| 2026-05-22 | **Bug: Doppelte Sidebar** — `AuthGuard` aus Page-Komponenten entfernt; Regel dokumentiert |
| 2026-05-22 | **Phase 6:** Ausgaben-Modul entfernt; Haushaltskasse implementiert (FixedCost, MonthlyIncome, MonthlyPayout, HouseholdFinanceTable, MonthlyEntryDialog) |
| 2026-05-23 | **Haushaltskasse als eigener Tab:** `/haushaltskasse`-Route, Sidebar-Eintrag PiggyBank |
| 2026-05-23 | **Wertpapiersuche verbessert:** `enableFuzzyQuery=true`, `quotesCount=10`; Placeholder mit Beispielen |
| 2026-05-23 | **B-01 behoben:** `PortfolioAllocationChart` — Custom-Label für kleine Segmente |
| 2026-05-23 | **Phase 7:** `getEurRate()` (60s Cache); `eurRate` in allen Assets-APIs; alle Werte in EUR |
| 2026-05-23 | **Phase 5 Restpunkte:** Rollen-Select in `HouseholdContent`; Invite-Widerruf |
| 2026-05-23 | **F-01:** `AssetEditDialog` + `PUT /api/assets/[id]` + `useUpdateAsset` |
| 2026-05-23 | **F-03:** `getPortfolioValueHistory` fügt immer `today` ein |
| 2026-05-23 | **F-04:** Drag & Drop (`@dnd-kit`) + Card/List-Toggle; `Asset.order`; `POST /api/assets/reorder` |
| 2026-05-23 | **F-05:** `FixedCostsSettings` als Collapsible in `HouseholdFinanceTable` |
| 2026-05-23 | **F-06:** Username-only Auth; `User.username` unique, `email` optional, `twoFactorSecret` |
| 2026-05-23 | **Tests:** Vitest eingerichtet; 46 Unit-Tests grün |
| 2026-05-23 | **Bugfix: doppeltes `"use client"`** in `AssetDetailContent.tsx` entfernt |
| 2026-05-23 | **Bugfix: nested `<button>`** in `HouseholdFinanceTable` — `CollapsibleTrigger` ohne `asChild` |
| 2026-05-23 | **F-07:** Sidebar → „Benutzer"; E-Mail-Feld entfernt; `POST /api/admin/users` (OWNER-only) |
| 2026-05-23 | **F-09:** CoinGecko-Fallback in `/api/securities/search` parallel zu Yahoo |
| 2026-05-23 | **Bugfix: Prisma-Client veraltet** — `prisma migrate deploy` + `prisma generate` nach F-04/F-06 vergessen → 500-Fehler in `/api/assets` + `/api/household` |
| 2026-05-23 | **B-02:** `MonthlyFixedCostSnapshot`; income-Route friert Fixkosten ein; summary-Route nutzt Snapshot |
| 2026-05-23 | **F-10:** `account`-Feld (Pflicht); `@@unique([householdId, userId, ticker])`; `ownerName` in API; AssetCard + AssetForm + AssetEditDialog aktualisiert |
| 2026-05-23 | **F-11:** `react-grid-layout`; `DashboardWidget`-Tabelle; 6 Widgets; WidgetManager-Modal; Marktkalender via Yahoo Finance calendarEvents |
| 2026-05-23 | **Tests:** 47 Unit-Tests grün (1 neuer Test für `account`-Validation) |
| 2026-05-23 | **B-03:** `useSaveWidgets` — `onSuccess: invalidateQueries` entfernt; `DashboardContent` — `useEffect` mit `initializedFromDb`-Ref, lädt DB-Layout nur einmal |
| 2026-05-23 | **B-05:** `DELETE /api/assets/[id]` — `requireHouseholdAdmin` → `requireSession`; alle Haushaltsmitglieder können Positionen löschen |
| 2026-05-23 | **F-12:** `autoSortLayout()`-Funktion + „Sortieren"-Button in `DashboardContent.tsx` |
| 2026-05-23 | **F-13:** `.react-resizable-handle-se` Grip-Dot-Styling in `globals.css` |
| 2026-05-23 | **Ä-01:** `PortfolioAllocationChart` — Default-Ansicht auf „Nach Position" geändert |
| 2026-05-23 | **Ä-02:** `HouseholdFinanceTable` — Quartals-Überschusszeilen entfernt; Jahresüberschuss in `tfoot` |
| 2026-05-23 | **B-04:** `market-calendar/route.ts` — v10/query1 → v11/query2, realistischer User-Agent, `cache: 'no-store'` |
| 2026-05-23 | **B-06:** `DashboardContent` — `onLayoutChange` speichert sofort; `ignoreLayoutChange`-Ref überspringt initialen DB-Load; `CardHeader` → plain `<div>` in `WidgetShell` (X-Button oben rechts) |
| 2026-05-23 | **B-07:** `Sidebar.tsx` — `signOut({ callbackUrl: "/auth/login" })` war bereits korrekt |
| 2026-05-23 | **B-08:** `src/app/login/page.tsx` — Redirect von `/login` → `/auth/login` |
| 2026-05-23 | **Ä-03:** `WidgetShell` — `onRemove`-Prop + `×`-Button; `handleToggleWidget` ruft `autoSortLayout` nach Entfernen auf |
| 2026-05-23 | **Ä-04:** `InvestmentsContent` — Listenansicht zeigt Konto (Landmark-Icon) + Besitzer (User-Icon) |
| 2026-05-23 | **B-09:** `DashboardContent` — `ignoreLayoutChange = useRef(true)` — verhindert, dass `react-grid-layout` beim ersten Mount `DEFAULT_LAYOUT` in die DB schreibt und damit die gespeicherten Positionen überschreibt |
| 2026-05-23 | **B-10:** `DashboardContent` + `useWidgets` — `onDragStop`/`onResizeStop` für Saves; `staleTime: Infinity` + `setQueryData`; `useState(() => savedLayout ?? DEFAULT_LAYOUT)`; `layoutReady`-State im selben Batch mit `setLayout` verhindert DEFAULT_LAYOUT-Flash nach F5 |
| 2026-05-23 | **F-16:** 2FA-Deaktivierung erfordert TOTP-Code — `DELETE /api/user/2fa` prüft jetzt Token; `SettingsContent` zeigt Step `disable-confirm` mit eigenem Formular statt `confirm()`-Dialog |
| 2026-05-23 | **B-11:** Settings — `username` in JWT/Session ergänzt; `useEffect`-Race-Fix für Profil-Form; "Benutzername"-Feld editierbar mit Regex-Validierung + Uniqueness-Check in API; Fehleranzeige unter Passwort-Feldern |
| 2026-05-23 | **B-12:** `AssetGainLossBarChart` — `.filter((d) => d.gainLoss !== 0)` entfernt; alle Positionen (inkl. G/V = 0) werden jetzt im Balkendiagramm angezeigt |
| 2026-05-23 | **B-13:** `SettingsContent` — Passwort-Fehler via `passwordForm.setError` direkt unter dem Feld statt nur als Toast; API-String-Fehler ("Kein Passwort gesetzt") ebenfalls als Toast gefangen |
| 2026-05-23 | **F-17:** `PATCH /api/admin/users/[userId]` — OWNER/ADMIN kann Anzeigename, Loginname und Passwort anderer User ändern; `editUserSchema`; `useAdminEditUser`-Hook; Bearbeitungs-Dialog (Pencil-Button) in `HouseholdContent.tsx` |
| 2026-05-23 | **F-18:** `calculations.ts` — `getPortfolioValueHistory` füllt monatliche Zwischenpunkte zwischen frühestein Entry und heute; `getGainLossHistory` refaktoriert auf direkte Nutzung der `getPortfolioValueHistory`-Datenpunkte |
| 2026-05-23 | **F-19:** `InvestmentsContent.tsx` — Sortier-Buttons (Depot/Besitzer/Wert), Standard-Ansicht „Liste"; aktiver Sort wird durch DnD-Drag deaktiviert |
| 2026-05-23 | **F-20:** 4 neue Dashboard-Widgets: `TopFlopWidget`, `HouseholdSummaryWidget`, `CurrencyExposureWidget`, `NetWorthWidget`; `WIDGET_REGISTRY` in `useWidgets.ts` erweitert; `DashboardContent.tsx` rendert alle 4 neuen IDs |
| 2026-05-23 | **D-01:** `docker-compose.yml` — `prisma db push` → `prisma migrate deploy`; Postgres-Port nicht mehr nach außen exposed; dediziertes `finance_net` Bridge-Netzwerk; `README.md` komplett neu als Proxmox/LXC-Deploy-Guide |
| 2026-05-24 | **Phase 9 — Datensicherung:** `GET /api/backup` exportiert alle Haushaltsdaten (Fixkosten, Einkommen, Auszahlungen, Snapshots, Assets + Einträge) als JSON-Datei; `POST /api/backup` stellt das Backup wieder her (löscht vorhandene Daten + reimportiert, Usernames werden auf aktuelle User-IDs gemappt, Fallback auf importierenden User). Nur OWNER/ADMIN darf einspielen. `BackupCard.tsx` in `/settings` mit Export-Button + Datei-Upload + AlertDialog-Bestätigung. shadcn `alert-dialog` installiert. |
| 2026-05-24 | **F-21 — Historische Yahoo-Finance-Kurse:** `GET /api/securities/history` (neu); `usePortfolioHistory`-Hook in `useAssets.ts`; `mergeHistoricalPrices()` in `calculations.ts`; `PortfolioValueChart` + `PortfolioGainLossChart` laden echte Kurshistorie von Yahoo Finance und zeigen damit den korrekten Wert-/G/V-Verlauf ab dem Kaufdatum. |
| 2026-05-24 | **Krypto-Suche: Popular-Crypto-Liste:** `POPULAR_CRYPTOS`-Liste in `/api/securities/search/route.ts` mit 19 bekannten Tokens (BTC, ETH, XRP/Ripple, SOL, BNB, ADA, DOGE, AVAX, DOT, LINK, LTC, MATIC, XLM, TRX, TON, SHIB, SUI, PEPE) inkl. Aliases. Suchanfragen wie "ripple" oder "bitcoin" matchen jetzt zuverlässig lokal — ohne Abhängigkeit von CoinGecko-Ratelimits. Popular-Ergebnisse erscheinen zuerst, Yahoo und CoinGecko ergänzen dahinter (Dedup per Symbol). |
| 2026-05-24 | **Investment-Anlegen: Datum optional + Kurs-Auto-Fill:** `purchaseDate` in `assetSchema` und `date` in `assetEntrySchema`/`assetEntryUpdateSchema` sind jetzt optional. Backend-Fallback: fehlendes Datum → `new Date()` (heute). `AssetEntryForm` erhält neues `ticker`-Prop; ein `useEffect` ruft beim Laden (und bei leerem Datumsfeld) automatisch `/api/securities/price?symbol=<ticker>` ab und befüllt das Preis/Einheit-Feld mit dem aktuellen EUR-Kurs. Während des Ladens ist das Preisfeld deaktiviert (`Lädt…`). `AssetForm` zeigt `purchaseDate`-Label als optional. Geänderte Dateien: `src/lib/validations/asset.ts`, `src/app/api/assets/route.ts`, `src/app/api/asset-entries/route.ts`, `src/app/api/asset-entries/[id]/route.ts`, `src/components/investments/AssetEntryForm.tsx`, `src/components/investments/AssetForm.tsx`, `src/app/investments/[id]/entry/page.tsx`. |
| 2026-05-24 | **Investment-Anlegen: Währungs-Dropdown (€ / $):** Währungsfeld in `AssetForm.tsx` von Textfeld auf shadcn `Select` (EUR / USD) umgestellt. Beim Wechsel der Währung wird `purchasePrice` automatisch auf den passenden Kurs umgestellt: EUR → `currentPriceEur`, USD → nativer Kurs (`currentPrice`). Preis/Einheit-Label zeigt das aktive Symbol (€ oder $). |
| 2026-05-24 | **Haushaltsname ändern:** `PATCH /api/household` (OWNER/ADMIN) aktualisiert den Haushaltsnamen. `updateHouseholdNameSchema` in `validations/household.ts`. `useUpdateHouseholdName`-Hook in `useHousehold.ts`. Neue „Haushaltsname"-Karte in `HouseholdContent.tsx` mit Inline-Bearbeitungsformular (Pencil-Button). |
| 2026-05-24 | **Investment-Kurs überschreiben:** Entry-Typ `PRICE_UPDATE` heißt in der UI nun „Manuelle Anpassung" (war „Preis-Snapshot"). `POST /api/asset-entries` macht für PRICE_UPDATE jetzt einen Tag-genauen Upsert: existiert für denselben Tag bereits ein PRICE_UPDATE-Eintrag, wird dessen Preis überschrieben statt ein neuer Eintrag angelegt. Geänderte Dateien: `AssetDetailContent.tsx`, `AssetEntryForm.tsx`, `AssetEntryEditDialog.tsx`, `api/asset-entries/route.ts`. |
| 2026-05-24 | **B-14 — Aktueller Wert: EUR-Kurs statt USD-Kurs:** `handleRefreshPrice` in `AssetDetailContent.tsx` speichert jetzt `priceEur` für EUR-Assets (statt immer den Nativpreis). `AssetEntryForm` erhält `assetCurrency`-Prop und wählt den passenden Auto-Fill-Preis. `entry/page.tsx` übergibt `asset.currency`. |
| 2026-05-25 | **B-16/B-17** im Bug-Backlog: Docker-Build TS-Fehler (`TooltipContentProps` in `PortfolioAllocationChart`); `push.ps1` schließt `.codegraph`/`tsbuildinfo` noch nicht aus. |
| 2026-05-25 | **B-15 — Allokations-Chart Label-Overflow:** `PortfolioAllocationChart.tsx` — dreistufige Label-Logik (&lt;10 % kein Label, 10–25 % innen, ≥25 % außen), Tooltip mit Prozent, kleinerer Radius + Chart-Margin. |
| 2026-05-25 | **Allokations-Chart Interaktion:** Custom-Tooltip (Wert, G/V, Depot, Besitzer, Typ); Klick auf Segment in „Nach Position“ → `/investments/[id]`. |
| 2026-05-25 | **Ä-05 — Fixkosten prominent:** `HouseholdFinanceTable` — `FixedCostsSettings` dauerhaft oberhalb der Monatstabelle sichtbar; Akkordeon entfernt. |
| 2026-05-25 | **Ä-06 — Vermögen-Widget:** `NetWorthWidget` zeigt nur noch Portfoliowert; Jahresüberschuss entfernt; Titel „Vermögen" in Widget-Registry und Dashboard. |
| 2026-05-25 | **F-22 — Englischer Sprachmodus:** `User.locale` (DB + JWT + Session); `I18nProvider` in `AppProviders`; de/en-Messages unter `src/i18n/messages/`; Sprach-Select in Settings (`LanguageCard`); locale-aware Zod-Schemas (`createXSchema(locale)`); `formatMoney`/`formatDate`/`compareLocale`; `mapApiError`/`translateApiError` für API-Fehler; Sidebar, Auth, Settings, Backup, Dashboard, Investments, Haushaltskasse, Haushalt angebunden. Unit-Tests für Format + API-Errors. |
| 2026-05-25 | **F-22 — Dashboard i18n:** `DashboardContent` + 6 Widget-Komponenten (`NetWorthWidget`, `CurrencyExposureWidget`, `HouseholdSummaryWidget`, `MarketCalendarWidget`, `TopFlopWidget`, `ClockWidget`) — `useI18n()`, Widget-Titel via `WIDGET_REGISTRY.titleKey`, `formatMoney`/`formatNumber`, `assetTypeLabel`, locale-aware Datumsformatierung. |
| 2026-05-25 | **F-22 — letzte i18n-Lücken:** `investments/new` und `investments/[id]/entry` (Client-Header mit `useI18n()`), `ThemeToggle` aria-label (`common.themeToggle`); Message-Keys in de/en. |
| 2026-05-25 | **B-16:** `PortfolioAllocationChart` — `AllocationTooltip` nutzt `TooltipContentProps`; Tooltip-`content` als Render-Funktion mit Spread. **B-17:** `push.ps1` schließt `.codegraph` und `*.tsbuildinfo` aus; `.codegraph/` in `.gitignore`. |
| 2026-05-25 | **README.md** vollständig überarbeitet: Feature-Übersicht, alle 10 Widgets, i18n/2FA, Haushaltskasse, Tests (59), LAN-Dev, Prisma-7-Hinweise, Troubleshooting, Cronjob-Backup, Projektstruktur; `db push` vs. `migrate deploy` konsistent dokumentiert. |
| 2026-05-25 | **F-29 — Automatischer Kurs-Refresh (2h):** `src/lib/services/security-price.ts` (Yahoo-Fetch, `resolveStoredPrice`, `upsertTodayPriceUpdate`); `POST /api/assets/refresh-prices`; `usePortfolioPriceRefresh` + `PortfolioPriceRefresh` in `AuthGuard`; `usePortfolioHistory` mit 2h-Intervall; Unit-Tests `security-price.test.ts`. |
| 2026-05-25 | **F-26/F-27 — Positions-UI:** `AssetLogo.tsx` (FMP-Logo, Typ-Badge mit Icon bei Fehler); `position-display.ts` (Logo-URL, `hasMarketPrice`, Glow-Klassen); `AssetCard` + Listenzeilen in `InvestmentsContent` mit Logo links und dezenter G/V-Färbung (grün/rot/neutral ohne `PRICE_UPDATE`). |
| 2026-05-25 | **Tests:** E2E (Playwright) und API-Integration-Tests aus Plan entfernt — Scope bleibt bei Vitest Unit-Tests; `README.md` angepasst. |
| 2026-05-25 | **F-30:** Feature „GitHub-ready für Push“ im Feature-Backlog ergänzt. |
| 2026-05-25 | **F-31:** Feature „One-Click-Installation unter Docker“ im Feature-Backlog ergänzt. |
| 2026-05-25 | **F-32:** Feature „Dividenden-Integration + Rechner (eigener Tab)“ im Feature-Backlog ergänzt. |
| 2026-05-25 | **B-18:** Bug „Marktkalender-Widget neu überdenken“ im Bug-Backlog (offen); Bezug zu F-32. |
| 2026-05-25 | **F-33:** Feature „Haushaltskasse-Simulation ab Startmonat“ im Feature-Backlog ergänzt. |
| 2026-05-25 | **F-28 — Mobile Ansicht:** Bottom-Navigation + mobile Topbar, statische Dashboard-Widgetliste auf Smartphone, mobile Karten für Haushaltskasse/Investment-Einträge/Mitglieder, responsive Formulare/Dialoge und größere Touch-Ziele umgesetzt. Tests: `npm run test` (63 grün), `npm run build` grün; `npm run lint` blockiert durch veraltetes `next lint`-Script unter Next 16. |
| 2026-05-25 | **F-28 — Mobile Widget-Reihenfolge:** Dashboard-Widgets können auf Smartphone per Hoch/Runter-Buttons verschoben werden; Reihenfolge wird über das bestehende Widget-Layout gespeichert. Tests: `npm run test` (63 grün), `npm run build` grün. |
| 2026-05-25 | **F-33 — Haushaltskassen-Simulation:** Persistente Simulationstabellen, API `/api/household-finance/simulations`, gemeinsame Berechnungs-Utility, responsive Simulations-UI mit frei wählbarem Zeitraum, Vormonat übernehmen und Folgemonats-Übernahme. Tests: `npm run test` (74 grün), `npm run build` grün. |
| 2026-05-25 | **F-33 Navigation:** Simulation aus der Haupt-Haushaltskasse-Seite auf `/haushaltskasse/simulation` verschoben und in der Desktop-Sidebar als Subtab unter „Haushaltskasse" angezeigt. Build grün. |
| 2026-05-25 | **F-32 — Dividenden-Feature:** Neuer Tab `/dividenden`, `DividendPayment`-Modell + Migration, Yahoo-Dividendenservice (`chart?events=div` + kommende Ex-Date), Summary-/Payment-APIs, Dividenden-Rechner, KPI/Chart/Positions-/Kalender-UI, Dashboard-Widget `dividend-summary`, Navigation + i18n. **B-18** erledigt: Marktkalender ist nicht mehr zentrale Dividenden-Quelle. Tests: `npm run test` (82 grün), `npm run build` grün. |
| 2026-05-25 | **F-32 UI-Fix:** Dividenden-Rechner und Buchungsdialog zeigen im Positions-Select jetzt Positionsname + Ticker statt interner Asset-ID. |
| 2026-05-25 | **F-32 Ex-Date-Fix:** Wenn Yahoo `calendarEvents` keine kommende Ex-Date liefert, wird die nächste Ex-Date aus dem historischen Ausschüttungsrhythmus geschätzt und als geschätztes Dividendenereignis angezeigt. Tests: `npm run test` (83 grün), `npm run build` grün. |
| 2026-05-25 | **F-32 Buchungsdialog:** Beim Wechsel der Position im Dividenden-Buchungsdialog wird die aktuelle Investment-Menge der gewählten Position automatisch ins Mengenfeld übernommen. |
| 2026-05-25 | **F-32 Geschätzte Dividende buchen:** Wird eine geschätzte Dividende gebucht, öffnet der Dialog als `Erhalten` mit heutigem Zahltag; Ex-Date, Zahltag, Menge, Dividende/Aktie, Steuer und Status bleiben editierbar für die tatsächliche Broker-Buchung. |
| 2026-05-25 | **Ä-07:** Änderungswunsch ergänzt: Haken rechts in der Haushaltskassen-Simulation sollen grün statt gelb dargestellt werden. |
| 2026-05-25 | **Ä-08:** Änderungswunsch ergänzt: Monatliche Fixkosten in der Haushaltskasse sollen ein- und ausklappbar sein; Mobile-Ansicht und Simulationsbedienung müssen weiterhin funktionieren. |
| 2026-05-25 | **F-25/Ä-07/Ä-08:** Investments-Übersicht um Depot-/Konto-Filter erweitert; Simulations-Haken grün gefärbt; monatliche Fixkosten in der Haushaltskasse als einklappbare Karte mit Summen-Header umgesetzt. |
| 2026-05-25 | **Mobile Hamburger Navigation:** Mobile Bottom-Navigation entfernt; `MobileTopBar` öffnet nun ein seitliches Hamburger-Menü mit allen `navItems` inklusive Haushaltskasse-Simulation. |
| 2026-05-26 | **Plan-Struktur:** `PLAN.md` verschlankt; Feature-, Änderungs-, Bug-Backlog und Änderungslog in eigene Dateien unter `plan/` ausgelagert; Agent-Hinweise auf die neue Struktur angepasst. |
| 2026-05-26 | **Plan vollständig ausgelagert:** Restliche Inhalte aus `PLAN.md` in `plan/README.md`, `plan/architecture.md`, `plan/phases.md` und `plan/setup.md` verschoben; Verweise auf `plan/README.md` umgestellt; `PLAN.md` entfernt. |
| 2026-05-26 | **Backlog ergänzt:** B-19 für Dashboard-Resize-Probleme und Ä-09 für einen komplett manuellen Dividenden-Umbau ergänzt. |
| 2026-05-26 | **B-19 — Dashboard-Resize:** `DashboardContent` nutzt `useContainerWidth()` aus `react-grid-layout` und die v2-Props `gridConfig`/`dragConfig`; Fenstergrößenänderungen aktualisieren die Widget-Breiten ohne Layout-Save. |
| 2026-05-26 | **Backlog-Status aktualisiert:** Feature-, Bug- und Änderungs-Backlog zeigen jetzt den aktuellen Offen-Status; B-19 ist geschlossen, offen bleiben F-30/F-31 und Ä-09. |
| 2026-05-26 | **Plan-Archiv:** `plan/archive.md` ergänzt; erledigte Änderungswünsche Ä-01 bis Ä-08 aus `aenderungen.md` ins Archiv verschoben. |
| 2026-05-26 | **Ä-09 geplant:** Dividendenbereich soll vollständig auf manuelle Buchungen reduziert werden; Pflichtfelder nur Position + Gesamtsumme, Yahoo-/Forecast-/Rechner-Logik wird entfernt. |
| 2026-05-26 | **Ä-09 umgesetzt:** `/dividenden` komplett auf manuelle EUR-Buchungen umgebaut; Pflichtfelder nur Position + Gesamtsumme, optionale Details; Yahoo-Dividendenservice, Forecast, Schätzungen und Rechner entfernt. Tests: `npm run test` (80 grün), `npm run build` grün. |
| 2026-05-26 | **Deploy-Fix:** `push.ps1` bereinigt `/opt/financer` vor dem Kopieren und erhält nur `.env`/`.env.local`, damit gelöschte lokale Dateien nicht als Altlasten auf dem Server bleiben. |
| 2026-05-26 | **Ä-09 archiviert:** Erledigter Änderungswunsch aus `aenderungen.md` nach `archive.md` verschoben; Änderungs-Backlog ist leer. |
| 2026-05-26 | **Backlog-Archiv konsolidiert:** Erledigte Features und behobene Bugs aus `features.md`/`bugs.md` nach `archive.md` verschoben; aktive Backlogs zeigen nur noch offene Punkte. |
| 2026-05-26 | **Marktkalender-Fix:** Yahoo `quoteSummary/calendarEvents` liefert wieder 404/401; Dashboard-Marktkalender nutzt nun Nasdaq-Kalenderdaten datumsweise und filtert sie auf Portfolio-Ticker. |
| 2026-05-26 | **Marktkalender-Cache:** Asset-Create/Delete/Update invalidiert jetzt auch `market-calendar`, damit das Dashboard nach neuen Positionen nicht den alten leeren Widget-Cache zeigt. |
| 2026-05-26 | **Marktkalender dokumentiert:** Aktuelle Nasdaq-US-Abdeckung als Einschränkung in `plan/README.md` ergänzt; **F-34** für breitere Marktkalender-Datenquellen ins Feature-Backlog aufgenommen. |
| 2026-05-26 | **B-08 — Admin-2FA-Toggle erzwingt Setup:** 2FA hat nun `off`/`pending_setup`/`active`-Semantik. Admin-Aktivierung setzt Pending ohne Secret, Login leitet nach `/settings?setup2fa=1`, `AuthGuard` blockt andere geschützte Bereiche bis zur TOTP-Bestätigung, Secrets werden erst nach gültigem Code gespeichert. Tests: `npm run test` (80 grün), `npm run build` grün. |
| 2026-05-27 | **B-06 — Backup-Restore:** Restore-Validierung akzeptiert nun `QUANTITY_UPDATE` und `VWAP_UPDATE`; `backupSchema` liegt unter `src/lib/validations/backup.ts` und ist mit Regressionstests abgesichert. Tests: `npm run test` (82 grün). |
| 2026-05-27 | **B-10 — Investment-Preislogik:** `getCurrentPrice()` wählt nun den neuesten kursrelevanten Eintrag aus `PRICE_UPDATE` oder `PURCHASE`; alte Kurs-Snapshots können neuere Kaufpreise nicht mehr übersteuern. Regressionstest ergänzt. |
| 2026-05-27 | **B-11 — Haushaltskasse Monats-Save:** `useSaveMonthlyEntry()` prüft Income-/Payout-Responses auf `res.ok` und wirft API-Fehler weiter; der Monatsdialog zeigt dadurch bei Teilfehlern keinen erfolgreichen Save mehr an. |
| 2026-05-27 | **B-07 — Backup/Restore vollständig:** Export und Restore umfassen nun Dividenden sowie Haushaltskassen-Simulationen mit Monats-Entries; Restore löscht diese Daten vor dem Import vollständig. Alte Backups ohne die neuen Felder bleiben gültig. Tests: `npm run test` (85 grün), `npm run build` grün. |
| 2026-05-27 | **B-12 — FX-Ausfall:** `getEurRate()` wirft bei fehlendem Fremdwährungs-Wechselkurs statt `1.0` zurückzugeben. Kursdetails speichern dann keinen EUR-Wert; Portfolio- und Dashboard-APIs melden 503, wenn kein geladener/gecachter FX-Kurs verfügbar ist. Tests: `npm run test` (89 grün), `npm run build` grün. |
| 2026-05-27 | **B-09 — G/V-Historie:** `getGainLossHistory()` reduziert die historische Kostenbasis nun bei Verkäufen proportional und bei Mengenkorrekturen auf die korrigierte Menge; `getPortfolioValueHistory()` nutzt dieselbe Positions-Replay-Logik. Tests: `npm run test -- src/test/calculations.test.ts` (22 grün). |
