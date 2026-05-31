export interface CalcEntry {
  id: string
  type: "PURCHASE" | "SALE" | "PRICE_UPDATE" | "QUANTITY_UPDATE" | "VWAP_UPDATE"
  price: string
  quantity: string | null
  date: string
}

export interface CalcAsset {
  id: string
  quantity: string
}

export function getVWAP(entries: CalcEntry[]): number {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))
  let cost = 0
  let qty = 0
  for (const e of sorted) {
    if (e.type === "PURCHASE" && e.quantity) {
      cost += parseFloat(e.price) * parseFloat(e.quantity)
      qty += parseFloat(e.quantity)
    } else if (e.type === "VWAP_UPDATE" && e.quantity) {
      // Absolute Kostenbasis-Überschreibung
      cost = parseFloat(e.price) * parseFloat(e.quantity)
      qty = parseFloat(e.quantity)
    }
  }
  return qty === 0 ? 0 : cost / qty
}

export function getCurrentPrice(entries: CalcEntry[]): number {
  const latest = entries
    .filter((e) => e.type === "PRICE_UPDATE" || e.type === "PURCHASE")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
  return latest ? parseFloat(latest.price) : 0
}

export function getCurrentValue(asset: CalcAsset, entries: CalcEntry[]): number {
  return getCurrentPrice(entries) * parseFloat(asset.quantity)
}

export function getTotalGainLoss(asset: CalcAsset, entries: CalcEntry[]): number {
  const quantity = parseFloat(asset.quantity)
  const vwap = getVWAP(entries)
  return getCurrentValue(asset, entries) - vwap * quantity
}

export function getGainLossPercent(asset: CalcAsset, entries: CalcEntry[]): number {
  const quantity = parseFloat(asset.quantity)
  const costBasis = getVWAP(entries) * quantity
  if (costBasis === 0) return 0
  return (getTotalGainLoss(asset, entries) / costBasis) * 100
}

export function getPortfolioTotal(items: { asset: CalcAsset; entries: CalcEntry[] }[]): number {
  return items.reduce((sum, { asset, entries }) => sum + getCurrentValue(asset, entries), 0)
}

export interface PortfolioSummaryItem {
  asset: CalcAsset
  entries: CalcEntry[]
  eurRate?: number
  type?: string
}

export interface PortfolioSummary {
  portfolioTotal: number
  portfolioGainLoss: number
  portfolioGainLossPercent: number
  positionCount: number
  allocationByType: { type: string; value: number }[]
}

export function computePortfolioSummary(items: PortfolioSummaryItem[]): PortfolioSummary {
  const portfolioTotal = items.reduce(
    (sum, { asset, entries, eurRate }) => sum + getCurrentValue(asset, entries) * (eurRate ?? 1),
    0
  )
  const portfolioGainLoss = items.reduce(
    (sum, { asset, entries, eurRate }) => sum + getTotalGainLoss(asset, entries) * (eurRate ?? 1),
    0
  )
  const costBasis = portfolioTotal - portfolioGainLoss
  const portfolioGainLossPercent = costBasis === 0 ? 0 : (portfolioGainLoss / costBasis) * 100

  const allocationByType: Record<string, number> = {}
  for (const { asset, entries, eurRate, type } of items) {
    const value = getCurrentValue(asset, entries) * (eurRate ?? 1)
    const assetType = type ?? "OTHER"
    allocationByType[assetType] = (allocationByType[assetType] ?? 0) + value
  }

  return {
    portfolioTotal,
    portfolioGainLoss,
    portfolioGainLossPercent,
    positionCount: items.length,
    allocationByType: Object.entries(allocationByType).map(([type, value]) => ({ type, value })),
  }
}

// Merges real asset entries with synthetic PRICE_UPDATE entries from historical price data.
// Real PRICE_UPDATE entries on the same date take priority over historical ones.
export function mergeHistoricalPrices(
  entries: CalcEntry[],
  historicalPrices: { date: string; price: number }[]
): CalcEntry[] {
  const realPriceDates = new Set(
    entries.filter((e) => e.type === "PRICE_UPDATE").map((e) => e.date.split("T")[0])
  )
  const synthEntries: CalcEntry[] = historicalPrices
    .filter((p) => !realPriceDates.has(p.date))
    .map((p) => ({
      id: `hist-${p.date}`,
      type: "PRICE_UPDATE" as const,
      price: String(p.price),
      quantity: null,
      date: p.date + "T12:00:00.000Z",
    }))
  return [...synthEntries, ...entries]
}

