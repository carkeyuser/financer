import { describe, it, expect } from "vitest"
import { resolveStoredPrice } from "@/lib/services/security-price"

describe("resolveStoredPrice", () => {
  it("uses priceEur for EUR assets", () => {
    expect(
      resolveStoredPrice("EUR", { price: 100, priceEur: 92.5, eurRate: 0.925 })
    ).toBe(92.5)
  })

  it("falls back to native price times eurRate for EUR when priceEur is null", () => {
    expect(
      resolveStoredPrice("EUR", { price: 100, priceEur: null, eurRate: 0.9 })
    ).toBe(90)
  })

  it("does not store native prices as EUR when the FX rate is missing", () => {
    expect(
      resolveStoredPrice("EUR", { price: 100, priceEur: null, eurRate: null })
    ).toBeNull()
  })

  it("uses native price for USD assets", () => {
    expect(
      resolveStoredPrice("USD", { price: 150.25, priceEur: 138.1, eurRate: 0.92 })
    ).toBe(150.25)
  })

  it("returns null when native price is null", () => {
    expect(
      resolveStoredPrice("EUR", { price: null, priceEur: 50, eurRate: 1 })
    ).toBeNull()
  })
})
