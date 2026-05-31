import { beforeEach, describe, expect, it, vi } from "vitest"

describe("getEurRate", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
  })

  it("returns 1 for EUR without fetching Yahoo", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    const { getEurRate } = await import("@/lib/utils/currency")

    await expect(getEurRate("EUR")).resolves.toBe(1)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("converts Yahoo's EUR quote into a currency-to-EUR rate", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        chart: {
          result: [{ meta: { regularMarketPrice: 1.25 } }],
        },
      }),
    }))

    const { getEurRate } = await import("@/lib/utils/currency")

    await expect(getEurRate("USD")).resolves.toBeCloseTo(0.8)
  })

  it("throws for non-EUR currencies when Yahoo has no rate", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }))

    const { ExchangeRateError, getEurRate } = await import("@/lib/utils/currency")

    await expect(getEurRate("USD")).rejects.toBeInstanceOf(ExchangeRateError)
  })
})