export interface PortfolioHistoryOptions {
  minDate?: string
  fillGranularity?: "day" | "month"
}

// Generates first-of-month dates between two ISO date strings (inclusive)
function generateMonthlyDates(from: string, to: string): string[] {
  const dates: string[] = []
  const end = new Date(to)
  const cur = new Date(from)
  cur.setDate(1)
  while (cur <= end) {
    dates.push(cur.toISOString().split("T")[0])
    cur.setMonth(cur.getMonth() + 1)
  }
  return dates
}

function generateDailyDates(from: string, to: string): string[] {
  const dates: string[] = []
  const end = new Date(to)
  const cur = new Date(from)
  while (cur <= end) {
    dates.push(cur.toISOString().split("T")[0])
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

function getPositionState(entries: CalcEntry[], upToDate?: string): { quantity: number; costBasis: number } {
  const sorted = entries
    .filter((e) => !upToDate || e.date.split("T")[0] <= upToDate)
    .sort((a, b) => a.date.localeCompare(b.date))

  let quantity = 0
  let costBasis = 0

  for (const e of sorted) {
    const entryQuantity = e.quantity ? parseFloat(e.quantity) : 0
    if (e.type === "PURCHASE" && e.quantity) {
      costBasis += parseFloat(e.price) * entryQuantity
      quantity += entryQuantity
    } else if (e.type === "SALE" && e.quantity) {
      const averageCost = quantity === 0 ? 0 : costBasis / quantity
      quantity -= entryQuantity
      costBasis = averageCost * quantity
    } else if (e.type === "QUANTITY_UPDATE" && e.quantity) {
      const averageCost = quantity === 0 ? parseFloat(e.price) : costBasis / quantity
      quantity = entryQuantity
      costBasis = averageCost * quantity
    } else if (e.type === "VWAP_UPDATE" && e.quantity) {
      quantity = entryQuantity
      costBasis = parseFloat(e.price) * entryQuantity
    }
  }

  return { quantity, costBasis }
}

export function getPortfolioValueHistory(
  items: { asset: CalcAsset; entries: CalcEntry[]; eurRate?: number }[],
  options?: PortfolioHistoryOptions
): { date: string; totalValue: number }[] {
  const allDates = new Set<string>()
  const today = new Date().toISOString().split("T")[0]
  const minDate = options?.minDate
  const fillGranularity = options?.fillGranularity ?? "month"

  // Add all entry dates
  for (const { entries } of items) {
    for (const e of entries) allDates.add(e.date.split("T")[0])
  }

  const entryDates = Array.from(allDates).sort()
  if (entryDates.length > 0) {
    const fillFrom = minDate && minDate > entryDates[0] ? minDate : entryDates[0]
    const fillDates =
      fillGranularity === "day"
        ? generateDailyDates(fillFrom, today)
        : generateMonthlyDates(fillFrom, today)
    for (const d of fillDates) allDates.add(d)
  }

  allDates.add(today)

  return Array.from(allDates)
    .sort()
    .filter((date) => !minDate || date >= minDate)
    .map((date) => ({
      date,
      totalValue: items.reduce((sum, { entries, eurRate }) => {
        const rate = eurRate ?? 1
        const upTo = entries.filter((e) => e.date.split("T")[0] <= date)
        const { quantity } = getPositionState(entries, date)
        const priceEntry = [...upTo]
          .filter((e) => e.type === "PRICE_UPDATE" || e.type === "PURCHASE")
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
        return sum + (priceEntry ? parseFloat(priceEntry.price) * quantity * rate : 0)
      }, 0),
    }))
}

export function getGainLossHistory(
  items: { asset: CalcAsset; entries: CalcEntry[]; eurRate?: number }[],
  options?: PortfolioHistoryOptions
): { date: string; gainLoss: number; gainLossPercent: number }[] {
  const history = getPortfolioValueHistory(items, options)

  return history.map(({ date, totalValue }) => {
    const totalCostBasis = items.reduce((sum, { entries, eurRate }) => {
      const rate = eurRate ?? 1
      const { costBasis } = getPositionState(entries, date)
      return sum + costBasis * rate
    }, 0)
    const gainLoss = totalValue - totalCostBasis
    const gainLossPercent = totalCostBasis === 0 ? 0 : (gainLoss / totalCostBasis) * 100
    return { date, gainLoss, gainLossPercent }
  })
}
