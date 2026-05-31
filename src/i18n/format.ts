import type { Locale } from "./locales"
import { intlLocale } from "./locales"
import { de, enUS } from "date-fns/locale"
import type { Locale as DateFnsLocale } from "date-fns"

export function formatMoney(amount: number | string, locale: Locale, currency = "EUR"): string {
  const value = typeof amount === "string" ? parseFloat(amount) : amount
  if (Number.isNaN(value)) return "–"
  return new Intl.NumberFormat(intlLocale(locale), { style: "currency", currency }).format(value)
}

export function formatNumber(value: number, locale: Locale, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(intlLocale(locale), options).format(value)
}

export function formatPercent(value: number, locale: Locale, digits = 1): string {
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "percent",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value / 100)
}

export function formatDate(date: string | Date, locale: Locale): string {
  const d = new Date(date)
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d)
}

export function formatDateLong(date: string | Date, locale: Locale): string {
  const d = new Date(date)
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d)
}

export function formatMonthYear(date: string | Date, locale: Locale): string {
  const d = new Date(date)
  return new Intl.DateTimeFormat(intlLocale(locale), { month: "long", year: "numeric" }).format(d)
}

export function getDateFnsLocale(locale: Locale): DateFnsLocale {
  return locale === "en" ? enUS : de
}

export function compareLocale(a: string, b: string, locale: Locale): number {
  return a.localeCompare(b, locale === "en" ? "en" : "de")
}
