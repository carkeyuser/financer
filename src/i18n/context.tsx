"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { useSession } from "next-auth/react"
import { DEFAULT_LOCALE, isLocale, type Locale } from "./locales"
import { createTranslator, type MessageKey } from "./messages"
import * as formatFns from "./format"
import { mapApiError, translateApiError } from "./api-errors"

interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: MessageKey, params?: Record<string, string | number>) => string
  formatMoney: (amount: number | string, currency?: string) => string
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string
  formatPercent: (value: number, digits?: number) => string
  formatDate: (date: string | Date) => string
  formatDateLong: (date: string | Date) => string
  formatMonthYear: (date: string | Date) => string
  getDateFnsLocale: () => ReturnType<typeof formatFns.getDateFnsLocale>
  compareLocale: (a: string, b: string) => number
  mapApiError: (message: string) => string
  translateApiError: (error: unknown) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession()
  const sessionLocale = session?.user?.locale
  const [locale, setLocaleState] = useState<Locale>(
    sessionLocale && isLocale(sessionLocale) ? sessionLocale : DEFAULT_LOCALE
  )

  useEffect(() => {
    if (sessionLocale && isLocale(sessionLocale)) {
      setLocaleState(sessionLocale)
    }
  }, [sessionLocale])

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const setLocale = (next: Locale) => setLocaleState(next)

  const value = useMemo<I18nContextValue>(() => {
    const t = createTranslator(locale)
    return {
      locale,
      setLocale,
      t,
      formatMoney: (amount, currency) => formatFns.formatMoney(amount, locale, currency),
      formatNumber: (value, options) => formatFns.formatNumber(value, locale, options),
      formatPercent: (value, digits) => formatFns.formatPercent(value, locale, digits),
      formatDate: (date) => formatFns.formatDate(date, locale),
      formatDateLong: (date) => formatFns.formatDateLong(date, locale),
      formatMonthYear: (date) => formatFns.formatMonthYear(date, locale),
      getDateFnsLocale: () => formatFns.getDateFnsLocale(locale),
      compareLocale: (a, b) => formatFns.compareLocale(a, b, locale),
      mapApiError: (message) => mapApiError(message, locale),
      translateApiError: (error) => translateApiError(error, locale),
    }
  }, [locale])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error("useI18n must be used within I18nProvider")
  return ctx
}

export function useTranslations(namespace?: string) {
  const { t, ...rest } = useI18n()
  return {
    ...rest,
    t: (key: string, params?: Record<string, string | number>) =>
      t(namespace ? `${namespace}.${key}` : key, params),
  }
}
