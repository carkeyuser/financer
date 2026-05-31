# Bugs

Bug-Backlog des Projekts. Architektur, Projektstand und Querverweise starten in [`README.md`](README.md).

Aktuell offen: **5** (Code-Review TR-Import Fortschritt/Sortierung, 2026-05-31).
Behobene Bugs stehen im [`archive.md`](archive.md).

| # | Prio | Bereich | Kurzbeschreibung | Status |
|---|---|---|---|---|
| B-28 | 🟢 Niedrig | TR-Import / Stream | Keine Runtime-Validierung von `complete.data` | offen |
| B-29 | 🟢 Niedrig | TR-Import / Stream | `JSON.parse` im NDJSON-Reader ohne try/catch | offen |
| B-30 | 🟢 Niedrig | TR-Import / UI | Toter Code: `useImportProgressReader` ungenutzt | offen |
| B-31 | 🟢 Niedrig | TR-Import / UI | Balken bei `current: 0` optisch leer | offen |
| B-32 | 🟡 Mittel | TR-Import / Tests | Fehlende Tests für NDJSON-Routes, `resolveIsins` parallel | offen |

---

## B-28 — Keine Validierung von Stream-Ergebnis 🟢

**Datei:** `src/lib/services/tr-import-progress.ts` → `readNdjsonStream`

`complete.data` wird per `as T` gecastet, ohne Zod/schema. Kaputte oder manipulierte Payloads können still falsche Typen erzeugen.

---

## B-29 — NDJSON parse ohne Fehlerbehandlung 🟢

**Datei:** `src/lib/services/tr-import-progress.ts`

`JSON.parse(line)` ohne try/catch — kaputte Zeile im Stream → unhandled Exception im Client.

---

## B-30 — Toter Code 🟢

**Datei:** `src/components/investments/tr-import/TrImportProgressPanel.tsx`

`useImportProgressReader` exportiert, nirgends importiert. Entfernen oder Wizard darauf umstellen.

---

## B-31 — Balken bei Phase-Start leer 🟢

**Datei:** `TrImportProgressPanel.tsx` / Wizard-Fallback `{ current: 0, total: 1 }`

Bei `current: 0` zeigt der Balken 0 % — wirkt wie „hängt“, obwohl die Phase läuft. Kosmetisch.

---

## B-32 — Fehlende Tests 🟡

Nach Code-Review TR-Import (Commit `47df4b2`) fehlen u. a.:

| Thema | Datei(en) | Status |
|---|---|---|
| Apply-Progress bei allen `continue`-Pfaden | `tr-import-apply.ts` | ✅ `tr-import-apply-progress.test.ts` |
| `tickerMappingNeedsAttention` nach Override bei Konflikt | `tr-import-sort.ts` | ✅ Test in `tr-import-sort.test.ts` |
| NDJSON Preview/Apply Route (Integration/Mock) | `preview/route.ts`, `apply/route.ts` | offen |
| `resolveIsins` parallel + `onProgress` | `isin-resolver.ts` | offen |
