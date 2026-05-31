import { format, startOfMonth, endOfMonth } from "date-fns"
import type { Locale } from "@/i18n/locales"
import { getDateFnsLocale } from "@/i18n/format"

export function formatDate(date: string | Date, locale: Locale = "de"): string {
  return format(new Date(date), "dd.MM.yyyy", { locale: getDateFnsLocale(locale) })
}

export function toDateInputValue(date: string | Date): string {
  return format(new Date(date), "yyyy-MM-dd")
}

export function currentMonthRange(): { from: Date; to: Date } {
  const now = new Date()
  return { from: startOfMonth(now), to: endOfMonth(now) }
}
