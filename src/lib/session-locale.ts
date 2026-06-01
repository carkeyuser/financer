import type { Session } from "next-auth"
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/i18n/locales"

/** Resolves the user's locale from session, falling back to default. */
export function sessionLocale(session: Session | null | undefined): Locale {
  const raw = session?.user?.locale
  return raw && isLocale(raw) ? raw : DEFAULT_LOCALE
}
