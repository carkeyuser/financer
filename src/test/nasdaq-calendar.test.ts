import { describe, expect, it } from "vitest"
import {
  formatDateParam,
  isExternalMarketCalendarEnabled,
  nextBusinessDays,
  parseNasdaqDate,
  toNasdaqSymbol,
} from "@/lib/services/nasdaq-calendar"

describe("nasdaq-calendar helpers", () => {
  it("toNasdaqSymbol rejects crypto and forex tickers", () => {
    expect(toNasdaqSymbol("AAPL")).toBe("AAPL")
    expect(toNasdaqSymbol("BTC-USD")).toBeNull()
    expect(toNasdaqSymbol("EURUSD=X")).toBeNull()
    expect(toNasdaqSymbol("SAP.DE")).toBeNull()
  })

  it("parseNasdaqDate parses US-style dates", () => {
    const d = parseNasdaqDate("5/27/2026")
    expect(d?.getFullYear()).toBe(2026)
    expect(d?.getMonth()).toBe(4)
    expect(d?.getDate()).toBe(27)
  })

  it("formatDateParam uses ISO date parts", () => {
    expect(formatDateParam(new Date(2026, 4, 7))).toBe("2026-05-07")
  })

  it("nextBusinessDays skips weekends", () => {
    const days = nextBusinessDays(5)
    expect(days.length).toBe(6)
    for (const day of days) {
      expect(day.getDay()).not.toBe(0)
      expect(day.getDay()).not.toBe(6)
    }
  })

  it("isExternalMarketCalendarEnabled respects env", () => {
    const prev = process.env.MARKET_CALENDAR_EXTERNAL
    process.env.MARKET_CALENDAR_EXTERNAL = "false"
    expect(isExternalMarketCalendarEnabled()).toBe(false)
    delete process.env.MARKET_CALENDAR_EXTERNAL
    expect(isExternalMarketCalendarEnabled()).toBe(true)
    if (prev !== undefined) process.env.MARKET_CALENDAR_EXTERNAL = prev
  })
})
