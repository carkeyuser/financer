import { excludeInterestTicker } from "@/lib/constants/interest-asset"
import { prisma } from "@/lib/prisma"
import {
  type CalcAsset,
  type CalcEntry,
  type PortfolioSummaryItem,
  computePortfolioSummary,
  getGainLossPercent,
  getTotalGainLoss,
} from "@/lib/utils/calculations"
import { getEurRate } from "@/lib/utils/currency"

export function toCalcEntries(
  entries: { id: string; type: string; price: { toString(): string }; quantity: { toString(): string } | null; date: Date }[]
): CalcEntry[] {
  return entries.map((e) => ({
    id: e.id,
    type: e.type as CalcEntry["type"],
    price: e.price.toString(),
    quantity: e.quantity?.toString() ?? null,
    date: e.date.toISOString(),
  }))
}

export async function loadHouseholdPortfolioItems(
  householdId: string,
  options?: { userId?: string }
): Promise<{ items: PortfolioSummaryItem[]; assets: Awaited<ReturnType<typeof loadHouseholdAssets>> }> {
  const assets = await loadHouseholdAssets(householdId, options)
  const currencies = [...new Set(assets.map((a) => a.currency))]
  const eurRates = Object.fromEntries(
    await Promise.all(currencies.map(async (c) => [c, await getEurRate(c)]))
  )

  const items: PortfolioSummaryItem[] = assets.map((a) => ({
    asset: { id: a.id, quantity: a.quantity.toString() },
    entries: toCalcEntries(a.entries),
    eurRate: eurRates[a.currency],
    type: a.type,
  }))

  return { items, assets }
}

export async function loadHouseholdAssets(householdId: string, options?: { userId?: string }) {
  return prisma.asset.findMany({
    where: {
      householdId,
      ticker: excludeInterestTicker,
      ...(options?.userId ? { userId: options.userId } : {}),
    },
    include: {
      entries: { orderBy: { date: "asc" } },
      user: { select: { id: true, name: true, username: true } },
    },
    orderBy: { order: "asc" },
  })
}

export function enrichAssetsForDisplay(
  assets: Awaited<ReturnType<typeof loadHouseholdAssets>>,
  eurRates: Record<string, number>
) {
  return assets.map((a) => {
    const entries = toCalcEntries(a.entries)
    const calcAsset: CalcAsset = { id: a.id, quantity: a.quantity.toString() }
    const eurRate = eurRates[a.currency] ?? 1
    return {
      id: a.id,
      name: a.name,
      ticker: a.ticker,
      gainLossPct: getGainLossPercent(calcAsset, entries),
      gainLossEur: getTotalGainLoss(calcAsset, entries) * eurRate,
      eurRate,
    }
  })
}

export async function computeHouseholdPortfolioSummary(householdId: string) {
  const { items } = await loadHouseholdPortfolioItems(householdId)
  return computePortfolioSummary(items)
}

export function startOfUtcDay(date: Date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

export function addUtcDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setUTCDate(d.getUTCDate() + days)
  return d
}
