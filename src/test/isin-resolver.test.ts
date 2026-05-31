import { describe, it, expect, vi, beforeEach } from "vitest"
import { clearIsinCache, resolveIsins } from "@/lib/services/isin-resolver"

const searchSecurities = vi.fn()

vi.mock("@/lib/services/security-search", () => ({
  searchSecurities: (...args: unknown[]) => searchSecurities(...args),
}))

describe("resolveIsins", () => {
  beforeEach(() => {
    clearIsinCache()
    searchSecurities.mockReset()
    searchSecurities.mockImplementation(async (query: string) => {
      if (query === "IE00BK5BQT8V") {
        return [{ symbol: "EUNL.DE", name: "All-World", assetType: "ETF" }]
      }
      if (query === "US0378331005") {
        await new Promise((r) => setTimeout(r, 30))
        return [{ symbol: "AAPL", name: "Apple", assetType: "STOCK" }]
      }
      return []
    })
  })

  it("reports progress for each unique ISIN", async () => {
    const onProgress = vi.fn()
    const map = await resolveIsins(
      [
        { isin: "IE00BK5BQT8V", productName: "All-World" },
        { isin: "ie00bk5bqt8v" },
        { isin: "US0378331005", productName: "Apple" },
      ],
      onProgress
    )

    expect(map.size).toBe(2)
    expect(onProgress).toHaveBeenCalledTimes(2)
    expect(onProgress).toHaveBeenNthCalledWith(1, 1, 2)
    expect(onProgress).toHaveBeenNthCalledWith(2, 2, 2)
  })

  it("resolves ISINs in parallel up to concurrency limit", async () => {
    const started: number[] = []
    const release: Array<() => void> = []
    searchSecurities.mockImplementation(async (query: string) => {
      started.push(Date.now())
      await new Promise<void>((r) => release.push(r))
      if (query === "IE00BK5BQT8V") {
        return [{ symbol: "EUNL.DE", name: "All-World", assetType: "ETF" }]
      }
      return [{ symbol: "AAPL", name: "Apple", assetType: "STOCK" }]
    })

    const promise = resolveIsins(
      [{ isin: "IE00BK5BQT8V" }, { isin: "US0378331005" }, { isin: "DE0000000001" }],
      undefined,
      { concurrency: 2 }
    )

    await vi.waitFor(() => expect(started).toHaveLength(2))
    release.shift()?.()
    release.shift()?.()
    await vi.waitFor(() => expect(started).toHaveLength(3))
    release.shift()?.()
    await promise

    expect(started).toHaveLength(3)
  })
})
