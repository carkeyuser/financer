import { z } from "zod"

/** Yahoo-style ticker symbols (e.g. EUNL.DE, BTC-USD, ^GSPC). */
export const SECURITY_SYMBOL_REGEX = /^[A-Za-z0-9.\-=^]+$/
export const SECURITY_SYMBOL_MAX_LENGTH = 32

export const securitySymbolSchema = z
  .string()
  .trim()
  .min(1)
  .max(SECURITY_SYMBOL_MAX_LENGTH)
  .regex(SECURITY_SYMBOL_REGEX, "Ungültiges Symbol")

/** Search query — names, ISINs, tickers; no control characters. */
export const SECURITY_SEARCH_QUERY_REGEX = /^[\p{L}\p{N}\s.,\-+&()/]+$/u
export const SECURITY_SEARCH_QUERY_MAX_LENGTH = 64
export const SECURITY_SEARCH_QUERY_MIN_LENGTH = 2

export const securitySearchQuerySchema = z
  .string()
  .trim()
  .min(SECURITY_SEARCH_QUERY_MIN_LENGTH)
  .max(SECURITY_SEARCH_QUERY_MAX_LENGTH)
  .regex(SECURITY_SEARCH_QUERY_REGEX, "Ungültige Suchanfrage")

export function parseSecuritySymbolParam(
  raw: string | null | undefined
): { symbol: string } | { error: string } {
  const parsed = securitySymbolSchema.safeParse(raw ?? "")
  if (!parsed.success) {
    return { error: "Ungültiges Symbol" }
  }
  return { symbol: parsed.data }
}

export function parseSecuritySearchQueryParam(
  raw: string | null | undefined
): { q: string } | { error: string } | { empty: true } {
  const trimmed = raw?.trim() ?? ""
  if (/[\u0000-\u001f\u007f]/.test(trimmed)) {
    return { error: "Ungültige Suchanfrage" }
  }
  if (trimmed.length < SECURITY_SEARCH_QUERY_MIN_LENGTH) {
    return { empty: true }
  }
  const parsed = securitySearchQuerySchema.safeParse(trimmed)
  if (!parsed.success) {
    return { error: "Ungültige Suchanfrage" }
  }
  return { q: parsed.data }
}
