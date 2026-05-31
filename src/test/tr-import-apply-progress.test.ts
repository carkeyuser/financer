import { describe, it, expect, vi } from "vitest"
import { applyTradeRepublicImport } from "@/lib/services/tr-import-apply"
import type { TrImportPreviewCacheEntry } from "@/lib/services/tr-import-preview-cache"
import type { TrImportPreviewRow, TrParsedRow } from "@/lib/services/tr-import-types"

const baseParsed = (overrides: Partial<TrParsedRow>): TrParsedRow => ({
  rowId: "row-1",
  lineNumber: 1,
  date: "2024-01-15",
  product: "Test",
  isin: "IE00BK5BQT8V",
  quantity: 1,
  price: 100,
  totalEur: 100,
  taxEur: null,
  orderId: null,
  importRef: "tr:1",
  eventType: "purchase",
  rawType: "buy",
  ...overrides,
})

const basePreviewRow = (overrides: Partial<TrImportPreviewRow>): TrImportPreviewRow => ({
  rowId: "row-1",
  lineNumber: 1,
  date: "2024-01-15",
  product: "Test",
  isin: "IE00BK5BQT8V",
  quantity: 1,
  price: 100,
  totalEur: 100,
  taxEur: null,
  orderId: null,
  importRef: "tr:1",
  eventType: "purchase",
  status: "import_new",
  matchedEntry: null,
  defaultResolution: "import",
  suggestedTicker: null,
  ...overrides,
})

describe("applyTradeRepublicImport progress", () => {
  it("reports progress for every row including skip and missing-ticker paths", async () => {
    const parsedRows = [
      baseParsed({ rowId: "orphan", lineNumber: 1 }),
      baseParsed({ rowId: "skip-row", lineNumber: 2 }),
      baseParsed({ rowId: "no-ticker", lineNumber: 3, isin: "DE0000000000" }),
    ]
    const previewRows = [
      basePreviewRow({ rowId: "skip-row", status: "skip_hard", defaultResolution: "skip" }),
      basePreviewRow({ rowId: "no-ticker", isin: "DE0000000000", suggestedTicker: null }),
    ]

    const preview: TrImportPreviewCacheEntry = {
      previewId: "p1",
      householdId: "hh1",
      userId: "u1",
      targetUserId: "u1",
      account: "Trade Republic",
      parsedRows,
      previewRows,
      createdAt: Date.now(),
    }

    const onProgress = vi.fn()
    const tx = {} as Parameters<typeof applyTradeRepublicImport>[0]

    await applyTradeRepublicImport(tx, { preview, resolutions: {}, tickerOverrides: {} }, onProgress)

    expect(onProgress).toHaveBeenCalledTimes(3)
    expect(onProgress).toHaveBeenNthCalledWith(1, 1, 3)
    expect(onProgress).toHaveBeenNthCalledWith(2, 2, 3)
    expect(onProgress).toHaveBeenNthCalledWith(3, 3, 3)
  })

  it("continues after invalid quantity/price instead of aborting", async () => {
    const parsedRows = [
      baseParsed({ rowId: "bad-row", lineNumber: 1, quantity: 0, price: 0, totalEur: null }),
      baseParsed({ rowId: "good-row", lineNumber: 2 }),
    ]
    const previewRows = [
      basePreviewRow({
        rowId: "bad-row",
        quantity: 0,
        price: 0,
        totalEur: null,
        suggestedTicker: { symbol: "VWCE.DE", name: "VWCE", type: "ETF", currency: "EUR" },
      }),
      basePreviewRow({
        rowId: "good-row",
        suggestedTicker: { symbol: "VWCE.DE", name: "VWCE", type: "ETF", currency: "EUR" },
      }),
    ]

    const preview: TrImportPreviewCacheEntry = {
      previewId: "p1",
      householdId: "hh1",
      userId: "u1",
      targetUserId: "u1",
      account: "Trade Republic",
      parsedRows,
      previewRows,
      createdAt: Date.now(),
    }

    const assetEntryCreate = vi.fn().mockResolvedValue({ id: "entry-1" })
    const assetUpdate = vi.fn().mockResolvedValue({})
    const assetFindFirst = vi.fn().mockResolvedValue(null)
    const assetFindUnique = vi.fn().mockResolvedValue({ id: "asset-1" })
    const tx = {
      asset: { findFirst: assetFindFirst, findUnique: assetFindUnique, create: vi.fn(), update: assetUpdate },
      assetEntry: { create: assetEntryCreate, findUnique: vi.fn(), delete: vi.fn(), update: vi.fn() },
    } as unknown as Parameters<typeof applyTradeRepublicImport>[0]

    const result = await applyTradeRepublicImport(
      tx,
      {
        preview,
        resolutions: {},
        tickerOverrides: { IE00BK5BQT8V: { symbol: "VWCE.DE", name: "VWCE", type: "ETF", currency: "EUR" } },
      }
    )

    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain("Ungültige Menge oder Preis")
    expect(result.skipped).toBe(1)
    expect(result.created).toBe(1)
    expect(assetEntryCreate).toHaveBeenCalledTimes(1)
  })
})
