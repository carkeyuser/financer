# Features

Feature-Backlog des Projekts. Architektur, Projektstand und Querverweise starten in [`README.md`](README.md).

Aktuell offen: **F-31**, **F-34**, **F-35**.
Erledigte Features stehen im [`archive.md`](archive.md).

| # | Bereich | Beschreibung | Status |
|---|---|---|---|
| F-31 | DevOps | **One-Click-Installation unter Docker:** Ein Skript (z. B. `install.sh` für Linux/macOS, optional `install.ps1` für Windows) das die komplette Erstinstallation abwickelt: Voraussetzungen prüfen (Docker + Compose), `.env` aus `.env.example` anlegen bzw. fehlende Secrets interaktiv abfragen (`NEXTAUTH_SECRET`, `DATABASE_URL`/Postgres-Passwort), `docker compose up -d --build` starten, auf DB-Health und App-Port warten, kurze Erfolgsmeldung mit URL. Ziel: frischer Server/LXC ohne manuelle Schritte aus README. Bestehendes `docker-compose.yml` unverändert nutzen; `push.ps1` bleibt Update-Pfad für Entwickler. | 🟨 offen |
| F-34 | Dashboard | **Marktkalender-Abdeckung erweitern:** Nasdaq liefert primär US-Symbole ohne Suffix (`.DE`, Krypto, Forex werden ignoriert). Self-hosted-Robustheit (Limits, `MARKET_CALENDAR_EXTERNAL`) ist umgesetzt (2026-05-27). Offen: alternative Quelle für DE/ETF, manuelle Termine oder Anbindung an Dividenden-Tab. | 🟨 offen |
| F-35 | Dividenden | **Bankzinsen als Dividenden-Position erfassen:** Im Dividendenbereich soll eine einfache Position namens `Interest` erfassbar sein, um Bankzinsen zu buchen, die auf Guthaben bei einer Bank gezahlt werden. Ziel: Zinserträge wie Dividenden im bestehenden manuellen Dividenden-Flow dokumentieren können, ohne dafür ein echtes Wertpapier anzulegen. | 🟨 offen |
