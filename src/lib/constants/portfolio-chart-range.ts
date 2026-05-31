import { subDays } from "date-fns"

export type PortfolioChartRange = "1W" | "1M" | "3M" | "6M" | "1Y" | "MAX"

export const DEFAULT_PORTFOLIO_CHART_RANGE: PortfolioChartRange = "3M"

export const PORTFOLIO_CHART_RANGES: PortfolioChartRange[] = [
  "1W",
  "1M",
  "3M",
  "6M",
  "1Y",
  "MAX",
]

const LOOKBACK_DAYS: Record<Exclude<PortfolioChartRange, "MAX">, number> = {
  "1W": 7,
  "1M": 30,
  "3M": 90,
  "6M": 180,
  "1Y": 365,
}

export type YahooHistoryInterval = "1d" | "1wk" | "1mo"
export type HistoryFillGranularity = "day" | "month"

/** ISO date (YYYY-MM-DD) for range start, or null for full history (MAX). */
export function getRangeStartDate(range: PortfolioChartRange): string | null {
  if (range === "MAX") return null
  return subDays(new Date(), LOOKBACK_DAYS[range]).toISOString().split("T")[0]
}

export function getYahooHistoryInterval(range: PortfolioChartRange): YahooHistoryInterval {
  switch (range) {
    case "1W":
    case "1M":
    case "3M":
      return "1d"
    case "6M":
    case "1Y":
      return "1wk"
    case "MAX":
      return "1mo"
  }
}

export function getHistoryFillGranularity(range: PortfolioChartRange): HistoryFillGranularity {
  return range === "MAX" ? "month" : "day"
}

/** Later of two ISO dates (YYYY-MM-DD). */
export function maxIsoDate(a: string, b: string): string {
  return a >= b ? a : b
}
