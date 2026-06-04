export const APP_THEMES = ["light", "dark", "retrowave"] as const

export type AppTheme = (typeof APP_THEMES)[number]

export function isAppTheme(value: string | undefined): value is AppTheme {
  return APP_THEMES.includes(value as AppTheme)
}

export function cycleTheme(current: string | undefined): AppTheme {
  const resolved = isAppTheme(current) ? current : "light"
  if (resolved === "light") return "dark"
  if (resolved === "dark") return "retrowave"
  return "light"
}

export function resolveSonnerTheme(
  theme: string | undefined
): "light" | "dark" | "system" {
  if (theme === "retrowave") return "dark"
  if (theme === "light" || theme === "dark" || theme === "system") return theme
  return "system"
}

export function themeLabelKey(theme: AppTheme): "theme.light" | "theme.dark" | "theme.retrowave" {
  if (theme === "dark") return "theme.dark"
  if (theme === "retrowave") return "theme.retrowave"
  return "theme.light"
}
