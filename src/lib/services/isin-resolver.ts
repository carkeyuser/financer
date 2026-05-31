import type { AssetType } from "@/generated/prisma"
import { searchSecurities, type SecuritySearchResult } from "@/lib/services/security-search"

export interface ResolvedSecurity {
  symbol: string
  name: string
  type: AssetType
  currency: string
}

const isinCache = new Map<string, ResolvedSecurity | null>()

export function clearIsinCache() {
  isinCache.clear()
}

export async function resolveIsin(isin: string, productName?: string): Promise<ResolvedSecurity | null> {
  const key = isin.trim().toUpperCase()
  if (isinCache.has(key)) return isinCache.get(key) ?? null

  let results = await searchSecurities(key)
  if (results.length === 0 && productName) {
    results = await searchSecurities(productName)
  }

  const match = pickBestMatch(key, results)
  isinCache.set(key, match)
  return match
}

export async function resolveIsins(
  items: Array<{ isin: string; productName?: string }>
): Promise<Map<string, ResolvedSecurity | null>> {
  const map = new Map<string, ResolvedSecurity | null>()
  for (const item of items) {
    const key = item.isin.trim().toUpperCase()
    if (!map.has(key)) {
      map.set(key, await resolveIsin(key, item.productName))
    }
  }
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
