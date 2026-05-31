import { describe, it, expect } from "vitest"
import {
  buildIsinResolutionMap,
  buildTickerMappings,
  countUnresolvedTickers,
  initialTickerOverrides,
  tickerOverrideKey,
} from "@/lib/services/tr-import-ticker-mapping"
import type { TrParsedRow } from "@/lib/services/tr-import-types"

const baseRow = (overrides: Partial<TrParsedRow>): TrParsedRow => ({
  rowId: "row-1",
  lineNumber: 2,
  date: "2024-01-15",
  product: "Vanguard FTSE",
  isin: "IE00BK5BQT8V",
  quantity: 5,
  price: 85.5,
  totalEur: 427.5,
  taxEur: null,
  orderId: "tr-1",
  importRef: "tr:tr-1",
  eventType: "purchase",
  rawType: "buy",
  ...overrides,
})

describe("buildTickerMappings", () => {
  it("prefers existing portfolio ticker over Yahoo", () => {
    const parsed = [baseRow({})]
    const mappings = buildTickerMappings(
      parsed,
      [{ isin: "IE00BK5BQT8V", ticker: "VWCE.DE", name: "VWCE", type: "ETF", currency: "EUR" }],
      new Map([
        ["IE00BK5BQT8V", { symbol: "VWRA.L", name: "VWRA", type: "ETF", currency: "USD" }],
      ])
    )
    expect(mappings).toHaveLength(1)
    expect(mappings[0].source).toBe("portfolio")
    expect(mappings[0].suggestedTicker?.symbol).toBe("VWCE.DE")
    expect(mappings[0].hasTickerConflict).toBe(true)
  })

  it("marks unresolved when neither portfolio nor Yahoo match", () => {
    const parsed = [baseRow({ isin: "XX0000000001" })]
    const mappings = buildTickerMappings(parsed, [], new Map([["XX0000000001", null]]))
    expect(mappings[0].source).toBe("unresolved")
    expect(mappings[0].requiresManual).toBe(true)
    expect(countUnresolvedTickers(mappings, {})).toBe(1)
    expect(countUnresolvedTickers(mappings, initialTickerOverrides(mappings))).toBe(1)
  })

  it("builds isin resolution map from mappings", () => {
    const parsed = [baseRow({})]
    const mappings = buildTickerMappings(
      parsed,
      [],
      new Map([["IE00BK5BQT8V", { symbol: "VWCE.DE", name: "VWCE", type: "ETF", currency: "EUR" }]])
    )
    const map = buildIsinResolutionMap(mappings)
    expect(map.get("IE00BK5BQT8V")?.symbol).toBe("VWCE.DE")
  })

  it("includes product-only mappings for crypto rows without ISIN", () => {
    const parsed = [
      baseRow({ isin: null, product: "Bitcoin", eventType: "purchase" }),
      baseRow({ rowId: "row-2", isin: null, product: "Bitcoin", eventType: "purchase" }),
      baseRow({ rowId: "row-3", isin: null, product: "XRP", eventType: "purchase" }),
    ]
    const mappings = buildTickerMappings(parsed, [], new Map())
    expect(mappings).toHaveLength(2)
    const btc = mappings.find((m) => m.productName === "Bitcoin")
    expect(btc?.transactionCount).toBe(2)
    expect(btc?.requiresManual).toBe(true)
    expect(btc?.isin).toBe("__product__:bitcoin")
    expect(tickerOverrideKey({ isin: null, product: "Bitcoin" })).toBe("__product__:bitcoin")
  })
})
