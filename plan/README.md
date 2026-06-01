# Finance Dashboard — Plan

> Dieser Ordner ist die zentrale Projektdokumentation.
> Startpunkt für neue Sessions ist diese Datei.

---

## Kontext

Persönliches Finanz-Dashboard für zwei Personen (WG/Paar). Zwei Kernbereiche:

1. **Haushaltskasse** — gemeinsame Fixkosten, monatliche Einnahmen, Auszahlungslogik mit Quartals-Bonus (eigener Tab in der Sidebar)
2. **Investments** — manuelles Portfolio-Tracking (Aktien, ETFs, Krypto) mit Kursabfrage via Yahoo Finance; Trade-Republic-CSV-Import; Positionen zusammenführen; Depot vor Neuimport leeren

Das Ausgaben-Modul (Transaktionen/Kategorien/Budgets) wurde **entfernt** — es passte nicht zum Nutzungsmodell.
Das Dashboard ist ein frei konfigurierbares Widget-Grid (11 Widget-Typen). Die Haushaltskasse hat einen eigenen Sidebar-Tab inkl. Simulations-Subtab.

Self-hosted via Docker auf einem Proxmox LXC.

**Stand:** 2026-06-02 (Plan F-41 + F-43)

---

## Projektstand

| Phase | Status | Kurzbeschreibung |
|---|---|---|
| **1** Auth + Skeleton | ✅ erledigt | Login, Register, NextAuth v5, Sidebar, Theme, AuthGuard, Docker |
| **2** Expenses | ✅ gebaut, dann entfernt | Modul vollständig aus der App entfernt (Phase 6) |
| **3** Investments | ✅ erledigt | Yahoo-Suche, Portfolio CRUD, VWAP, Charts, TR-Import (F-38), Merge (F-39), Depot leeren |
| **4** Dashboard | ✅ erledigt | Widget-Grid (react-grid-layout), 11 Widgets, Widget-Manager, DB-backed Layout |
| **5** Multi-User | ✅ erledigt | Invites, accept-invite, Switcher, Rollen, User anlegen, 2FA (TOTP) |
| **6** Haushaltskasse | ✅ erledigt | Ausgaben raus, Haushaltskasse + Simulationen (F-33) |
| **7** EUR-Konvertierung | ✅ erledigt | Alle Investment-Werte in € via Yahoo Forex; FX-Fehler → 503 statt falscher EUR-Werte |
| **8** Feature-Backlog | 🟡 teilweise offen | DevOps F-31, Kalender F-34; Daily-Habit F-40–F-44 ✅ |
| **9** Datensicherung | ✅ erledigt | Backup-Export + Restore inkl. Dividenden & Simulationen |
| **D-01** Docker Compose production-ready | ✅ erledigt | Kein offener PG-Port, dediziertes Netzwerk, Deploy-Guide in `README.md`. Container-Start: `prisma db push` (Produktions-DB ohne Migrationshistorie) |
| **Tests** | ✅ Unit-Tests | Vitest, **202 Tests** in 26 Dateien, alle grün |

---

## Bekannte Einschränkungen

| Thema | Details |
|---|---|
| **Wertpapiersuche** | Yahoo unterstützt keine deutschen **WKN**. Suche mit Ticker (`EUNL.DE`), Name oder ISIN. Krypto via CoinGecko-Fallback. |
| **Outbound HTTPS (LXC)** | Yahoo (`query1.finance.yahoo.com`) und Nasdaq (`api.nasdaq.com`) müssen vom Container erreichbar sein — sonst keine Live-Kurse / leerer Marktkalender. |
| **Marktkalender** | Daten von **Nasdaq** (Earnings + Ex-Dividenden), primär US-Symbole ohne Suffix. Auf gesperrten Hosts: `MARKET_CALENDAR_EXTERNAL=false` in `.env` — App bleibt bedienbar. Erweiterung: **F-34**. |
| **Dividenden** | Vollständig **manuell** (`/dividenden`); kein Yahoo-Dividenden-Import mehr. |

---

## Dokumente

| Dokument | Inhalt |
|---|---|
| [`architecture.md`](architecture.md) | Tech Stack, Projektstruktur, Datenmodell, externe APIs |
| [`phases.md`](phases.md) | Implementierungsphasen und Feature-Architektur |
| [`setup.md`](setup.md) | UI-Seiten, Dev-Setup, Docker, Tests, Self-hosted |
| [`deploy.md`](deploy.md) | **Server-Update** — Modus `build` oder `ghcr`, `./scripts/update.sh` |
| [`features.md`](features.md) | Feature-Backlog (offen) |
| [`feature-f41-portfolio-snapshot.md`](feature-f41-portfolio-snapshot.md) | F-41 Spezifikation: Täglicher Vermögens-Snapshot |
| [`feature-f43-household-month-routine.md`](feature-f43-household-month-routine.md) | F-43 Spezifikation: Monatsroutine + Partner-Status |
| [`aenderungen.md`](aenderungen.md) | Änderungs-Backlog (offen) |
| [`bugs.md`](bugs.md) | Bug-Backlog (offen) |
| [`archive.md`](archive.md) | Archiv erledigter Backlog-Einträge |
| [`changelog.md`](changelog.md) | Änderungslog |
