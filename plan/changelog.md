# Changelog

Ã„nderungslog des Projekts. Architektur, Projektstand und Querverweise starten in [`README.md`](README.md).

| Datum | Ã„nderung |
|---|---|
| 2026-06-02 | **Git-Historie anonymisiert:** git filter-repo (Mailmap Financer <financer@users.noreply.github.com>, Blob-Ersetzungen: E-Mail, 10.1.1.130→YOUR_SERVER, 192.168.1.50→192.168.x.x, Seed-Beträge, TR-UUIDs); origin entfernt — Push nur mit git push --force nach Re-Add Remote |
| 2026-06-02 | **Anonymisierung:** Seed-Demo mit runden FiktivbetrÃ¤gen; TR-Fixture-UUIDs synthetisch; LAN-IP in `plan/setup.md`/`next.config.ts` generisch (`192.168.x.x`) |
| 2026-06-02 | **README:** vollstÃ¤ndig auf Englisch (Git-Reichweite) |
| 2026-06-02 | **Release v0.1.0** â€” F-45 PersÃ¶nlicher Einkommen-Tab (`/einkommen`); 206 Tests; GitHub Release |
| 2026-06-02 | **F-45 PersÃ¶nlicher Einkommen-Tab:** Route `/einkommen`, Brutto/Netto/Monatsbonus + Sonder-Boni, Mehrjahres-Matrix, Sync Netto â†’ Haushaltskasse; nur eigener User; Backup nur eigene Privatdaten; Migration `20260602_f45_personal_income` |
| 2026-06-01 | **F-40â€“F-44 Daily Habit (Implementierung):** `/heute`, Notification Bell, Portfolio-Snapshots, Monats-Checkliste, Kalender Depot-Filter; Prisma-Migration `20260601_daily_habit_features`; 202 Tests |
| 2026-06-02 | **Plan F-41 + F-43:** Implementierungsspezifikationen in `plan/feature-f41-portfolio-snapshot.md` und `plan/feature-f43-household-month-routine.md`; KurzplÃ¤ne in `plan/features.md`; README-Stand |
| 2026-06-01 | **Backlog F-40â€“F-44:** Daily-Habit-Features in `plan/features.md` â€” Heute-Briefing, VermÃ¶gens-Snapshot, Notification Bell, Haushaltskasse-Monatsroutine, Dein Kalender (F-35 Nummer bereits fÃ¼r Interest vergeben) |
| 2026-06-01 | **Release v0.0.10** â€” i18n: locale-aware API-Validierung, erweiterte API-Fehler-Ãœbersetzung, `html lang` aus Session, Key-ParitÃ¤t-Tests; 200 Unit-Tests |
| 2026-06-01 | **i18n vervollstÃ¤ndigt:** API-Routen nutzen `sessionLocale` + locale-aware Zod-Schemas; Simulation/Dividend/Depot-Validierung mit Message-Keys; erweiterte `API_ERROR_MAP`; Root-`html lang` aus Session; Key-ParitÃ¤t-Test de/en; `common.close` fÃ¼r Dialog/Sheet |
| 2026-06-01 | **README:** Mobile-Vorschau (Dashboard + Sidebar), Hinweis auf responsive UI |
| 2026-06-01 | **Backlog Ã„-12/Ã„-13:** TR-Import â€” Dividenden-Vorschau mit Auswahl; Zeitraum-Filter (von/bis) mit HÃ¤kchen vor Import |
| 2026-06-01 | **README:** v0.0.9, TR-Import/Merge/Deploy/Tenant-LÃ¶schen, 196 Tests; CHANGELOG 0.0.9 |
| 2026-06-01 | **Tenant-Benutzer lÃ¶schen:** `DELETE /api/admin/users/[userId]` fÃ¼r provisionierte User; Haushalts-Admin darf Tenant-User des Owners verwalten/lÃ¶schen; UI LÃ¶schen-Button unter â€žAngelegte Benutzer" |
| 2026-06-01 | **CI:** Docker-Job â€” `setup-buildx-action` vor GHCR-Build (GHA-Cache braucht Buildx, nicht default docker driver) |
| 2026-06-01 | **Deploy:** Zwei gleichwertige Update-Pfade â€” `FINANCER_DEPLOY_MODE=build` (git pull + `--build`) oder `ghcr` (compose pull + up -d); `./scripts/update.sh`; CI pusht GHCR-Image bei jedem Push auf `main` |
| 2026-06-01 | **TR-Import Auswahl:** Neuer Auswahl-Schritt mit Checkboxen, Schnellauswahl (Alle/Keine/Nur neue/Nur mit Match/Nur mit Betrag), Sortierung nach Betrag (0 â‚¬ unten); `import_new` per Resolution Ã¼berspringbar |
| 2026-06-01 | **TR-Import:** Fehlermeldung bei ungÃ¼ltiger Menge/Kurs zeigt Typ, Produkt, ISIN und Werte; nicht-`executed`-Zeilen werden Ã¼bersprungen; Betrag aus max(Debit, Credit) wenn beide gesetzt |
| 2026-06-01 | **Release v0.0.9** â€” Positionen zusammenfÃ¼hren (F-39), Depot leeren vor TR-Import, Merge-Wizard UX |
| 2026-06-01 | **TR-Import:** Depot leeren â€” API `DELETE /api/investments/accounts`, Button + Checkbox â€žvor Import leerenâ€œ im Import-Wizard; lÃ¶scht alle Positionen eines Depot-Namens inkl. Buchungen/Dividenden (Interest ausgenommen) |
| 2026-06-01 | **CI-Fix:** Doppelimport `useHousehold` entfernt; `MergeScanPhase`-Typ fÃ¼r TS-Build |
| 2026-06-01 | **F-39 Merge-Wizard UX:** Dialog breiter (`max-w-4xl`), scrollbarer Body; manueller Schritt mit durchsuchbarem Ziel-Picker und Quell-Filter; Null-Positionen ausblenden (Default an); Werte in Listen; Review ohne `truncate` |
| 2026-06-01 | **F-39 Review-Fixes (vollstÃ¤ndig):** Wizard Steps suggestions/review/applying + NDJSON-Scan + Batch high-confidence + Step-Bug; Admin-only Merge-Button; Null-Filter mit Header/Charts; `fetchMergeSuggestionsStream`; Tests merge-apply, merge-suggestions-route, tr-isin-backfill; **177 Tests** |
| 2026-06-01 | **F-39 Review Phase 1+2:** VWAP_UPDATE in Merge-Mengenberechnung; Matching Regel 2 (eine ISIN + Name); Clique-Split gegen transitive False-Positives; TR-ISIN-Backfill; NDJSON-Stream `?stream=1` fÃ¼r merge-suggestions; `trImportRelevant` + `trAccount`; generische NDJSON-Hilfen in `ndjson-stream.ts` |
| 2026-06-01 | **F-39:** Positionen zusammenfÃ¼hren â€” Merge-Wizard (VorschlÃ¤ge + manuell), API `/api/assets/merge*`, Null-Filter in Investments; TR-Import ISIN-Lookup + Merge-CTA; 12 Tests |
| 2026-06-01 | **F-39 (Plan):** Positionen zusammenfÃ¼hren â€” Spezifikation in `plan/feature-f39-merge-positions.md` |
| 2026-05-31 | **B-34:** TR-Import â€” Spalten `Amount`/`Betrag`/`Gesamt`; fehlende Kurse aus BetragÃ·StÃ¼ck ableiten; robustere Spalten-Erkennung; mehr Dividenden-/Zins-Typen |
| 2026-05-31 | **B-28â€“B-32:** TR-Import â€” Zod-Validierung fÃ¼r NDJSON-Complete-Payload; JSON.parse try/catch; toter `useImportProgressReader` entfernt; Fortschrittsbalken min. 1â€¯% bei Phase-Start; Tests fÃ¼r NDJSON-Routes und `resolveIsins` parallel |
| 2026-05-31 | **CI:** TR-Import â€” `streamController`-Typ in `createNdjsonResponse` (Objekt-Ref statt `let`, TS-Narrowing in async-`finally`) |
| 2026-05-31 | **B-24â€“B-27:** TR-Import â€” ETA ab erstem Event; ISIN-Retry/Concurrency 2; NDJSON-Fehler vor Stream â†’ HTTP 500; Tickers-Step nur bei `needsAttention` |
| 2026-05-31 | **B-22, B-23:** TR-Import â€” Apply-Fortschritt via `finally` pro Zeile; Ticker-Konflikt rutscht nach Override in â€žErledigtâ€œ |
| 2026-05-31 | **B-22â€“B-32:** Code-Review TR-Import â€” 11 Bugs im Backlog (`plan/bugs.md`): Apply-Progress-LÃ¼cken, Ticker-Konflikt-Partition, ETA-Start, fehlende Tests |
| 2026-05-31 | **F-38 UX:** TR-Import â€” Fortschrittsbalken mit ETA (NDJSON-Streaming bei Analyse + Apply); Konflikte/Ticker in Folge-Steps oben (â€žZu prÃ¼fen"), auto-zugeordnete ISINs eingeklappt; Scroll-Reset bei Step-Wechsel |
| 2026-05-31 | **F-38 UX:** TR-Import-Wizard â€” Zeilen sortiert (Fehler oben, Auto-Zuordnung unten), problematische EintrÃ¤ge leicht rot markiert |
| 2026-05-31 | **Deploy:** `scripts/deploy.sh` baut lokal (`git pull` + `compose up --build`); GHCR-Overlay nur noch optional â€” kein Versions-RÃ¼ckschritt mehr nach `git pull` |
| 2026-05-31 | **Release v0.0.8** â€” Trade-Republic-CSV-Import (F-38), Ticker-Abgleich, 126 Tests |
| 2026-05-31 | **F-38 Ticker-Abgleich:** Import-Wizard zeigt alle ISINs; Portfolio-Ticker vor Yahoo; manuelle Zuweisung bei unbekannten ISINs; Konflikt-Hinweis bei abweichenden Tickern |
| 2026-05-31 | **F-38 Trade-Republic-Import:** 7-Schritte-Wizard, CSV-Parser, Hard/Soft-Dedup (`importRef`), Preview/Apply-API, ISINâ†’Ticker, Konflikt-Aktionen; Migration; Backup; 5 Tests; i18n de/en |
| 2026-05-31 | **F-36 Erweiterung:** `User.provisionedByUserId` â€” Owner sieht angelegte Tenant-User unter â€žAngelegte Benutzer (eigene Haushalte)"; Bearbeiten/2FA Ã¼ber provisioned-Check |
| 2026-05-31 | **F-36 Tenant-Provisioning (Hybrid):** `POST /api/admin/users` mit `tenancy: household|tenant`; neuer Haushalt + OWNER + Fixkosten; UI auf `/household`; `default-fixed-costs.ts`; 4 Schema-Tests |
| 2026-05-31 | **README:** An Stand v0.0.7 angepasst â€” Dividenden, Simulationen, 11 Widgets, 114 Tests, Backup-Inhalt, Marktkalender/`MARKET_CALENDAR_EXTERNAL`, offenes Backlog |
| 2026-05-31 | **Deploy:** `docker-compose.prod.yml` + CI GHCR-Push; `scripts/deploy.sh` nutzt Pull statt Build; Dockerfile ohne `next-env.d.ts` (gitignored) |
| 2026-05-31 | **CI:** GitHub Actions Job `docker` â€” baut und pusht `ghcr.io/carkeyuser/financer` (`latest`, Package-Version, Git-Tag, SHA) nach grÃ¼nem Build auf `main`/Tags; `docker-compose.prod.yml` fÃ¼r Pull-Deploy |
| 2026-05-31 | **Release v0.0.7** â€” Release-Notes im Update-Dialog ein-/ausklappbar (nur neueste Version offen) |
| 2026-05-31 | **Update-Dialog:** Release-Notes pro Version ein-/ausklappbar; nur neueste Version standardmÃ¤ÃŸig offen |
| 2026-05-31 | **Release v0.0.6** â€” Schnellere Docker-Builds (schlankes Runtime-Image, BuildKit-Cache, Entrypoint) |
| 2026-05-31 | **Docker Build:** Schlankes Runtime-Image (nur Prisma-CLI statt vollem `node_modules`), BuildKit-Cache, `.dockerignore`, selektiver Builder-COPY, `outputFileTracingIncludes` fÃ¼r Generated Client |
| 2026-05-31 | **Release v0.0.5** â€” Release-Notes-Button in Sidebar und Mobile-MenÃ¼ (Ã„-11) |
| 2026-05-31 | **Ã„-11 Changelog-Button:** Release-Notes-Button Ã¼ber Abmelden in Sidebar und Mobile-MenÃ¼; wiederverwendet `UpdateNotesDialog` + `release-notes.ts` |
| 2026-05-31 | **Release v0.0.4** â€” Bankzinsen als Dividenden-Position `Interest` (F-35) |
| 2026-05-31 | **F-35:** Bankzinsen als Dividenden-Position `Interest` â€” auto-provisioniert pro User, nur in Dividenden sichtbar, nicht im Portfolio |
| 2026-05-31 | **F-36** (Backlog): MandantenfÃ¤hige User-Verwaltung â€” User in eigenem Haushalt, Investments nur eigene Positionen pro Tenant |
| 2026-05-31 | **Release v0.0.3** â€” GitHub Release mit Changelog; In-App-Release-Notes erweitert |
| 2026-05-31 | **Release v0.0.3** â€” Auto-Deploy entfernt, manuelles Deploy |
| 2026-05-31 | **Deploy:** Auto-Deploy entfernt â€” CI nur noch lint/test/build; Deploy manuell (`git pull`, `.\push -Deploy`, `scripts/deploy.sh`) |
| 2026-05-31 | **Release v0.0.2** â€” Update-Dialog, README-Vorschau |
| 2026-05-31 | **Docs:** README-Vorschau â€” Dashboard-Screenshots (Light/Dark) unter `docs/screenshots/` |
| 2026-05-31 | **F-37 Update-Dialog:** Nach App-Update einmalig Dialog mit kuratierten Release-Notes (de/en); Version aus `package.json` via `next.config.ts`; `localStorage` fÃ¼r gesehene Version; Erstbesuch stumm; Login-Snapshot wartet auf SchlieÃŸen; manuelles Ã–ffnen in Settings |
| 2026-05-31 | **Deploy:** Auto-Deploy via Self-hosted GitHub Actions Runner + `scripts/deploy.sh` (nach grÃ¼nem CI auf `main`) |
| 2026-05-31 | **Deploy:** `docker-compose.yml` â€” `pull_policy: build` fÃ¼r `app`, damit Compose `finance-app:latest` nicht von Docker Hub pullt |
| 2026-05-31 | **Docs:** Windows-Pfad `c:\dev\financer` in README/plan durch neutrales `financer/` ersetzt |
| 2026-05-31 | **F-30 GitHub-ready:** `.gitignore` erweitert (`.env*` + `!.env.example`, `push.ps1`/`pack.ps1`, `.claude/`, `.cursor/`, `*.tar.gz`); IPs und persÃ¶nliche Daten anonymisiert; `push.example.ps1`/`pack.example.ps1`; MIT LICENSE; GitHub Actions CI (lint, test, build); Initial Commit |
| 2026-05-31 | **Deploy:** `push.ps1` â€” Parameter `-Deploy` kopiert und startet `docker compose up -d --build` per SSH (`.\push -Deploy`) |
| 2026-05-31 | **Fix:** `LoginSnapshotDialog` â€” Link als Outline-Button via `buttonVariants` (Base UI Button hat kein `asChild`; Docker-Build TypeScript-Fehler) |
| 2026-05-31 | **F-36 Login Portfolio-Snapshot:** Nach Login Popup mit kombiniertem unrealisiertem G/V der eigenen Positionen; `?scope=mine` auf `/api/dashboard/summary`; `LoginSnapshotDialog` in AuthGuard; sessionStorage-Flag in LoginForm |
| 2026-05-31 | **Plan:** F-36 Login Portfolio-Snapshot â€” nach jedem Login Popup mit kombiniertem unrealisiertem G/V der eigenen Positionen (`plan/features.md`) |
| 2026-05-29 | **Investments Zeitraum-Charts:** Presets 1Wâ€“Gesamt fÃ¼r Wert- und G/V-Verlauf (Investments + Dashboard-Widget); Yahoo-Historie mit `1d`/`1wk`/`1mo`; tÃ¤gliche FÃ¼llung bei kurzen Ranges |
| 2026-05-29 | **Haushaltskasse Ãœberweisung:** Monats- und Simulations-Dialog zeigen live die Ãœberweisung ans Gemeinschaftskonto (Einkommen âˆ’ tatsÃ¤chliche Auszahlung) inkl. Summe, Fixkosten-Hinweis und Warnung bei Unterdeckung |
| 2026-05-27 | **Plan-Doku:** `plan/` vollstÃ¤ndig aktualisiert (97 Tests, 11 Dashboard-Widgets, Nasdaq-Marktkalender, Self-hosted-Troubleshooting, Next.js 16, `prisma db push` auf Server) |
| 2026-05-27 | **Marktkalender self-hosted:** Nasdaq-Abruf auf 14 Werktage / 2 parallel / 8s Deadline begrenzt; Fail-fast-Probe + `MARKET_CALENDAR_EXTERNAL=false`; Route liefert bei Fehler `[]` statt â€žfailed to pipe responseâ€œ |
| 2026-05-20 | Initiale Planung: Next.js + TypeScript, PostgreSQL + Prisma, shadcn/ui, Recharts, TanStack Query, NextAuth v5, Docker |
| 2026-05-20 | **Phase 1:** Projekt-Setup, Prisma 7 + `@prisma/adapter-pg`, NextAuth v5, Login/Register, Sidebar, ThemeToggle, AuthGuard |
| 2026-05-20 | **Phase 2:** VollstÃ¤ndiges Expenses-Modul (Categories, Transactions, Budgets, Charts) |
| 2026-05-20 | **Phase 3:** Investments â€” Yahoo Finance Proxy, Asset+Entry CRUD, VWAP, SecuritySearch, 4 Charts via PortfolioChartPanel |
| 2026-05-20 | **Prisma 7:** Kein `url` im Schema; Driver Adapter; Generated Client in `src/generated/prisma` |
| 2026-05-20 | **Yahoo Finance Fixes:** Search-Pfad korrigiert; Price-API auf v8/chart-Endpoint |
| 2026-05-20 | **Phase 4 (initial):** Investment-Dashboard â€” KPIs, Wert-Verlauf, Allokation, Positionen |
| 2026-05-20 | **Deployment:** LXC auf Proxmox, `push.ps1`, `docker compose up --build` auf Server |
| 2026-05-22 | **Phase 5:** Household-Management â€” Invites, accept-invite, Switcher, Rollen-APIs, `/settings` |
| 2026-05-22 | **Dev-Setup-Fixes:** `AUTH_TRUST_HOST=true` + `trustHost: true`; `allowedDevOrigins` fÃ¼r HMR |
| 2026-05-22 | **Bug: Doppelte Sidebar** â€” `AuthGuard` aus Page-Komponenten entfernt; Regel dokumentiert |
| 2026-05-22 | **Phase 6:** Ausgaben-Modul entfernt; Haushaltskasse implementiert (FixedCost, MonthlyIncome, MonthlyPayout, HouseholdFinanceTable, MonthlyEntryDialog) |
| 2026-05-23 | **Haushaltskasse als eigener Tab:** `/haushaltskasse`-Route, Sidebar-Eintrag PiggyBank |
| 2026-05-23 | **Wertpapiersuche verbessert:** `enableFuzzyQuery=true`, `quotesCount=10`; Placeholder mit Beispielen |
| 2026-05-23 | **B-01 behoben:** `PortfolioAllocationChart` â€” Custom-Label fÃ¼r kleine Segmente |
| 2026-05-23 | **Phase 7:** `getEurRate()` (60s Cache); `eurRate` in allen Assets-APIs; alle Werte in EUR |
| 2026-05-23 | **Phase 5 Restpunkte:** Rollen-Select in `HouseholdContent`; Invite-Widerruf |
| 2026-05-23 | **F-01:** `AssetEditDialog` + `PUT /api/assets/[id]` + `useUpdateAsset` |
| 2026-05-23 | **F-03:** `getPortfolioValueHistory` fÃ¼gt immer `today` ein |
| 2026-05-23 | **F-04:** Drag & Drop (`@dnd-kit`) + Card/List-Toggle; `Asset.order`; `POST /api/assets/reorder` |
| 2026-05-23 | **F-05:** `FixedCostsSettings` als Collapsible in `HouseholdFinanceTable` |
| 2026-05-23 | **F-06:** Username-only Auth; `User.username` unique, `email` optional, `twoFactorSecret` |
| 2026-05-23 | **Tests:** Vitest eingerichtet; 46 Unit-Tests grÃ¼n |
| 2026-05-23 | **Bugfix: doppeltes `"use client"`** in `AssetDetailContent.tsx` entfernt |
| 2026-05-23 | **Bugfix: nested `<button>`** in `HouseholdFinanceTable` â€” `CollapsibleTrigger` ohne `asChild` |
| 2026-05-23 | **F-07:** Sidebar â†’ â€žBenutzer"; E-Mail-Feld entfernt; `POST /api/admin/users` (OWNER-only) |
| 2026-05-23 | **F-09:** CoinGecko-Fallback in `/api/securities/search` parallel zu Yahoo |
| 2026-05-23 | **Bugfix: Prisma-Client veraltet** â€” `prisma migrate deploy` + `prisma generate` nach F-04/F-06 vergessen â†’ 500-Fehler in `/api/assets` + `/api/household` |
| 2026-05-23 | **B-02:** `MonthlyFixedCostSnapshot`; income-Route friert Fixkosten ein; summary-Route nutzt Snapshot |
| 2026-05-23 | **F-10:** `account`-Feld (Pflicht); `@@unique([householdId, userId, ticker])`; `ownerName` in API; AssetCard + AssetForm + AssetEditDialog aktualisiert |
| 2026-05-23 | **F-11:** `react-grid-layout`; `DashboardWidget`-Tabelle; 6 Widgets; WidgetManager-Modal; Marktkalender via Yahoo Finance calendarEvents |
| 2026-05-23 | **Tests:** 47 Unit-Tests grÃ¼n (1 neuer Test fÃ¼r `account`-Validation) |
| 2026-05-23 | **B-03:** `useSaveWidgets` â€” `onSuccess: invalidateQueries` entfernt; `DashboardContent` â€” `useEffect` mit `initializedFromDb`-Ref, lÃ¤dt DB-Layout nur einmal |
| 2026-05-23 | **B-05:** `DELETE /api/assets/[id]` â€” `requireHouseholdAdmin` â†’ `requireSession`; alle Haushaltsmitglieder kÃ¶nnen Positionen lÃ¶schen |
| 2026-05-23 | **F-12:** `autoSortLayout()`-Funktion + â€žSortieren"-Button in `DashboardContent.tsx` |
| 2026-05-23 | **F-13:** `.react-resizable-handle-se` Grip-Dot-Styling in `globals.css` |
| 2026-05-23 | **Ã„-01:** `PortfolioAllocationChart` â€” Default-Ansicht auf â€žNach Position" geÃ¤ndert |
| 2026-05-23 | **Ã„-02:** `HouseholdFinanceTable` â€” Quartals-Ãœberschusszeilen entfernt; JahresÃ¼berschuss in `tfoot` |
| 2026-05-23 | **B-04:** `market-calendar/route.ts` â€” v10/query1 â†’ v11/query2, realistischer User-Agent, `cache: 'no-store'` |
| 2026-05-23 | **B-06:** `DashboardContent` â€” `onLayoutChange` speichert sofort; `ignoreLayoutChange`-Ref Ã¼berspringt initialen DB-Load; `CardHeader` â†’ plain `<div>` in `WidgetShell` (X-Button oben rechts) |
| 2026-05-23 | **B-07:** `Sidebar.tsx` â€” `signOut({ callbackUrl: "/auth/login" })` war bereits korrekt |
| 2026-05-23 | **B-08:** `src/app/login/page.tsx` â€” Redirect von `/login` â†’ `/auth/login` |
| 2026-05-23 | **Ã„-03:** `WidgetShell` â€” `onRemove`-Prop + `Ã—`-Button; `handleToggleWidget` ruft `autoSortLayout` nach Entfernen auf |
| 2026-05-23 | **Ã„-04:** `InvestmentsContent` â€” Listenansicht zeigt Konto (Landmark-Icon) + Besitzer (User-Icon) |
| 2026-05-23 | **B-09:** `DashboardContent` â€” `ignoreLayoutChange = useRef(true)` â€” verhindert, dass `react-grid-layout` beim ersten Mount `DEFAULT_LAYOUT` in die DB schreibt und damit die gespeicherten Positionen Ã¼berschreibt |
| 2026-05-23 | **B-10:** `DashboardContent` + `useWidgets` â€” `onDragStop`/`onResizeStop` fÃ¼r Saves; `staleTime: Infinity` + `setQueryData`; `useState(() => savedLayout ?? DEFAULT_LAYOUT)`; `layoutReady`-State im selben Batch mit `setLayout` verhindert DEFAULT_LAYOUT-Flash nach F5 |
| 2026-05-23 | **F-16:** 2FA-Deaktivierung erfordert TOTP-Code â€” `DELETE /api/user/2fa` prÃ¼ft jetzt Token; `SettingsContent` zeigt Step `disable-confirm` mit eigenem Formular statt `confirm()`-Dialog |
| 2026-05-23 | **B-11:** Settings â€” `username` in JWT/Session ergÃ¤nzt; `useEffect`-Race-Fix fÃ¼r Profil-Form; "Benutzername"-Feld editierbar mit Regex-Validierung + Uniqueness-Check in API; Fehleranzeige unter Passwort-Feldern |
| 2026-05-23 | **B-12:** `AssetGainLossBarChart` â€” `.filter((d) => d.gainLoss !== 0)` entfernt; alle Positionen (inkl. G/V = 0) werden jetzt im Balkendiagramm angezeigt |
| 2026-05-23 | **B-13:** `SettingsContent` â€” Passwort-Fehler via `passwordForm.setError` direkt unter dem Feld statt nur als Toast; API-String-Fehler ("Kein Passwort gesetzt") ebenfalls als Toast gefangen |
| 2026-05-23 | **F-17:** `PATCH /api/admin/users/[userId]` â€” OWNER/ADMIN kann Anzeigename, Loginname und Passwort anderer User Ã¤ndern; `editUserSchema`; `useAdminEditUser`-Hook; Bearbeitungs-Dialog (Pencil-Button) in `HouseholdContent.tsx` |
| 2026-05-23 | **F-18:** `calculations.ts` â€” `getPortfolioValueHistory` fÃ¼llt monatliche Zwischenpunkte zwischen frÃ¼hestein Entry und heute; `getGainLossHistory` refaktoriert auf direkte Nutzung der `getPortfolioValueHistory`-Datenpunkte |
| 2026-05-23 | **F-19:** `InvestmentsContent.tsx` â€” Sortier-Buttons (Depot/Besitzer/Wert), Standard-Ansicht â€žListe"; aktiver Sort wird durch DnD-Drag deaktiviert |
| 2026-05-23 | **F-20:** 4 neue Dashboard-Widgets: `TopFlopWidget`, `HouseholdSummaryWidget`, `CurrencyExposureWidget`, `NetWorthWidget`; `WIDGET_REGISTRY` in `useWidgets.ts` erweitert; `DashboardContent.tsx` rendert alle 4 neuen IDs |
| 2026-05-23 | **D-01:** `docker-compose.yml` â€” `prisma db push` â†’ `prisma migrate deploy`; Postgres-Port nicht mehr nach auÃŸen exposed; dediziertes `finance_net` Bridge-Netzwerk; `README.md` komplett neu als Proxmox/LXC-Deploy-Guide |
| 2026-05-24 | **Phase 9 â€” Datensicherung:** `GET /api/backup` exportiert alle Haushaltsdaten (Fixkosten, Einkommen, Auszahlungen, Snapshots, Assets + EintrÃ¤ge) als JSON-Datei; `POST /api/backup` stellt das Backup wieder her (lÃ¶scht vorhandene Daten + reimportiert, Usernames werden auf aktuelle User-IDs gemappt, Fallback auf importierenden User). Nur OWNER/ADMIN darf einspielen. `BackupCard.tsx` in `/settings` mit Export-Button + Datei-Upload + AlertDialog-BestÃ¤tigung. shadcn `alert-dialog` installiert. |
| 2026-05-24 | **F-21 â€” Historische Yahoo-Finance-Kurse:** `GET /api/securities/history` (neu); `usePortfolioHistory`-Hook in `useAssets.ts`; `mergeHistoricalPrices()` in `calculations.ts`; `PortfolioValueChart` + `PortfolioGainLossChart` laden echte Kurshistorie von Yahoo Finance und zeigen damit den korrekten Wert-/G/V-Verlauf ab dem Kaufdatum. |
| 2026-05-24 | **Krypto-Suche: Popular-Crypto-Liste:** `POPULAR_CRYPTOS`-Liste in `/api/securities/search/route.ts` mit 19 bekannten Tokens (BTC, ETH, XRP/Ripple, SOL, BNB, ADA, DOGE, AVAX, DOT, LINK, LTC, MATIC, XLM, TRX, TON, SHIB, SUI, PEPE) inkl. Aliases. Suchanfragen wie "ripple" oder "bitcoin" matchen jetzt zuverlÃ¤ssig lokal â€” ohne AbhÃ¤ngigkeit von CoinGecko-Ratelimits. Popular-Ergebnisse erscheinen zuerst, Yahoo und CoinGecko ergÃ¤nzen dahinter (Dedup per Symbol). |
| 2026-05-24 | **Investment-Anlegen: Datum optional + Kurs-Auto-Fill:** `purchaseDate` in `assetSchema` und `date` in `assetEntrySchema`/`assetEntryUpdateSchema` sind jetzt optional. Backend-Fallback: fehlendes Datum â†’ `new Date()` (heute). `AssetEntryForm` erhÃ¤lt neues `ticker`-Prop; ein `useEffect` ruft beim Laden (und bei leerem Datumsfeld) automatisch `/api/securities/price?symbol=<ticker>` ab und befÃ¼llt das Preis/Einheit-Feld mit dem aktuellen EUR-Kurs. WÃ¤hrend des Ladens ist das Preisfeld deaktiviert (`LÃ¤dtâ€¦`). `AssetForm` zeigt `purchaseDate`-Label als optional. GeÃ¤nderte Dateien: `src/lib/validations/asset.ts`, `src/app/api/assets/route.ts`, `src/app/api/asset-entries/route.ts`, `src/app/api/asset-entries/[id]/route.ts`, `src/components/investments/AssetEntryForm.tsx`, `src/components/investments/AssetForm.tsx`, `src/app/investments/[id]/entry/page.tsx`. |
| 2026-05-24 | **Investment-Anlegen: WÃ¤hrungs-Dropdown (â‚¬ / $):** WÃ¤hrungsfeld in `AssetForm.tsx` von Textfeld auf shadcn `Select` (EUR / USD) umgestellt. Beim Wechsel der WÃ¤hrung wird `purchasePrice` automatisch auf den passenden Kurs umgestellt: EUR â†’ `currentPriceEur`, USD â†’ nativer Kurs (`currentPrice`). Preis/Einheit-Label zeigt das aktive Symbol (â‚¬ oder $). |
| 2026-05-24 | **Haushaltsname Ã¤ndern:** `PATCH /api/household` (OWNER/ADMIN) aktualisiert den Haushaltsnamen. `updateHouseholdNameSchema` in `validations/household.ts`. `useUpdateHouseholdName`-Hook in `useHousehold.ts`. Neue â€žHaushaltsname"-Karte in `HouseholdContent.tsx` mit Inline-Bearbeitungsformular (Pencil-Button). |
| 2026-05-24 | **Investment-Kurs Ã¼berschreiben:** Entry-Typ `PRICE_UPDATE` heiÃŸt in der UI nun â€žManuelle Anpassung" (war â€žPreis-Snapshot"). `POST /api/asset-entries` macht fÃ¼r PRICE_UPDATE jetzt einen Tag-genauen Upsert: existiert fÃ¼r denselben Tag bereits ein PRICE_UPDATE-Eintrag, wird dessen Preis Ã¼berschrieben statt ein neuer Eintrag angelegt. GeÃ¤nderte Dateien: `AssetDetailContent.tsx`, `AssetEntryForm.tsx`, `AssetEntryEditDialog.tsx`, `api/asset-entries/route.ts`. |
| 2026-05-24 | **B-14 â€” Aktueller Wert: EUR-Kurs statt USD-Kurs:** `handleRefreshPrice` in `AssetDetailContent.tsx` speichert jetzt `priceEur` fÃ¼r EUR-Assets (statt immer den Nativpreis). `AssetEntryForm` erhÃ¤lt `assetCurrency`-Prop und wÃ¤hlt den passenden Auto-Fill-Preis. `entry/page.tsx` Ã¼bergibt `asset.currency`. |
| 2026-05-25 | **B-16/B-17** im Bug-Backlog: Docker-Build TS-Fehler (`TooltipContentProps` in `PortfolioAllocationChart`); `push.ps1` schlieÃŸt `.codegraph`/`tsbuildinfo` noch nicht aus. |
| 2026-05-25 | **B-15 â€” Allokations-Chart Label-Overflow:** `PortfolioAllocationChart.tsx` â€” dreistufige Label-Logik (&lt;10 % kein Label, 10â€“25 % innen, â‰¥25 % auÃŸen), Tooltip mit Prozent, kleinerer Radius + Chart-Margin. |
| 2026-05-25 | **Allokations-Chart Interaktion:** Custom-Tooltip (Wert, G/V, Depot, Besitzer, Typ); Klick auf Segment in â€žNach Positionâ€œ â†’ `/investments/[id]`. |
| 2026-05-25 | **Ã„-05 â€” Fixkosten prominent:** `HouseholdFinanceTable` â€” `FixedCostsSettings` dauerhaft oberhalb der Monatstabelle sichtbar; Akkordeon entfernt. |
| 2026-05-25 | **Ã„-06 â€” VermÃ¶gen-Widget:** `NetWorthWidget` zeigt nur noch Portfoliowert; JahresÃ¼berschuss entfernt; Titel â€žVermÃ¶gen" in Widget-Registry und Dashboard. |
| 2026-05-25 | **F-22 â€” Englischer Sprachmodus:** `User.locale` (DB + JWT + Session); `I18nProvider` in `AppProviders`; de/en-Messages unter `src/i18n/messages/`; Sprach-Select in Settings (`LanguageCard`); locale-aware Zod-Schemas (`createXSchema(locale)`); `formatMoney`/`formatDate`/`compareLocale`; `mapApiError`/`translateApiError` fÃ¼r API-Fehler; Sidebar, Auth, Settings, Backup, Dashboard, Investments, Haushaltskasse, Haushalt angebunden. Unit-Tests fÃ¼r Format + API-Errors. |
| 2026-05-25 | **F-22 â€” Dashboard i18n:** `DashboardContent` + 6 Widget-Komponenten (`NetWorthWidget`, `CurrencyExposureWidget`, `HouseholdSummaryWidget`, `MarketCalendarWidget`, `TopFlopWidget`, `ClockWidget`) â€” `useI18n()`, Widget-Titel via `WIDGET_REGISTRY.titleKey`, `formatMoney`/`formatNumber`, `assetTypeLabel`, locale-aware Datumsformatierung. |
| 2026-05-25 | **F-22 â€” letzte i18n-LÃ¼cken:** `investments/new` und `investments/[id]/entry` (Client-Header mit `useI18n()`), `ThemeToggle` aria-label (`common.themeToggle`); Message-Keys in de/en. |
| 2026-05-25 | **B-16:** `PortfolioAllocationChart` â€” `AllocationTooltip` nutzt `TooltipContentProps`; Tooltip-`content` als Render-Funktion mit Spread. **B-17:** `push.ps1` schlieÃŸt `.codegraph` und `*.tsbuildinfo` aus; `.codegraph/` in `.gitignore`. |
| 2026-05-25 | **README.md** vollstÃ¤ndig Ã¼berarbeitet: Feature-Ãœbersicht, alle 10 Widgets, i18n/2FA, Haushaltskasse, Tests (59), LAN-Dev, Prisma-7-Hinweise, Troubleshooting, Cronjob-Backup, Projektstruktur; `db push` vs. `migrate deploy` konsistent dokumentiert. |
| 2026-05-25 | **F-29 â€” Automatischer Kurs-Refresh (2h):** `src/lib/services/security-price.ts` (Yahoo-Fetch, `resolveStoredPrice`, `upsertTodayPriceUpdate`); `POST /api/assets/refresh-prices`; `usePortfolioPriceRefresh` + `PortfolioPriceRefresh` in `AuthGuard`; `usePortfolioHistory` mit 2h-Intervall; Unit-Tests `security-price.test.ts`. |
| 2026-05-25 | **F-26/F-27 â€” Positions-UI:** `AssetLogo.tsx` (FMP-Logo, Typ-Badge mit Icon bei Fehler); `position-display.ts` (Logo-URL, `hasMarketPrice`, Glow-Klassen); `AssetCard` + Listenzeilen in `InvestmentsContent` mit Logo links und dezenter G/V-FÃ¤rbung (grÃ¼n/rot/neutral ohne `PRICE_UPDATE`). |
| 2026-05-25 | **Tests:** E2E (Playwright) und API-Integration-Tests aus Plan entfernt â€” Scope bleibt bei Vitest Unit-Tests; `README.md` angepasst. |
| 2026-05-25 | **F-30:** Feature â€žGitHub-ready fÃ¼r Pushâ€œ im Feature-Backlog ergÃ¤nzt. |
| 2026-05-25 | **F-31:** Feature â€žOne-Click-Installation unter Dockerâ€œ im Feature-Backlog ergÃ¤nzt. |
| 2026-05-25 | **F-32:** Feature â€žDividenden-Integration + Rechner (eigener Tab)â€œ im Feature-Backlog ergÃ¤nzt. |
| 2026-05-25 | **B-18:** Bug â€žMarktkalender-Widget neu Ã¼berdenkenâ€œ im Bug-Backlog (offen); Bezug zu F-32. |
| 2026-05-25 | **F-33:** Feature â€žHaushaltskasse-Simulation ab Startmonatâ€œ im Feature-Backlog ergÃ¤nzt. |
| 2026-05-25 | **F-28 â€” Mobile Ansicht:** Bottom-Navigation + mobile Topbar, statische Dashboard-Widgetliste auf Smartphone, mobile Karten fÃ¼r Haushaltskasse/Investment-EintrÃ¤ge/Mitglieder, responsive Formulare/Dialoge und grÃ¶ÃŸere Touch-Ziele umgesetzt. Tests: `npm run test` (63 grÃ¼n), `npm run build` grÃ¼n; `npm run lint` blockiert durch veraltetes `next lint`-Script unter Next 16. |
| 2026-05-25 | **F-28 â€” Mobile Widget-Reihenfolge:** Dashboard-Widgets kÃ¶nnen auf Smartphone per Hoch/Runter-Buttons verschoben werden; Reihenfolge wird Ã¼ber das bestehende Widget-Layout gespeichert. Tests: `npm run test` (63 grÃ¼n), `npm run build` grÃ¼n. |
| 2026-05-25 | **F-33 â€” Haushaltskassen-Simulation:** Persistente Simulationstabellen, API `/api/household-finance/simulations`, gemeinsame Berechnungs-Utility, responsive Simulations-UI mit frei wÃ¤hlbarem Zeitraum, Vormonat Ã¼bernehmen und Folgemonats-Ãœbernahme. Tests: `npm run test` (74 grÃ¼n), `npm run build` grÃ¼n. |
| 2026-05-25 | **F-33 Navigation:** Simulation aus der Haupt-Haushaltskasse-Seite auf `/haushaltskasse/simulation` verschoben und in der Desktop-Sidebar als Subtab unter â€žHaushaltskasse" angezeigt. Build grÃ¼n. |
| 2026-05-25 | **F-32 â€” Dividenden-Feature:** Neuer Tab `/dividenden`, `DividendPayment`-Modell + Migration, Yahoo-Dividendenservice (`chart?events=div` + kommende Ex-Date), Summary-/Payment-APIs, Dividenden-Rechner, KPI/Chart/Positions-/Kalender-UI, Dashboard-Widget `dividend-summary`, Navigation + i18n. **B-18** erledigt: Marktkalender ist nicht mehr zentrale Dividenden-Quelle. Tests: `npm run test` (82 grÃ¼n), `npm run build` grÃ¼n. |
| 2026-05-25 | **F-32 UI-Fix:** Dividenden-Rechner und Buchungsdialog zeigen im Positions-Select jetzt Positionsname + Ticker statt interner Asset-ID. |
| 2026-05-25 | **F-32 Ex-Date-Fix:** Wenn Yahoo `calendarEvents` keine kommende Ex-Date liefert, wird die nÃ¤chste Ex-Date aus dem historischen AusschÃ¼ttungsrhythmus geschÃ¤tzt und als geschÃ¤tztes Dividendenereignis angezeigt. Tests: `npm run test` (83 grÃ¼n), `npm run build` grÃ¼n. |
| 2026-05-25 | **F-32 Buchungsdialog:** Beim Wechsel der Position im Dividenden-Buchungsdialog wird die aktuelle Investment-Menge der gewÃ¤hlten Position automatisch ins Mengenfeld Ã¼bernommen. |
| 2026-05-25 | **F-32 GeschÃ¤tzte Dividende buchen:** Wird eine geschÃ¤tzte Dividende gebucht, Ã¶ffnet der Dialog als `Erhalten` mit heutigem Zahltag; Ex-Date, Zahltag, Menge, Dividende/Aktie, Steuer und Status bleiben editierbar fÃ¼r die tatsÃ¤chliche Broker-Buchung. |
| 2026-05-25 | **Ã„-07:** Ã„nderungswunsch ergÃ¤nzt: Haken rechts in der Haushaltskassen-Simulation sollen grÃ¼n statt gelb dargestellt werden. |
| 2026-05-25 | **Ã„-08:** Ã„nderungswunsch ergÃ¤nzt: Monatliche Fixkosten in der Haushaltskasse sollen ein- und ausklappbar sein; Mobile-Ansicht und Simulationsbedienung mÃ¼ssen weiterhin funktionieren. |
| 2026-05-25 | **F-25/Ã„-07/Ã„-08:** Investments-Ãœbersicht um Depot-/Konto-Filter erweitert; Simulations-Haken grÃ¼n gefÃ¤rbt; monatliche Fixkosten in der Haushaltskasse als einklappbare Karte mit Summen-Header umgesetzt. |
| 2026-05-25 | **Mobile Hamburger Navigation:** Mobile Bottom-Navigation entfernt; `MobileTopBar` Ã¶ffnet nun ein seitliches Hamburger-MenÃ¼ mit allen `navItems` inklusive Haushaltskasse-Simulation. |
| 2026-05-26 | **Plan-Struktur:** `PLAN.md` verschlankt; Feature-, Ã„nderungs-, Bug-Backlog und Ã„nderungslog in eigene Dateien unter `plan/` ausgelagert; Agent-Hinweise auf die neue Struktur angepasst. |
| 2026-05-26 | **Plan vollstÃ¤ndig ausgelagert:** Restliche Inhalte aus `PLAN.md` in `plan/README.md`, `plan/architecture.md`, `plan/phases.md` und `plan/setup.md` verschoben; Verweise auf `plan/README.md` umgestellt; `PLAN.md` entfernt. |
| 2026-05-26 | **Backlog ergÃ¤nzt:** B-19 fÃ¼r Dashboard-Resize-Probleme und Ã„-09 fÃ¼r einen komplett manuellen Dividenden-Umbau ergÃ¤nzt. |
| 2026-05-26 | **B-19 â€” Dashboard-Resize:** `DashboardContent` nutzt `useContainerWidth()` aus `react-grid-layout` und die v2-Props `gridConfig`/`dragConfig`; FenstergrÃ¶ÃŸenÃ¤nderungen aktualisieren die Widget-Breiten ohne Layout-Save. |
| 2026-05-26 | **Backlog-Status aktualisiert:** Feature-, Bug- und Ã„nderungs-Backlog zeigen jetzt den aktuellen Offen-Status; B-19 ist geschlossen, offen bleiben F-30/F-31 und Ã„-09. |
| 2026-05-26 | **Plan-Archiv:** `plan/archive.md` ergÃ¤nzt; erledigte Ã„nderungswÃ¼nsche Ã„-01 bis Ã„-08 aus `aenderungen.md` ins Archiv verschoben. |
| 2026-05-26 | **Ã„-09 geplant:** Dividendenbereich soll vollstÃ¤ndig auf manuelle Buchungen reduziert werden; Pflichtfelder nur Position + Gesamtsumme, Yahoo-/Forecast-/Rechner-Logik wird entfernt. |
| 2026-05-26 | **Ã„-09 umgesetzt:** `/dividenden` komplett auf manuelle EUR-Buchungen umgebaut; Pflichtfelder nur Position + Gesamtsumme, optionale Details; Yahoo-Dividendenservice, Forecast, SchÃ¤tzungen und Rechner entfernt. Tests: `npm run test` (80 grÃ¼n), `npm run build` grÃ¼n. |
| 2026-05-26 | **Deploy-Fix:** `push.ps1` bereinigt `/opt/financer` vor dem Kopieren und erhÃ¤lt nur `.env`/`.env.local`, damit gelÃ¶schte lokale Dateien nicht als Altlasten auf dem Server bleiben. |
| 2026-05-26 | **Ã„-09 archiviert:** Erledigter Ã„nderungswunsch aus `aenderungen.md` nach `archive.md` verschoben; Ã„nderungs-Backlog ist leer. |
| 2026-05-26 | **Backlog-Archiv konsolidiert:** Erledigte Features und behobene Bugs aus `features.md`/`bugs.md` nach `archive.md` verschoben; aktive Backlogs zeigen nur noch offene Punkte. |
| 2026-05-26 | **Marktkalender-Fix:** Yahoo `quoteSummary/calendarEvents` liefert wieder 404/401; Dashboard-Marktkalender nutzt nun Nasdaq-Kalenderdaten datumsweise und filtert sie auf Portfolio-Ticker. |
| 2026-05-26 | **Marktkalender-Cache:** Asset-Create/Delete/Update invalidiert jetzt auch `market-calendar`, damit das Dashboard nach neuen Positionen nicht den alten leeren Widget-Cache zeigt. |
| 2026-05-26 | **Marktkalender dokumentiert:** Aktuelle Nasdaq-US-Abdeckung als EinschrÃ¤nkung in `plan/README.md` ergÃ¤nzt; **F-34** fÃ¼r breitere Marktkalender-Datenquellen ins Feature-Backlog aufgenommen. |
| 2026-05-26 | **B-08 â€” Admin-2FA-Toggle erzwingt Setup:** 2FA hat nun `off`/`pending_setup`/`active`-Semantik. Admin-Aktivierung setzt Pending ohne Secret, Login leitet nach `/settings?setup2fa=1`, `AuthGuard` blockt andere geschÃ¼tzte Bereiche bis zur TOTP-BestÃ¤tigung, Secrets werden erst nach gÃ¼ltigem Code gespeichert. Tests: `npm run test` (80 grÃ¼n), `npm run build` grÃ¼n. |
| 2026-05-27 | **B-06 â€” Backup-Restore:** Restore-Validierung akzeptiert nun `QUANTITY_UPDATE` und `VWAP_UPDATE`; `backupSchema` liegt unter `src/lib/validations/backup.ts` und ist mit Regressionstests abgesichert. Tests: `npm run test` (82 grÃ¼n). |
| 2026-05-27 | **B-10 â€” Investment-Preislogik:** `getCurrentPrice()` wÃ¤hlt nun den neuesten kursrelevanten Eintrag aus `PRICE_UPDATE` oder `PURCHASE`; alte Kurs-Snapshots kÃ¶nnen neuere Kaufpreise nicht mehr Ã¼bersteuern. Regressionstest ergÃ¤nzt. |
| 2026-05-27 | **B-11 â€” Haushaltskasse Monats-Save:** `useSaveMonthlyEntry()` prÃ¼ft Income-/Payout-Responses auf `res.ok` und wirft API-Fehler weiter; der Monatsdialog zeigt dadurch bei Teilfehlern keinen erfolgreichen Save mehr an. |
| 2026-05-27 | **B-07 â€” Backup/Restore vollstÃ¤ndig:** Export und Restore umfassen nun Dividenden sowie Haushaltskassen-Simulationen mit Monats-Entries; Restore lÃ¶scht diese Daten vor dem Import vollstÃ¤ndig. Alte Backups ohne die neuen Felder bleiben gÃ¼ltig. Tests: `npm run test` (85 grÃ¼n), `npm run build` grÃ¼n. |
| 2026-05-27 | **B-12 â€” FX-Ausfall:** `getEurRate()` wirft bei fehlendem FremdwÃ¤hrungs-Wechselkurs statt `1.0` zurÃ¼ckzugeben. Kursdetails speichern dann keinen EUR-Wert; Portfolio- und Dashboard-APIs melden 503, wenn kein geladener/gecachter FX-Kurs verfÃ¼gbar ist. Tests: `npm run test` (89 grÃ¼n), `npm run build` grÃ¼n. |
| 2026-05-27 | **B-09 â€” G/V-Historie:** `getGainLossHistory()` reduziert die historische Kostenbasis nun bei VerkÃ¤ufen proportional und bei Mengenkorrekturen auf die korrigierte Menge; `getPortfolioValueHistory()` nutzt dieselbe Positions-Replay-Logik. Tests: `npm run test -- src/test/calculations.test.ts` (22 grÃ¼n). |
