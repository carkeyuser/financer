# Änderungen

Änderungs-Backlog des Projekts. Architektur, Projektstand und Querverweise starten in [`README.md`](README.md).

Aktuell offen: **Ä-10**, **Ä-12**, **Ä-13**.
Erledigte Änderungswünsche stehen im [`archive.md`](archive.md).

| # | Bereich | Beschreibung | Status |
|---|---|---|---|
| Ä-10 | DevOps | **Lint-Script für Next.js 16 aktualisieren:** `npm run lint` ruft aktuell `next lint` auf und schlägt mit `Invalid project directory ... \lint` fehl. Auf einen kompatiblen ESLint-Workflow umstellen. | 🟨 offen |
| Ä-12 | Investments | **TR-Import — Dividenden in der Vorschau:** Im Import-Wizard (vor Apply) alle aus der CSV erkannten Dividenden-Zeilen in einer eigenen Ansicht/Tabelle anzeigen (Datum, ISIN/Produkt, Brutto/Netto, Steuer, Zuordnung zur Position). Gleiche Auswahl-Logik wie beim Auswahl-Step für Trades (Checkbox pro Zeile, Schnellauswahl). Nutzer kann prüfen und abwählen, bevor `DividendPayment` angelegt wird. | 🟨 offen |
| Ä-13 | Investments | **TR-Import — Zeitraum per Häkchen:** Im Wizard Datumsfilter „Importieren von … bis …“ (Datepicker oder Monatsbereich). Nur CSV-Zeilen im gewählten Zeitraum sind standardmäßig angehakt; außerhalb liegende Zeilen sichtbar aber abgewählt (oder ausgeblendet mit Toggle „Außerhalb anzeigen“). Filter wirkt auf Trades und Dividenden konsistent; Zusammenspiel mit bestehendem Auswahl-Step und `import_new`-Skip. | 🟨 offen |
