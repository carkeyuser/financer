import type { AssetType } from "@/generated/prisma"
import { searchSecurities, type SecuritySearchResult } from "@/lib/services/security-search"

export interface ResolvedSecurity {
  symbol: string
  name: string
  type: AssetType
  currency: string
}

const isinCache = new Map<string, ResolvedSecurity | null>()

export const DEFAULT_ISIN_RESOLVE_CONCURRENCY = 2
const RESOLVE_MAX_ATTEMPTS = 3
const RESOLVE_RETRY_BASE_MS = 400

export function clearIsinCache() {
  isinCache.clear()
}

function resolveRetryDelayMs(attempt: number): number {
  return RESOLVE_RETRY_BASE_MS * 2 ** attempt
}

async function lookupIsin(key: string, productName?: string): Promise<ResolvedSecurity | null> {
  let results = await searchSecurities(key)
  if (results.length === 0 && productName) {
    results = await searchSecurities(productName)
  }
  return pickBestMatch(key, results)
}

export async function resolveIsin(isin: string, productName?: string): Promise<ResolvedSecurity | null> {
  const key = isin.trim().toUpperCase()
  if (isinCache.has(key)) return isinCache.get(key) ?? null

  let match: ResolvedSecurity | null = null
  for (let attempt = 0; attempt < RESOLVE_MAX_ATTEMPTS; attempt++) {
    match = await lookupIsin(key, productName)
    if (match !== null) break
    if (attempt < RESOLVE_MAX_ATTEMPTS - 1) {
      await new Promise((r) => setTimeout(r, resolveRetryDelayMs(attempt)))
    }
  }

  isinCache.set(key, match)
  return match
}

export async function resolveIsins(
  items: Array<{ isin: string; productName?: string }>,
  onProgress?: (current: number, total: number) => void,
  options?: { concurrency?: number }
): Promise<Map<string, ResolvedSecurity | null>> {
  const productByIsin = new Map<string, string | undefined>()
  for (const item of items) {
    const key = item.isin.trim().toUpperCase()
    if (!productByIsin.has(key)) productByIsin.set(key, item.productName)
  }

  const uniqueKeys = [...productByIsin.keys()]
  const map = new Map<string, ResolvedSecurity | null>()
  const total = uniqueKeys.length
  if (total === 0) return map

  let completed = 0
  let index = 0
  const concurrency = Math.min(options?.concurrency ?? DEFAULT_ISIN_RESOLVE_CONCURRENCY, total)

  async function worker() {
    while (index < uniqueKeys.length) {
      const i = index++
      const key = uniqueKeys[i]
      map.set(key, await resolveIsin(key, productByIsin.get(key)))
      completed++
      onProgress?.(completed, total)
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()))
  return map
}

function pickBestMatch(isin: string, results: SecuritySearchResult[]): ResolvedSecurity | null {
  if (results.length === 0) return null
  const preferred = results.find((r) => r.symbol.endsWith(".DE") || r.symbol.endsWith(".F"))
  const pick = preferred ?? results[0]
  return {
    symbol: pick.symbol,
    name: pick.name,
    type: pick.assetType as AssetType,
    currency: pick.symbol.endsWith("-USD") ? "USD" : "EUR",
  }
}
