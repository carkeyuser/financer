import { describe, it, expect } from "vitest"
import {
  getVWAP,
  getCurrentPrice,
  getCurrentValue,
  getTotalGainLoss,
  getGainLossPercent,
  getPortfolioValueHistory,
  getGainLossHistory,
  computePortfolioSummary,
} from "@/lib/utils/calculations"
import type { CalcEntry, CalcAsset } from "@/lib/utils/calculations"

const asset: CalcAsset = { id: "a1", quantity: "10" }

const entries: CalcEntry[] = [
  { id: "e1", type: "PURCHASE", price: "100", quantity: "4", date: "2024-01-10" },
  { id: "e2", type: "PURCHASE", price: "120", quantity: "6", date: "2024-02-01" },
  { id: "e3", type: "PRICE_UPDATE", price: "130", quantity: null, date: "2024-03-01" },
]

describe("getVWAP", () => {
  it("calculates weighted average purchase price", () => {
    // (100*4 + 120*6) / 10 = (400 + 720) / 10 = 112
    expect(getVWAP(entries)).toBe(112)
  })

  it("returns 0 with no entries", () => {
    expect(getVWAP([])).toBe(0)
  })

  it("returns 0 with only PRICE_UPDATE entries", () => {
    const priceOnly: CalcEntry[] = [
      { id: "p1", type: "PRICE_UPDATE", price: "50", quantity: null, date: "2024-01-01" },
    ]
    expect(getVWAP(priceOnly)).toBe(0)
  })

  it("handles single purchase", () => {
    const single: CalcEntry[] = [
      { id: "s1", type: "PURCHASE", price: "200", quantity: "5", date: "2024-01-01" },
    ]
    expect(getVWAP(single)).toBe(200)
  })
})

describe("getCurrentPrice", () => {
  it("returns latest price update when it is newer than purchases", () => {
    expect(getCurrentPrice(entries)).toBe(130)
  })

  it("returns latest purchase when it is newer than price updates", () => {
    const staleUpdate: CalcEntry[] = [
      { id: "e1", type: "PURCHASE", price: "100", quantity: "4", date: "2024-01-10" },
      { id: "e2", type: "PRICE_UPDATE", price: "90", quantity: null, date: "2024-02-01" },
      { id: "e3", type: "PURCHASE", price: "120", quantity: "6", date: "2024-03-01" },
    ]
    expect(getCurrentPrice(staleUpdate)).toBe(120)
  })

  it("falls back to latest purchase if no PRICE_UPDATE", () => {
    const noUpdate: CalcEntry[] = [
      { id: "e1", type: "PURCHASE", price: "100", quantity: "4", date: "2024-01-10" },
      { id: "e2", type: "PURCHASE", price: "120", quantity: "6", date: "2024-02-01" },
    ]
    expect(getCurrentPrice(noUpdate)).toBe(120)
  })

  it("returns 0 with empty entries", () => {
    expect(getCurrentPrice([])).toBe(0)
  })
})

describe("getCurrentValue", () => {
  it("multiplies current price by quantity", () => {
    // 130 * 10 = 1300
    expect(getCurrentValue(asset, entries)).toBe(1300)
  })

  it("returns 0 when no entries", () => {
    expect(getCurrentValue(asset, [])).toBe(0)
  })
})

describe("getTotalGainLoss", () => {
  it("computes gain correctly", () => {
    // value = 1300, cost = 112 * 10 = 1120 → gain = 180
    expect(getTotalGainLoss(asset, entries)).toBe(180)
  })

  it("returns 0 when no entries", () => {
    expect(getTotalGainLoss(asset, [])).toBe(0)
  })

  it("computes loss when price dropped", () => {
    const lossEntries: CalcEntry[] = [
      { id: "l1", type: "PURCHASE", price: "100", quantity: "10", date: "2024-01-01" },
      { id: "l2", type: "PRICE_UPDATE", price: "80", quantity: null, date: "2024-02-01" },
    ]
    // value = 800, cost = 1000 → loss = -200
    expect(getTotalGainLoss(asset, lossEntries)).toBe(-200)
  })
})

describe("getGainLossPercent", () => {
  it("calculates percentage gain", () => {
    // gain 180, cost 1120 → 180/1120*100 ≈ 16.07%
    const pct = getGainLossPercent(asset, entries)
    expect(pct).toBeCloseTo(16.07, 1)
  })

  it("returns 0 when cost basis is zero", () => {
    expect(getGainLossPercent(asset, [])).toBe(0)
  })
})

