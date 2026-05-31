export type Locale = "de" | "en"

export const DEFAULT_LOCALE: Locale = "de"

export const LOCALES: Locale[] = ["de", "en"]

export function isLocale(value: string): value is Locale {
  return value === "de" || value === "en"
}

export function intlLocale(locale: Locale): string {
  return locale === "en" ? "en-US" : "de-DE"
}
