export type ReleaseNotes = {
  version: string
  date: string
  highlights: { de: string[]; en: string[] }
}

export const RELEASES_URL = "https://github.com/carkeyuser/financer/releases"

export const RELEASE_NOTES: ReleaseNotes[] = [
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
