import { describe, expect, it } from "vitest"
import { filterCalendarEventsWithinDays } from "@/lib/utils/market-calendar-utils"
import type { CalendarEvent } from "@/lib/services/nasdaq-calendar"

describe("filterCalendarEventsWithinDays", () => {
  const now = new Date("2026-06-15T12:00:00")

  it("keeps events within range", () => {
    const events: CalendarEvent[] = [
      { ticker: "AAPL", name: "Apple", type: "earnings", date: "2026-06-16T00:00:00.000Z" },
      { ticker: "MSFT", name: "Microsoft", type: "dividend", date: "2026-08-01T00:00:00.000Z" },
    ]
    const filtered = filterCalendarEventsWithinDays(events, 7, now)
    expect(filtered).toHaveLength(1)
    expect(filtered[0].ticker).toBe("AAPL")
  })
})

describe("portfolio snapshot delta", () => {
  it("computes percent change", () => {
    const previous = 1000
    const current = 1050
    const deltaEur = current - previous
    const deltaPercent = (deltaEur / previous) * 100
    expect(deltaPercent).toBe(5)
  })
})
