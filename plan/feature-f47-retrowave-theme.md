# F-47 — Retrowave theme

| | |
|---|---|
| **Bereich** | App / UI |
| **Status** | ✅ erledigt 2026-06-04 |
| **Aufwand** | mittel |
| **Abhängigkeiten** | bestehendes Theme-System (`next-themes`, shadcn CSS variables) |

## Ziel

Neben **Light** und **Dark** ein drittes, bewusst gestaltetes **Retrowave / Synthwave**-Erscheinungsbild — keine Bank-App-Optik, sondern 80er-Neon-Ästhetik bei gleicher Lesbarkeit für Finanzdaten.

## Ist-Zustand

- [`src/app/layout.tsx`](../src/app/layout.tsx): `ThemeProvider` mit `attribute="class"`, `defaultTheme="system"`, `enableSystem`
- [`src/app/globals.css`](../src/app/globals.css): CSS-Variablen in `:root` (light) und `.dark`
- [`src/components/layout/ThemeToggle.tsx`](../src/components/layout/ThemeToggle.tsx): binärer Wechsel light ↔ dark (Sun/Moon)
- Charts, Sidebar, shadcn-Komponenten nutzen überwiegend semantische Tokens (`background`, `primary`, `chart-1` …)

## Design-Richtung (Retrowave)

| Token | Richtung (oklch / HSL) |
|---|---|
| **Background** | Sehr dunkles Violett/Schwarz (`~oklch(0.12 0.04 300)`) |
| **Foreground** | Helles Lavendel-Weiß |
| **Primary / Accent** | Neon-Magenta + Cyan (z. B. primary magenta, accent cyan) |
| **Cards** | Etwas heller als BG, leichter Glow-Border (`border` mit Magenta/Cyan bei 20–40 % Alpha) |
| **Destructive / Success** | Rot/Grün bleiben erkennbar, aber gesättigter (nicht grau) |
| **Charts `chart-1`…`5`** | Neon-Palette (magenta, cyan, yellow, purple, green) — Recharts-Legenden lesbar halten |
| **Sidebar** | Dunkler mit Neon-Highlight auf aktivem Nav-Item |

**Optional (Phase 2 innerhalb F-47):**

- Dezentes **Horizon-Grid** oder Scanlines nur auf `body`/Hintergrund (`::before`, `pointer-events: none`)
- Display-Font nur für Überschriften (z. B. Orbitron), Body weiter System/Sans — Performance und i18n beachten

**Nicht im Scope:**

- Animierter CRT-Flicker, laute Partikel, Sound
- Pro-Widget-eigene Themes
- Screenshots/README-Update (erst nach Umsetzung)

## Technische Umsetzung (Vorschlag)

### 1. CSS-Theme-Klasse

In `globals.css` Block `.retrowave { … }` mit vollständigem Set der shadcn-Variablen (analog `.dark`), plus:

```css
@custom-variant retrowave (&:is(.retrowave *));
```

Tailwind v4: Variant prüfen, ob `dark:`-Utilities parallel `retrowave:` brauchen oder ob semantische Tokens reichen.

### 2. next-themes

```tsx
<ThemeProvider
  attribute="class"
  defaultTheme="system"
  enableSystem
  themes={["light", "dark", "retrowave"]}
/>
```

Persistenz: localStorage wie bei light/dark (`theme` key).

### 3. Theme-Auswahl UI

`ThemeToggle` ersetzen oder erweitern:

| Option | UX |
|---|---|
| **A (empfohlen)** | Dropdown/Radio in **Settings** + kompakter Zyklus-Button in Sidebar/Mobile (light → dark → retrowave → …) |
| **B** | Nur Settings (weniger Klicks in der Shell) |

i18n: `theme.light`, `theme.dark`, `theme.retrowave`, `settings.appearance` (en/de).

**System-Theme:** Bei `system` weiter nur light/dark aus OS — Retrowave nur explizit wählbar (kein Auto-Match nötig).

### 4. Komponenten-Audit

- Stellen mit **hartem** `dark:` ohne semantische Farbe (Charts, Badges, TR-Import, Status-Farben) durchgehen
- [`sonner.tsx`](../src/components/ui/sonner.tsx): `useTheme()` — Toasts an `retrowave` anbinden
- Recharts: keine festen `#fff`-Achsen; Tooltip/Grid aus CSS-Variablen oder Theme-Hook

### 5. Tests

- Vitest: Theme-Liste / Settings-Schema (falls Zod)
- Manuell: Dashboard-Widgets, Investments-Charts, Settings, Login, Mobile-Sidebar

## Akzeptanzkriterien

- [x] Nutzer kann **Light**, **Dark** und **Retrowave** wählen; Auswahl bleibt nach Reload erhalten
- [x] Alle Haupt-Routen (Dashboard, Investments, Dividenden, Haushaltskasse, Settings, Auth) sind lesbar (Kontrast WCAG ~AA für Fließtext anstreben)
- [x] Charts und KPI-Farben (grün/rot G/V) bleiben unterscheidbar
- [x] Kein Regression bei Light/Dark und `system`
- [x] i18n en/de für Theme-Labels

## Reihenfolge / Aufwandsschätzung

1. CSS-Variablen `.retrowave` + Provider `themes` (~0,5 d)
2. Settings + Toggle UX + i18n (~0,5 d)
3. Audit harter Farben + Charts/Toasts (~1 d)
4. Optional Grid/Glow (~0,5 d)

**Gesamt:** ~2–2,5 Tage

## V2 Redesign (2026-06-04)

Ersetzt die erste Retrowave-Optik app-weit (kein separates Preview-Theme):

| Element | Umsetzung |
|---|---|
| **Sternschnuppen** | [`src/components/theme/RetrowaveAmbience.tsx`](../src/components/theme/RetrowaveAmbience.tsx) — Canvas, nur bei `resolvedTheme === "retrowave"`; ~100 Sterne, max. 2 Meteors; pausiert bei `visibilityState === "hidden"` |
| **Reduced motion** | `prefers-reduced-motion: reduce` → nur statisches Sternfeld, keine Meteors |
| **Layering** | `body::before` Grid `z-index: -2`; Canvas `fixed z-0`; App-Inhalt `relative z-10` in [`layout.tsx`](../src/app/layout.tsx) |
| **Tokens** | Tieferes Space-Violet, höhere Chroma für Magenta/Cyan, glassige Cards (`--card` mit Alpha) |
| **UI-Glow** | `--retrowave-glow-magenta/cyan`; Card `backdrop-filter` + Neon-`box-shadow`; Sidebar/Header-Border-Overrides in `globals.css` |

Light/Dark unverändert.

## Verweise

- Backlog: [`features.md`](features.md) — F-47
- Architektur UI-Zeile: [`architecture.md`](architecture.md)
