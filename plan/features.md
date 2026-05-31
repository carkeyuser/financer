# Features

Feature-Backlog des Projekts. Architektur, Projektstand und Querverweise starten in [`README.md`](README.md).

Aktuell offen: **F-31**, **F-34**, **F-36**.
Erledigte Features stehen im [`archive.md`](archive.md).

| # | Bereich | Beschreibung | Status |
|---|---|---|---|
| F-31 | DevOps | **One-Click-Installation unter Docker:** Ein Skript (z. B. `install.sh` für Linux/macOS, optional `install.ps1` für Windows) das die komplette Erstinstallation abwickelt: Voraussetzungen prüfen (Docker + Compose), `.env` aus `.env.example` anlegen bzw. fehlende Secrets interaktiv abfragen (`NEXTAUTH_SECRET`, `DATABASE_URL`/Postgres-Passwort), `docker compose up -d --build` starten, auf DB-Health und App-Port warten, kurze Erfolgsmeldung mit URL. Ziel: frischer Server/LXC ohne manuelle Schritte aus README. Bestehendes `docker-compose.yml` unverändert nutzen; `push.ps1` bleibt Update-Pfad für Entwickler. | 🟨 offen |
| F-34 | Dashboard | **Marktkalender-Abdeckung erweitern:** Nasdaq liefert primär US-Symbole ohne Suffix (`.DE`, Krypto, Forex werden ignoriert). Self-hosted-Robustheit (Limits, `MARKET_CALENDAR_EXTERNAL`) ist umgesetzt (2026-05-27). Offen: alternative Quelle für DE/ETF, manuelle Termine oder Anbindung an Dividenden-Tab. | 🟨 offen |
| F-36 | Multi-Tenant / Benutzer | **Mandantenfähige User-Verwaltung und Investment-Isolation:** User können einem **eigenen Haushalt (Tenant)** zugeordnet werden — auch wenn sie nicht im Haushalt des anlegenden Admins liegen. Daten strikt tenant-basiert: Ein User sieht nur Daten des **aktiven Haushalts** aus der Session (`householdId`), nie fremde Haushalte. Im Investments-Bereich zusätzlich **nur die eigenen Positionen** (`userId`), nicht das gesamte Portfolio aller Haushaltsmitglieder (aktuell liefert `GET /api/assets` alle Assets des Haushalts). User-Anlage, Haushaltswechsel und API-Routen müssen diese Grenzen durchgängig durchsetzen; `householdId` weiterhin nie aus dem Request-Body, sondern aus JWT. | 🟨 offen |
