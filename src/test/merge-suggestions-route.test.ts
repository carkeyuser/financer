// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"
import { readNdjsonStream } from "@/lib/utils/ndjson-stream"
import { mergeScanProgressEventSchema, mergeSuggestionsCompleteSchema } from "@/lib/validations/asset-merge"

const requireSession = vi.fn()
const getEurRate = vi.fn()

vi.mock("@/lib/household-auth", () => ({
  requireSession: (...args: unknown[]) => requireSession(...args),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    asset: { findMany: vi.fn() },
  },
}))

vi.mock("@/lib/utils/currency", () => ({
  getEurRate: (...args: unknown[]) => getEurRate(...args),
}))

describe("merge-suggestions NDJSON route", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    requireSession.mockResolvedValue({ userId: "user-1", householdId: "hh-1" })
    getEurRate.mockResolvedValue(1)

    const { prisma } = await import("@/lib/prisma")
    vi.mocked(prisma.asset.findMany).mockResolvedValue([
      {
        id: "a1",
        userId: "user-1",
        ticker: "EUNL.DE",
        name: "MSCI World",
        type: "ETF",
        isin: "IE00B4L5Y983",
        account: "Trade Republic",
        quantity: { toString: () => "10" },
        order: 0,
        currency: "EUR",
        user: { name: "Test", username: "test" },
        entries: [
          {
            id: "e1",
            type: "PURCHASE",
            price: { toString: () => "100" },
            quantity: { toString: () => "10" },
            date: new Date("2024-01-01"),
            importRef: "tr:1",
          },
        ],
      },
      {
        id: "a2",
        userId: "user-1",
        ticker: "EUNL",
        name: "MSCI World UCITS",
        type: "ETF",
        isin: "IE00B4L5Y983",
        account: "Trade Republic",
        quantity: { toString: () => "0" },
        order: 1,
        currency: "EUR",
        user: { name: "Test", username: "test" },
        entries: [],
      },
    ] as never)
  })

  it("streams NDJSON phases and validates complete payload", async () => {
    const { GET } = await import("@/app/api/assets/merge-suggestions/route")

    const response = await GET(
      new Request("http://localhost/api/assets/merge-suggestions?stream=1&trAccount=Trade%20Republic")
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("Content-Type")).toContain("ndjson")

    const phases: string[] = []
    const result = await readNdjsonStream(response, (e) => phases.push(e.phase), {
      resultSchema: mergeSuggestionsCompleteSchema,
      eventSchema: mergeScanProgressEventSchema,
    })

    expect(phases).toContain("load_assets")
    expect(phases).toContain("load_rates")
    expect(phases).toContain("analyze")
    expect(result.assetCount).toBe(2)
    expect(result.groups).toHaveLength(1)
    expect(result.groups[0]!.trImportRelevant).toBe(true)
  })

  it("returns JSON without stream param", async () => {
    const { GET } = await import("@/app/api/assets/merge-suggestions/route")

    const response = await GET(new Request("http://localhost/api/assets/merge-suggestions"))
    expect(response.status).toBe(200)

    const body = await response.json()
    const parsed = mergeSuggestionsCompleteSchema.safeParse(body)
    expect(parsed.success).toBe(true)
  })
})
