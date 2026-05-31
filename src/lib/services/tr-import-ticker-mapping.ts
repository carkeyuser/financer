import type { AssetType } from "@/generated/prisma"
import type { ResolvedSecurity } from "@/lib/services/isin-resolver"
import type { TrParsedRow, TrTickerOverride } from "@/lib/services/tr-import-types"

export type TrTickerMappingSource = "portfolio" | "yahoo" | "unresolved"

export interface TrExistingAssetByIsin {
  isin: string
  ticker: string
  name: string
  type: AssetType
  currency: string
}

export interface TrTickerMapping {
  isin: string
  productName: string
  transactionCount: number
  source: TrTickerMappingSource
  suggestedTicker: TrTickerOverride | null
  portfolioTicker: TrTickerOverride | null
  yahooTicker: TrTickerOverride | null
  requiresManual: boolean
  hasTickerConflict: boolean
}

const PRODUCT_KEY_PREFIX = "__product__:"

/** Override key for tickerMappings / tickerOverrides — ISIN or synthetic product key (no ISIN, e.g. crypto). */
export function tickerOverrideKey(row: { isin: string | null; product: string }): string {
  if (row.isin) return row.isin.trim().toUpperCase()
  return `${PRODUCT_KEY_PREFIX}${normalizeProductKey(row.product)}`
}

export function isProductOnlyKey(key: string): boolean {
  return key.startsWith(PRODUCT_KEY_PREFIX)
}

function normalizeProductKey(product: string): string {
  return product.trim().toLowerCase().replace(/\s+/g, "_")
}

export function buildTickerMappings(
  parsed: TrParsedRow[],
  existingAssets: TrExistingAssetByIsin[],
  yahooResolutions: Map<string, ResolvedSecurity | null>
): TrTickerMapping[] {
  const portfolioByIsin = new Map<string, TrTickerOverride>()
  for (const asset of existingAssets) {
    const key = asset.isin.trim().toUpperCase()
    if (!portfolioByIsin.has(key)) {
      portfolioByIsin.set(key, {
        symbol: asset.ticker,
        name: asset.name,
        type: asset.type,
        currency: asset.currency,
      })
    }
  }

  const groupedByIsin = new Map<string, { productName: string; count: number }>()
  const groupedByProduct = new Map<string, { productName: string; count: number }>()
  for (const row of parsed) {
    if (row.eventType === "interest" || row.eventType === "ignored") continue
    if (row.isin) {
      const key = row.isin.toUpperCase()
      const current = groupedByIsin.get(key)
      if (current) {
        current.count++
      } else {
        groupedByIsin.set(key, { productName: row.product, count: 1 })
      }
    } else {
      const key = `${PRODUCT_KEY_PREFIX}${normalizeProductKey(row.product)}`
      const current = groupedByProduct.get(key)
      if (current) {
        current.count++
      } else {
        groupedByProduct.set(key, { productName: row.product, count: 1 })
      }
    }
  }

  const isinMappings = [...groupedByIsin.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([isin, meta]) => {
      const portfolioTicker = portfolioByIsin.get(isin) ?? null
      const yahooResolved = yahooResolutions.get(isin) ?? null
      const yahooTicker = yahooResolved
        ? {
            symbol: yahooResolved.symbol,
            name: yahooResolved.name,
            type: yahooResolved.type,
            currency: yahooResolved.currency,
          }
        : null

      const hasTickerConflict =
        !!portfolioTicker && !!yahooTicker && portfolioTicker.symbol !== yahooTicker.symbol

      let source: TrTickerMappingSource = "unresolved"
      let suggestedTicker: TrTickerOverride | null = null

      if (portfolioTicker) {
        source = "portfolio"
        suggestedTicker = portfolioTicker
      } else if (yahooTicker) {
        source = "yahoo"
        suggestedTicker = yahooTicker
      }

      return {
        isin,
        productName: meta.productName,
        transactionCount: meta.count,
        source,
        suggestedTicker,
        portfolioTicker,
        yahooTicker,
        requiresManual: !suggestedTicker,
        hasTickerConflict,
      }
    })

  const productMappings = [...groupedByProduct.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, meta]) => ({
      isin: key,
      productName: meta.productName,
      transactionCount: meta.count,
      source: "unresolved" as const,
      suggestedTicker: null,
      portfolioTicker: null,
      yahooTicker: null,
      requiresManual: true,
      hasTickerConflict: false,
    }))

  return [...isinMappings, ...productMappings]
}

/** Prefer portfolio match, then Yahoo — used for row classification. */
export function buildIsinResolutionMap(mappings: TrTickerMapping[]): Map<string, ResolvedSecurity | null> {
  const map = new Map<string, ResolvedSecurity | null>()
  for (const m of mappings) {
    if (m.suggestedTicker) {
      map.set(m.isin, {
        symbol: m.suggestedTicker.symbol,
        name: m.suggestedTicker.name,
        type: m.suggestedTicker.type,
        currency: m.suggestedTicker.currency,
      })
    } else {
      map.set(m.isin, null)
    }
  }
  return map
}

export function initialTickerOverrides(mappings: TrTickerMapping[]): Record<string, TrTickerOverride> {
  const overrides: Record<string, TrTickerOverride> = {}
  for (const m of mappings) {
    if (m.suggestedTicker) overrides[m.isin] = m.suggestedTicker
  }
  return overrides
}

export function countUnresolvedTickers(
  mappings: TrTickerMapping[],
  overrides: Record<string, TrTickerOverride>
): number {
  return mappings.filter((m) => !overrides[m.isin]?.symbol).length
}
