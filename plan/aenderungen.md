# Änderungen

Änderungs-Backlog des Projekts. Architektur, Projektstand und Querverweise starten in [`README.md`](README.md).

Aktuell offen: *keine*.
Erledigt: **Ä-10** ESLint für Next.js 16 (2026-06-04), **Ä-12** TR-Import Dividenden-Vorschau (2026-06-03), **Ä-13** TR-Import Datumsfilter (2026-06-03).
Erledigte Änderungswünsche stehen im [`archive.md`](archive.md).

| # | Bereich | Beschreibung | Status |
|---|---|---|---|
| Ä-12 | Investments | **TR-Import — Dividenden in der Vorschau:** Im Import-Wizard (vor Apply) alle aus der CSV erkannten Dividenden-Zeilen in einer eigenen Ansicht/Tabelle anzeigen (Datum, ISIN/Produkt, Brutto/Netto, Steuer, Zuordnung zur Position). Gleiche Auswahl-Logik wie beim Auswahl-Step für Trades (Checkbox pro Zeile, Schnellauswahl). Nutzer kann prüfen und abwählen, bevor `DividendPayment` angelegt wird. | ✅ erledigt 2026-06-03 |
| Ä-13 | Investments | **TR-Import — Zeitraum per Häkchen:** Im Wizard Datumsfilter „Importieren von … bis …“ (Datepicker oder Monatsbereich). Nur CSV-Zeilen im gewählten Zeitraum sind standardmäßig angehakt; außerhalb liegende Zeilen sichtbar aber abgewählt (oder ausgeblendet mit Toggle „Außerhalb anzeigen“). Filter wirkt auf Trades und Dividenden konsistent; Zusammenspiel mit bestehendem Auswahl-Step und `import_new`-Skip. | ✅ erledigt 2026-06-03 |
