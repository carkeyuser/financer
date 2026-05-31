import { describe, it, expect } from "vitest"
import {
  buildMergeSuggestionGroups,
  isEmptyPosition,
  matchAssetPair,
  nameSimilarity,
  normalizeTicker,
  type AssetForMergeScan,
} from "@/lib/services/asset-merge-suggestions"
import { recalculateQuantityFromEntries } from "@/lib/utils/asset-quantity"

function asset(overrides: Partial<AssetForMergeScan> & Pick<AssetForMergeScan, "id" | "ticker" | "name">): AssetForMergeScan {
  return {
    userId: "user-1",
    type: "ETF",
    isin: null,
    account: "Trade Republic",
    quantity: "10",
    order: 0,
    ownerName: "Test",
    eurRate: 1,
    entries: [{ id: "e1", type: "PURCHASE", price: "100", quantity: "10", date: "2024-01-01T00:00:00.000Z" }],
    ...overrides,
  }
}

describe("normalizeTicker", () => {
  it("strips exchange suffix", () => {
    expect(normalizeTicker("VUAA.DE")).toBe("VUAA")
    expect(normalizeTicker("VUAA")).toBe("VUAA")
  })
})

describe("matchAssetPair", () => {
  it("matches same ISIN", () => {
    const a = asset({ id: "a", ticker: "EUNL.DE", name: "MSCI World", isin: "IE00B4L5Y983" })
    const b = asset({ id: "b", ticker: "EUNL", name: "Other", isin: "IE00B4L5Y983" })
    expect(matchAssetPair(a, b)?.reasonKey).toBe("merge.reasonSameIsin")
  })

  it("does not match different users", () => {
    const a = asset({ id: "a", ticker: "EUNL", name: "X", isin: "IE00B4L5Y983" })
    const b = asset({ id: "b", ticker: "EUNL", name: "X", isin: "IE00B4L5Y983", userId: "user-2" })
    expect(matchAssetPair(a, b)).toBeNull()
  })

  it("matches normalized ticker", () => {
    const a = asset({ id: "a", ticker: "VUAA.DE", name: "A" })
    const b = asset({ id: "b", ticker: "VUAA", name: "B" })
    expect(matchAssetPair(a, b)?.reasonKey).toBe("merge.reasonSameTicker")
  })
})

describe("buildMergeSuggestionGroups", () => {
  it("groups same ISIN assets", () => {
    const groups = buildMergeSuggestionGroups([
      asset({ id: "a", ticker: "EUNL.DE", name: "MSCI World", isin: "IE00B4L5Y983" }),
      asset({ id: "b", ticker: "EUNL", name: "MSCI World UCITS", isin: "IE00B4L5Y983", quantity: "0", entries: [] }),
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0]!.assets).toHaveLength(2)
    expect(groups[0]!.confidence).toBe("high")
  })

  it("keeps different users separate", () => {
    const groups = buildMergeSuggestionGroups([
      asset({ id: "a", ticker: "EUNL", name: "X", isin: "IE00B4L5Y983" }),
      asset({ id: "b", ticker: "EUNL", name: "X", isin: "IE00B4L5Y983", userId: "user-2" }),
    ])
    expect(groups).toHaveLength(0)
  })
})

describe("nameSimilarity", () => {
  it("returns high score for similar names", () => {
    expect(nameSimilarity("iShares Core MSCI World", "iShares Core MSCI World UCITS ETF")).toBeGreaterThan(0.5)
  })
})

describe("recalculateQuantityFromEntries", () => {
  it("sums purchases and sales", () => {
    const qty = recalculateQuantityFromEntries([
      { type: "PURCHASE", quantity: "10", date: new Date("2024-01-01") },
      { type: "SALE", quantity: "3", date: new Date("2024-06-01") },
    ])
    expect(qty).toBe(7)
  })

  it("applies quantity update absolutely", () => {
    const qty = recalculateQuantityFromEntries([
      { type: "PURCHASE", quantity: "10", date: new Date("2024-01-01") },
      { type: "QUANTITY_UPDATE", quantity: "5", date: new Date("2024-06-01") },
    ])
    expect(qty).toBe(5)
  })
})

describe("isEmptyPosition", () => {
  it("hides zero quantity", () => {
    expect(isEmptyPosition({ quantity: "0", ticker: "EUNL" }, [], 1)).toBe(true)
  })

  it("shows position with quantity", () => {
    expect(
      isEmptyPosition(
        { quantity: "5", ticker: "EUNL" },
        [{ id: "e1", type: "PURCHASE", price: "100", quantity: "5", date: "2024-01-01" }],
        1
      )
    ).toBe(false)
  })

  it("never hides interest asset", () => {
    expect(isEmptyPosition({ quantity: "0", ticker: "Interest" }, [], 1)).toBe(false)
  })
})
