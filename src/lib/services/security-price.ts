import type { Prisma } from "@/generated/prisma"
import { getEurRate } from "@/lib/utils/currency"

export interface SecurityPriceQuote {
  price: number | null
  currency: string | null
  priceEur: number | null
  eurRate: number | null
  name: string | null
}

export async function fetchSecurityPriceFromYahoo(symbol: string): Promise<SecurityPriceQuote> {
  const empty: SecurityPriceQuote = {
    price: null,
    currency: null,
    priceEur: null,
    eurRate: null,
    name: null,
  }

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
        Referer: "https://finance.yahoo.com",
      },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) return empty

    const data = await res.json()
    const meta = data?.chart?.result?.[0]?.meta

    if (!meta) return empty

    const price = meta.regularMarketPrice ?? meta.previousClose ?? null
    const currency = meta.currency ?? null
    let eurRate: number | null = null
    if (currency) {
      try {
        eurRate = await getEurRate(currency)
      } catch {
        eurRate = null
      }
    }
    const priceEur = price != null && eurRate != null ? price * eurRate : null

    return {
      price,
      currency,
      priceEur,
      eurRate,
      name: meta.shortName ?? meta.longName ?? null,
    }
  } catch {
    return empty
  }
}

/** Price to store in DB — matches AssetDetailContent.handleRefreshPrice. */
export function resolveStoredPrice(
  assetCurrency: string,
  quote: Pick<SecurityPriceQuote, "price" | "priceEur" | "eurRate">
): number | null {
  const nativePrice = quote.price
  if (nativePrice == null) return null

  if (assetCurrency === "EUR") {
    if (quote.priceEur != null) return quote.priceEur
    if (quote.eurRate != null) return nativePrice * quote.eurRate
    return null
  }
  return nativePrice
}

export async function upsertTodayPriceUpdate(
  tx: Prisma.TransactionClient,
  assetId: string,
  price: number,
  entryDate: Date = new Date()
): Promise<void> {
  const dayStart = new Date(entryDate)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(entryDate)
  dayEnd.setHours(23, 59, 59, 999)

  const existing = await tx.assetEntry.findFirst({
    where: { assetId, type: "PRICE_UPDATE", date: { gte: dayStart, lte: dayEnd } },
  })

  if (existing) {
    await tx.assetEntry.update({
      where: { id: existing.id },
      data: { price: price.toString() },
    })
  } else {
    await tx.assetEntry.create({
      data: {
        assetId,
        type: "PRICE_UPDATE",
        price: price.toString(),
        quantity: null,
        date: entryDate,
      },
    })
  }
}
