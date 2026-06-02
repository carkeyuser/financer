export type ReleaseNotes = {
  version: string
  date: string
  highlights: { de: string[]; en: string[] }
}

export const RELEASES_URL = "https://github.com/carkeyuser/financer/releases"

export const RELEASE_NOTES: ReleaseNotes[] = [
  {
    version: "0.1.0",
    date: "2026-06-02",
    highlights: {
      de: [
        "Neuer Tab „Einkommen“ (/einkommen): persönliche Gehalts-Historie — nur für dich sichtbar",
        "Pro Monat: Brutto, Netto, Monatsbonus; Sonderzahlungen (z. B. Weihnachtsgeld) mit Datum und Bezeichnung",
        "Jahresvergleich: Brutto, Netto und Boni der letzten Jahre nebeneinander",
        "Optional: Netto in die Haushaltskasse übernehmen (nur deine Einnahme-Zeile)",
      ],
      en: [
        "New “Income” tab (/einkommen): personal salary history — visible only to you",
        "Per month: gross, net, monthly bonus; extra payments (e.g. holiday bonus) with date and label",
        "Year comparison: gross, net, and bonuses side by side for recent years",
        "Optional: apply net salary to household finance (your income row only)",
      ],
    },
  },
  {
    version: "0.0.10",
    date: "2026-06-01",
    highlights: {
      de: [
        "i18n: API-Validierung und Zod-Fehlermeldungen folgen der Nutzer-Sprache (de/en)",
        "i18n: Erweiterte Übersetzung von API-Fehlern (FX, TR-Import, Interest-Position u. a.)",
        "i18n: HTML lang aus Session; Dialog/Sheet-Schließen übersetzt",
        "Tests: automatische Key-Parität zwischen de.ts und en.ts",
      ],
      en: [
        "i18n: API validation and Zod messages follow the user locale (de/en)",
        "i18n: More API errors translated (FX, TR import, interest position, etc.)",
        "i18n: HTML lang from session; translated close label on dialogs/sheets",
        "Tests: automatic key parity check between de.ts and en.ts",
      ],
    },
  },
  {
    version: "0.0.9",
    date: "2026-06-01",
    highlights: {
      de: [
        "Positionen zusammenführen: Duplikate erkennen und per Wizard zu einer Position mergen",
        "TR-Import: Depot leeren — alle Positionen eines Kontos vor Neuimport löschen",
        "TR-Import: Auswahl-Step mit Checkboxen und Schnellauswahl vor dem Import",
        "Tenant-Benutzer löschen: Owner/Admin können angelegte Tenant-User entfernen",
        "Merge-Wizard UX: durchsuchbare Auswahl, leere Positionen ausblenden, breiterer Dialog",
      ],
      en: [
        "Merge positions: detect duplicates and combine into one position via wizard",
        "TR import: clear depot — delete all positions for an account before re-import",
        "TR import: selection step with checkboxes and quick filters before apply",
        "Delete tenant users: owner/admin can remove provisioned tenant accounts",
        "Merge wizard UX: searchable picker, hide empty positions, wider dialog",
      ],
    },
  },
  {
    version: "0.0.8",
    date: "2026-05-31",
    highlights: {
      de: [
        "Trade-Republic-Import: CSV hochladen, 7-Schritte-Wizard mit Vorschau und Konflikt-Lösung",
        "Ticker-Abgleich: Portfolio-Ticker vor Yahoo, manuelle Zuweisung bei unbekannten ISINs",
        "Keine Doppelbuchungen — Hard-/Soft-Dedup über Order-ID und Abgleich mit manuellen Einträgen",
      ],
      en: [
        "Trade Republic import: upload CSV, 7-step wizard with preview and conflict resolution",
        "Ticker reconciliation: portfolio ticker before Yahoo, manual mapping for unknown ISINs",
        "No duplicate entries — hard/soft dedup via order ID and match against manual bookings",
      ],
    },
  },
  {
    version: "0.0.7",
    date: "2026-05-31",
    highlights: {
      de: [
        "Release-Notes im Update-Dialog pro Version ein- und ausklappbar",
        "Standardmäßig nur die neueste Version geöffnet — ältere Releases auf Klick",
      ],
      en: [
        "Release notes in the update dialog can be expanded or collapsed per version",
        "Only the latest version is open by default — older releases on click",
      ],
    },
  },
  {
    version: "0.0.6",
    date: "2026-05-31",
    highlights: {
      de: [
        "Schnellere Docker-Builds auf dem Server (deutlich kleineres Runtime-Image)",
        "Nur Prisma-CLI im Container statt vollem node_modules — kürzeres Exportieren der Image-Layer",
        "BuildKit-Cache für npm und Next.js; .dockerignore und gezielter Builder-COPY",
      ],
      en: [
        "Faster Docker builds on the server (much smaller runtime image)",
        "Prisma CLI only in the container instead of full node_modules — shorter image layer export",
        "BuildKit cache for npm and Next.js; .dockerignore and selective builder COPY",
      ],
    },
  },
  {
    version: "0.0.5",
    date: "2026-05-31",
    highlights: {
      de: [
        "Release-Notes-Button in der Sidebar und im Mobile-Menü über Abmelden",
        "Öffnet den bestehenden Update-Dialog mit kuratierten Release-Notes (de/en)",
        "Link zu allen Releases auf GitHub im Dialog-Footer",
      ],
      en: [
        "Release notes button in the sidebar and mobile menu above Sign out",
        "Opens the existing update dialog with curated release notes (de/en)",
        "Link to all GitHub releases in the dialog footer",
      ],
    },
  },
  {
    version: "0.0.4",
    date: "2026-05-31",
    highlights: {
      de: [
        "Bankzinsen als Dividenden-Position „Interest“ — ohne Investment anlegen",
        "Interest wird pro User automatisch bereitgestellt, nur im Dividenden-Tab sichtbar",
        "Vereinfachter Dialog: Betrag plus optional Datum, Brutto und Steuer",
      ],
      en: [
        "Bank interest as dividend position “Interest” — no investment required",
        "Interest is auto-provisioned per user and only visible on the Dividends tab",
        "Simplified dialog: amount plus optional date, gross, and tax",
      ],
    },
  },
  {
    version: "0.0.3",
    date: "2026-05-31",
    highlights: {
      de: [
        "Auto-Deploy entfernt — kein Self-hosted GitHub Actions Runner mehr nötig",
        "CI prüft nur noch Tests und Production-Build (GitHub-hosted)",
        "Deploy manuell: git pull + docker compose, .\\push -Deploy oder scripts/deploy.sh",
        "Deploy-Doku in plan/setup.md vereinfacht",
      ],
      en: [
        "Auto-deploy removed — no self-hosted GitHub Actions runner required",
        "CI only runs tests and production build (GitHub-hosted)",
        "Manual deploy: git pull + docker compose, .\\push -Deploy, or scripts/deploy.sh",
        "Deploy docs in plan/setup.md simplified",
      ],
    },
  },
  {
    version: "0.0.2",
    date: "2026-05-31",
    highlights: {
      de: [
        "Update-Dialog: Nach Deploy einmalig Release-Notes (de/en), auch manuell in Einstellungen",
        "README-Vorschau mit Dashboard-Screenshots (Light/Dark)",
      ],
      en: [
        "Update dialog: one-time release notes (de/en) after deploy, also in Settings",
        "README preview with dashboard screenshots (light/dark)",
      ],
    },
  },
  {
    version: "0.0.1",
    date: "2026-05-31",
    highlights: {
      de: [
        "Investments: Portfolio-Tracking mit Yahoo-Kursen, VWAP und historischen Charts",
        "Haushaltskasse mit Fixkosten, Einnahmen, Auszahlungen und Simulation",
        "Dashboard mit konfigurierbarem Widget-Grid (Drag & Drop)",
        "Manuelle Dividenden-Buchungen",
        "Multi-User mit Rollen, Einladungen und Haushaltswechsel",
        "Optional 2FA (TOTP) und JSON-Backup/Restore",
        "Deutsch und Englisch, responsive Mobile-Ansicht",
        "Login-Snapshot mit unrealisiertem G/V nach Anmeldung",
      ],
      en: [
        "Investments: portfolio tracking with Yahoo prices, VWAP, and historical charts",
        "Household finance with fixed costs, income, payouts, and simulations",
        "Dashboard with configurable widget grid (drag & drop)",
        "Manual dividend booking",
        "Multi-user with roles, invites, and household switcher",
        "Optional 2FA (TOTP) and JSON backup/restore",
        "German and English, responsive mobile layout",
        "Login snapshot with unrealized P/L after sign-in",
      ],
    },
  },
]

export function compareVersions(a: string, b: string): number {
  const parse = (version: string) => version.split(".").map((part) => Number.parseInt(part, 10) || 0)
  const left = parse(a)
  const right = parse(b)
  const length = Math.max(left.length, right.length)

  for (let i = 0; i < length; i += 1) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0)
    if (diff !== 0) return diff
  }

  return 0
}

export function getReleaseNotesForVersion(version: string): ReleaseNotes | undefined {
  return RELEASE_NOTES.find((entry) => entry.version === version)
}

export function getUnseenReleaseNotes(
  lastSeen: string | null,
  current: string
): ReleaseNotes[] {
  if (!lastSeen) return []

  return RELEASE_NOTES.filter(
    (entry) =>
      compareVersions(entry.version, lastSeen) > 0 &&
      compareVersions(entry.version, current) <= 0
  ).sort((a, b) => compareVersions(b.version, a.version))
}

export function getReleaseNotesUpTo(current: string): ReleaseNotes[] {
  return RELEASE_NOTES.filter((entry) => compareVersions(entry.version, current) <= 0).sort(
    (a, b) => compareVersions(b.version, a.version)
  )
}
