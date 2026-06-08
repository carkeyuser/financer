import { describe, it, expect } from "vitest"
import { deriveMarketMood } from "@/lib/ambient/market-mood"

describe("deriveMarketMood", () => {
  it("returns empty for no positions", () => {
    expect(deriveMarketMood([])).toBe("empty")
  })

  it("returns calm when moves are tiny", () => {
    expect(
      deriveMarketMood([
        { gainLossPct: 0.1 },
        { gainLossPct: -0.2 },
        { gainLossPct: 0.05 },
      ])
    ).toBe("calm")
  })

  it("returns bullish on strong positive average", () => {
    expect(
      deriveMarketMood([
        { gainLossPct: 4 },
        { gainLossPct: 3 },
        { gainLossPct: 2 },
      ])
    ).toBe("bullish")
  })

  it("returns bearish on deep losses", () => {
    expect(
      deriveMarketMood([
        { gainLossPct: -1 },
        { gainLossPct: -2 },
        { gainLossPct: -5 },
      ])
    ).toBe("bearish")
  })

  it("returns mixed otherwise", () => {
    expect(
      deriveMarketMood([
        { gainLossPct: 3 },
        { gainLossPct: -2 },
      ])
    ).toBe("mixed")
  })
})
