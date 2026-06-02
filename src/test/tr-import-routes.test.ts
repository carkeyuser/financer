// @vitest-environment node
import { readFileSync } from "fs"
import { join } from "path"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { readNdjsonStream } from "@/lib/services/tr-import-progress"
import { trImportApplyResultSchema, trImportPreviewCompleteSchema } from "@/lib/validations/tr-import"

const requireSession = vi.fn()
const resolveIsins = vi.fn()
const storePreview = vi.fn()
const getPreview = vi.fn()
const deletePreview = vi.fn()
const applyTradeRepublicImport = vi.fn()

vi.mock("@/lib/household-auth", () => ({
  requireSession: (...args: unknown[]) => requireSession(...args),
  canManageHousehold: () => true,
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    householdMember: { findUnique: vi.fn() },
    asset: { findMany: vi.fn().mockResolvedValue([]) },
    assetEntry: { findMany: vi.fn().mockResolvedValue([]) },
    dividendPayment: { findMany: vi.fn().mockResolvedValue([]) },
    $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn({})),
  },
}))

vi.mock("@/lib/services/isin-resolver", () => ({
  resolveIsins: (...args: unknown[]) => resolveIsins(...args),
}))

vi.mock("@/lib/services/tr-import-preview-cache", () => ({
  storePreview: (...args: unknown[]) => storePreview(...args),
  getPreview: (...args: unknown[]) => getPreview(...args),
  deletePreview: (...args: unknown[]) => deletePreview(...args),
}))

vi.mock("@/lib/services/tr-import-apply", () => ({
  applyTradeRepublicImport: (...args: unknown[]) => applyTradeRepublicImport(...args),
}))

const fixturePath = join(__dirname, "fixtures", "tr-export-sample.csv")

describe("TR import NDJSON routes", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const { clearTrImportPreviewRateLimit } = await import(
      "@/app/api/investments/import/trade-republic/preview/route"
    )
    clearTrImportPreviewRateLimit()
    requireSession.mockResolvedValue({
      userId: "user-1",
      householdId: "hh-1",
    })
    resolveIsins.mockImplementation(
      async (_items: unknown[], onProgress?: (current: number, total: number) => void) => {
        onProgress?.(1, 1)
        return new Map([["IE00BK5BQT8V", { symbol: "EUNL.DE", name: "All-World", type: "ETF", currency: "EUR" }]])
      }
    )
  })

  it("preview route streams NDJSON progress and complete payload", async () => {
    const { POST } = await import("@/app/api/investments/import/trade-republic/preview/route")

    const csv = readFileSync(fixturePath, "utf-8")
    const form = new FormData()
    form.append("file", new File([csv], "export.csv", { type: "text/csv" }))
    form.append("account", "Trade Republic")

    const response = await POST(new Request("http://localhost/api/preview", { method: "POST", body: form }))
    expect(response.status).toBe(200)
    expect(response.headers.get("Content-Type")).toContain("ndjson")

    const phases: string[] = []
    const result = await readNdjsonStream(
      response,
      (e) => phases.push(e.phase),
      trImportPreviewCompleteSchema
    )

    expect(phases).toContain("parse")
    expect(phases).toContain("tickers")
    expect(result.previewId).toBeTruthy()
    expect(result.account).toBe("Trade Republic")
    expect(storePreview).toHaveBeenCalledOnce()
  })

  it("preview returns 401 without session", async () => {
    requireSession.mockResolvedValue({ error: "Nicht autorisiert", status: 401 })
    const { POST } = await import("@/app/api/investments/import/trade-republic/preview/route")

    const form = new FormData()
    form.append("file", new File(["x"], "export.csv", { type: "text/csv" }))
    const response = await POST(new Request("http://localhost/api/preview", { method: "POST", body: form }))
    expect(response.status).toBe(401)
    expect(storePreview).not.toHaveBeenCalled()
  })

  it("preview returns 429 when called twice within rate limit window", async () => {
    const { POST } = await import("@/app/api/investments/import/trade-republic/preview/route")

    const csv = readFileSync(fixturePath, "utf-8")
    const form = new FormData()
    form.append("file", new File([csv], "export.csv", { type: "text/csv" }))

    const first = await POST(new Request("http://localhost/api/preview", { method: "POST", body: form }))
    expect(first.status).toBe(200)
    await readNdjsonStream(first, () => {}, trImportPreviewCompleteSchema)

    const second = await POST(new Request("http://localhost/api/preview", { method: "POST", body: form }))
    expect(second.status).toBe(429)
  })

  it("apply route streams import progress and validated result", async () => {
    const { POST } = await import("@/app/api/investments/import/trade-republic/apply/route")

    getPreview.mockReturnValue({
      previewId: "preview-1",
      householdId: "hh-1",
      userId: "user-1",
      targetUserId: "user-1",
      account: "Trade Republic",
      parsedRows: [{ rowId: "r1", lineNumber: 1, date: "2024-01-01", importRef: "tr:1", eventType: "purchase" }],
      previewRows: [],
      createdAt: Date.now(),
    })
    applyTradeRepublicImport.mockImplementation(
      async (_tx: unknown, _input: unknown, onProgress?: (current: number, total: number) => void) => {
        onProgress?.(1, 1)
        return { created: 1, linked: 0, skipped: 0, errors: [] }
      }
    )

    const response = await POST(
      new Request("http://localhost/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ previewId: "preview-1", resolutions: {}, tickerOverrides: {} }),
      })
    )

    expect(response.status).toBe(200)

    const progress: number[] = []
    const result = await readNdjsonStream(
      response,
      (e) => progress.push(e.current),
      trImportApplyResultSchema
    )

    expect(progress.length).toBeGreaterThan(0)
    expect(result).toEqual({ created: 1, linked: 0, skipped: 0, errors: [] })
    expect(deletePreview).toHaveBeenCalledWith("preview-1")
  })
})
