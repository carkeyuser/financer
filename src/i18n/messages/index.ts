import { deMessages } from "./de"
import { enMessages } from "./en"
import type { Locale } from "../locales"

export const messages: Record<Locale, typeof deMessages> = {
  de: deMessages,
  en: enMessages,
}

export type { Messages, MessageTree } from "./de"

export function getMessages(locale: Locale) {
  return messages[locale]
}

export type MessageKey = string

function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split(".")
  let current: unknown = obj
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return typeof current === "string" ? current : undefined
}

export function createTranslator(locale: Locale) {
  const dict = messages[locale]
  return function t(key: MessageKey, params?: Record<string, string | number>): string {
    let text = getNestedValue(dict as unknown as Record<string, unknown>, key) ?? key
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v))
      }
    }
    return text
  }
}

export function monthName(locale: Locale, month: number): string {
  const key = month as keyof typeof deMessages.months
  return messages[locale].months[key] ?? String(month)
}

export function assetTypeLabel(locale: Locale, type: string): string {
  const types = messages[locale].enums.assetType as Record<string, string>
  return types[type] ?? type
}

export function assetTypePluralLabel(locale: Locale, type: string): string {
  const types = messages[locale].enums.assetTypePlural as Record<string, string>
  return types[type] ?? type
}

export function entryTypeLabel(locale: Locale, type: string): string {
  const types = messages[locale].enums.entryType as Record<string, string>
  return types[type] ?? type
}

export function entryTypeShortLabel(locale: Locale, type: string): string {
  const types = messages[locale].enums.entryTypeShort as Record<string, string>
  return types[type] ?? entryTypeLabel(locale, type)
}