describe("getPortfolioValueHistory", () => {
  it("includes today as a data point", () => {
    const today = new Date().toISOString().split("T")[0]
    const items = [{ asset, entries }]
    const history = getPortfolioValueHistory(items)
    expect(history.some((h) => h.date === today)).toBe(true)
  })

  it("returns at least 2 data points for a single-day purchase", () => {
    const singleEntry: CalcEntry[] = [
      { id: "s1", type: "PURCHASE", price: "100", quantity: "5", date: "2024-06-01" },
    ]
    const history = getPortfolioValueHistory([{ asset: { id: "a2", quantity: "5" }, entries: singleEntry }])
    expect(history.length).toBeGreaterThanOrEqual(2)
  })

  it("applies eurRate to values", () => {
    const singleEntry: CalcEntry[] = [
      { id: "s1", type: "PURCHASE", price: "100", quantity: "10", date: "2024-06-01" },
    ]
    const withRate = getPortfolioValueHistory([{ asset, entries: singleEntry, eurRate: 0.9 }])
    const withoutRate = getPortfolioValueHistory([{ asset, entries: singleEntry }])
    const datePoint = "2024-06-01"
    const withVal = withRate.find((h) => h.date === datePoint)?.totalValue ?? 0
    const withoutVal = withoutRate.find((h) => h.date === datePoint)?.totalValue ?? 0
    expect(withVal).toBeCloseTo(withoutVal * 0.9, 5)
  })

  it("value increases after price update", () => {
    const history = getPortfolioValueHistory([{ asset, entries }])
    const jan = history.find((h) => h.date === "2024-01-10")?.totalValue ?? 0
    const mar = history.find((h) => h.date === "2024-03-01")?.totalValue ?? 0
    expect(mar).toBeGreaterThan(jan)
  })

  it("filters points before minDate", () => {
    const history = getPortfolioValueHistory([{ asset, entries }], { minDate: "2024-02-01" })
    expect(history.every((h) => h.date >= "2024-02-01")).toBe(true)
    expect(history.some((h) => h.date === "2024-01-10")).toBe(false)
  })

  it("daily fill produces more points than monthly in a short window", () => {
    const singleEntry: CalcEntry[] = [
      { id: "s1", type: "PURCHASE", price: "100", quantity: "5", date: "2024-06-01" },
    ]
    const minDate = "2024-06-15"
    const daily = getPortfolioValueHistory([{ asset: { id: "a2", quantity: "5" }, entries: singleEntry }], {
      minDate,
      fillGranularity: "day",
    })
    const monthly = getPortfolioValueHistory([{ asset: { id: "a2", quantity: "5" }, entries: singleEntry }], {
      minDate,
      fillGranularity: "month",
    })
    expect(daily.length).toBeGreaterThan(monthly.length)
  })
})

describe("getGainLossHistory", () => {
  it("reduces cost basis proportionally after a sale", () => {
    const saleEntries: CalcEntry[] = [
      { id: "s1", type: "PURCHASE", price: "100", quantity: "10", date: "2024-01-01" },
      { id: "s2", type: "PRICE_UPDATE", price: "120", quantity: null, date: "2024-02-01" },
      { id: "s3", type: "SALE", price: "120", quantity: "4", date: "2024-03-01" },
    ]

    const history = getGainLossHistory([{ asset: { id: "sale", quantity: "6" }, entries: saleEntries }])
    const afterSale = history.find((h) => h.date === "2024-03-01")

    expect(afterSale?.gainLoss).toBeCloseTo(120, 5)
    expect(afterSale?.gainLossPercent).toBeCloseTo(20, 5)
  })

  it("resets cost basis to the corrected quantity on quantity update", () => {
    const correctionEntries: CalcEntry[] = [
      { id: "q1", type: "PURCHASE", price: "100", quantity: "10", date: "2024-01-01" },
      { id: "q2", type: "PRICE_UPDATE", price: "120", quantity: null, date: "2024-02-01" },
      { id: "q3", type: "QUANTITY_UPDATE", price: "100", quantity: "6", date: "2024-03-01" },
    ]

    const history = getGainLossHistory([{ asset: { id: "quantity", quantity: "6" }, entries: correctionEntries }])
    const afterCorrection = history.find((h) => h.date === "2024-03-01")

    expect(afterCorrection?.gainLoss).toBeCloseTo(120, 5)
    expect(afterCorrection?.gainLossPercent).toBeCloseTo(20, 5)
  })

  it("applies eurRate to gain/loss values while keeping percentages unchanged", () => {
    const rateEntries: CalcEntry[] = [
      { id: "r1", type: "PURCHASE", price: "100", quantity: "10", date: "2024-01-01" },
      { id: "r2", type: "PRICE_UPDATE", price: "120", quantity: null, date: "2024-02-01" },
    ]

    const history = getGainLossHistory([{ asset, entries: rateEntries, eurRate: 0.9 }])
    const converted = history.find((h) => h.date === "2024-02-01")

    expect(converted?.gainLoss).toBeCloseTo(180, 5)
    expect(converted?.gainLossPercent).toBeCloseTo(20, 5)
  })
})

describe("computePortfolioSummary", () => {
  it("aggregates EUR values and gain/loss percent across positions", () => {
    const items = [
      {
        asset: { id: "a1", quantity: "10" },
        entries: [
          { id: "e1", type: "PURCHASE" as const, price: "100", quantity: "10", date: "2024-01-01" },
          { id: "e2", type: "PRICE_UPDATE" as const, price: "118", quantity: null, date: "2024-02-01" },
        ],
        eurRate: 1,
        type: "ETF",
      },
      {
        asset: { id: "a2", quantity: "5" },
        entries: [
          { id: "e3", type: "PURCHASE" as const, price: "50", quantity: "5", date: "2024-01-01" },
          { id: "e4", type: "PRICE_UPDATE" as const, price: "40", quantity: null, date: "2024-02-01" },
        ],
        eurRate: 2,
        type: "STOCK",
      },
    ]

    const summary = computePortfolioSummary(items)

    expect(summary.positionCount).toBe(2)
    expect(summary.portfolioTotal).toBe(1580)
    expect(summary.portfolioGainLoss).toBe(80)
    expect(summary.portfolioGainLossPercent).toBeCloseTo(5.333333, 4)
    expect(summary.allocationByType).toEqual([
      { type: "ETF", value: 1180 },
      { type: "STOCK", value: 400 },
    ])
  })

  it("returns zeros for empty portfolio", () => {
    const summary = computePortfolioSummary([])

    expect(summary).toEqual({
      portfolioTotal: 0,
      portfolioGainLoss: 0,
      portfolioGainLossPercent: 0,
      positionCount: 0,
      allocationByType: [],
    })
  })
})
