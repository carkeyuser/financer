export interface CalendarEvent {
  ticker: string
  name: string
  type: "earnings" | "dividend"
  date: string
}

interface AssetCalendarSource {
  ticker: string
  name: string
}

interface NasdaqEarningsRow {
  symbol?: string
  name?: string
}

interface NasdaqDividendRow {
  symbol?: string
  companyName?: string
  dividend_Ex_Date?: string
}

const NASDAQ_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  Accept: "application/json, text/plain, */*",
  Origin: "https://www.nasdaq.com",
  Referer: "https://www.nasdaq.com/",
}

const FETCH_TIMEOUT_MS = 3_000
const ROUTE_DEADLINE_MS = 8_000
/** Business days to scan (was 60 — too many outbound calls on self-hosted). */
const MAX_BUSINESS_DAYS = 14
const MAX_PARALLEL_FETCHES = 2

let nasdaqReachable: boolean | null = null
let nasdaqCheckedAt = 0
const NASDAQ_PROBE_TTL_MS = 60 * 60 * 1000

export function isExternalMarketCalendarEnabled(): boolean {
  return process.env.MARKET_CALENDAR_EXTERNAL !== "false"
}

export function toNasdaqSymbol(ticker: string): string | null {
  const normalized = ticker.trim().toUpperCase()
  if (!normalized || normalized.includes(".") || normalized.endsWith("-USD") || normalized.endsWith("=X")) {
    return null
  }
  return normalized
}

export function formatDateParam(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function parseNasdaqDate(date: string): Date | null {
  const [month, day, year] = date.split("/").map((part) => Number(part))
  if (!month || !day || !year) return null
  return new Date(year, month - 1, day)
}

export function nextBusinessDays(daysAhead: number): Date[] {
  const start = new Date()
  start.setHours(0, 0, 0, 0)

  const days: Date[] = []
  for (let offset = 0; offset <= daysAhead + 7 && days.length <= daysAhead; offset++) {
    const date = new Date(start)
    date.setDate(start.getDate() + offset)
    const weekday = date.getDay()
    if (weekday !== 0 && weekday !== 6) days.push(date)
  }
  return days.slice(0, daysAhead + 1)
}

async function probeNasdaqReachable(): Promise<boolean> {
  if (!isExternalMarketCalendarEnabled()) return false

  const now = Date.now()
  if (nasdaqReachable !== null && now - nasdaqCheckedAt < NASDAQ_PROBE_TTL_MS) {
    return nasdaqReachable
  }

  try {
    const url = `https://api.nasdaq.com/api/calendar/earnings?date=${formatDateParam(new Date())}`
    const res = await fetch(url, {
      headers: NASDAQ_HEADERS,
      signal: AbortSignal.timeout(2_000),
      cache: "no-store",
    })
    nasdaqReachable = res.ok
  } catch {
    nasdaqReachable = false
  }
  nasdaqCheckedAt = now
  return nasdaqReachable
}

async function fetchNasdaqRows<T>(kind: "earnings" | "dividends", date: Date): Promise<T[]> {
  const url = `https://api.nasdaq.com/api/calendar/${kind}?date=${formatDateParam(date)}`
  const res = await fetch(url, {
    headers: NASDAQ_HEADERS,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cache: "no-store",
  })
  if (!res.ok) return []

  const data = await res.json()
  return data?.data?.calendar?.rows ?? data?.data?.rows ?? []
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

export async function fetchCalendarEvents(assets: AssetCalendarSource[]): Promise<CalendarEvent[]> {
  if (!isExternalMarketCalendarEnabled()) return []

  const reachable = await probeNasdaqReachable()
  if (!reachable) return []

  const assetBySymbol = new Map<string, AssetCalendarSource>()
  for (const asset of assets) {
    const symbol = toNasdaqSymbol(asset.ticker)
    if (symbol) assetBySymbol.set(symbol, asset)
  }
  if (assetBySymbol.size === 0) return []

  const deadlineMs = Date.now() + ROUTE_DEADLINE_MS
  const days = nextBusinessDays(MAX_BUSINESS_DAYS)
  const events: CalendarEvent[] = []

  const tasks = days.flatMap((date) => [
    async () => {
      if (Date.now() > deadlineMs) return []
      try {
        const rows = await fetchNasdaqRows<NasdaqEarningsRow>("earnings", date)
        return rows.flatMap((row): CalendarEvent[] => {
          const symbol = row.symbol?.toUpperCase()
          const asset = symbol ? assetBySymbol.get(symbol) : null
          if (!asset) return []
          return [{
            ticker: asset.ticker,
            name: asset.name || row.name || asset.ticker,
            type: "earnings",
            date: date.toISOString(),
          }]
        })
      } catch {
        return []
      }
    },
    async () => {
      if (Date.now() > deadlineMs) return []
      try {
        const rows = await fetchNasdaqRows<NasdaqDividendRow>("dividends", date)
        return rows.flatMap((row): CalendarEvent[] => {
          const symbol = row.symbol?.toUpperCase()
          const asset = symbol ? assetBySymbol.get(symbol) : null
          const exDate = row.dividend_Ex_Date ? parseNasdaqDate(row.dividend_Ex_Date) : date
          if (!asset || !exDate) return []
          return [{
            ticker: asset.ticker,
            name: asset.name || row.companyName || asset.ticker,
            type: "dividend",
            date: exDate.toISOString(),
          }]
        })
      } catch {
        return []
      }
    },
  ])

  for (const batch of chunk(tasks, MAX_PARALLEL_FETCHES)) {
    if (Date.now() > deadlineMs) break
    const batchResults = await Promise.all(batch.map((run) => run()))
    for (const dayEvents of batchResults) {
      events.push(...dayEvents)
    }
  }

  const seen = new Set<string>()
  return events.filter((event) => {
    const key = `${event.ticker}:${event.type}:${event.date}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
