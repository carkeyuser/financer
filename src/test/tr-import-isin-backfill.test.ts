import { describe, it, expect, vi } from "vitest"
import { applyTradeRepublicImport } from "@/lib/services/tr-import-apply"
import type { TrImportPreviewCacheEntry } from "@/lib/services/tr-import-preview-cache"
import type { TrImportPreviewRow, TrParsedRow } from "@/lib/services/tr-import-types"

const baseParsed = (overrides: Partial<TrParsedRow>): TrParsedRow => ({
  rowId: "row-1",
  lineNumber: 1,
  date: "2024-01-15",
  product: "Test ETF",
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
  product: "Test ETF",
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
  suggestedTicker: { symbol: "EUNL.DE", name: "All-World", type: "ETF", currency: "EUR" },
  ...overrides,
})

describe("TR import ISIN backfill", () => {
  it("backfills ISIN when existing asset matched by ticker without ISIN", async () => {
    const existingAsset = {
      id: "asset-existing",
      householdId: "hh1",
      userId: "u1",
      ticker: "EUNL.DE",
      isin: null,
    }

    const assetUpdate = vi.fn().mockResolvedValue({})
    const assetFindUnique = vi.fn().mockResolvedValue(existingAsset)
    const assetFindFirst = vi.fn().mockResolvedValue(null)
    const assetEntryCreate = vi.fn().mockResolvedValue({})
    const assetUpdateQty = vi.fn().mockResolvedValue({})

    const tx = {
      asset: {
        findUnique: assetFindUnique,
        findFirst: assetFindFirst,
        update: vi.fn((args: { where: { id: string }; data: { isin?: string; quantity?: unknown } }) => {
          if ("isin" in args.data) return assetUpdate(args)
          return assetUpdateQty(args)
        }),
        create: vi.fn(),
      },
      assetEntry: { create: assetEntryCreate, findUnique: vi.fn(), delete: vi.fn(), update: vi.fn() },
      dividendPayment: { create: vi.fn(), delete: vi.fn(), update: vi.fn() },
    }

    const preview: TrImportPreviewCacheEntry = {
      previewId: "p1",
      householdId: "hh1",
      userId: "u1",
      targetUserId: "u1",
      account: "Trade Republic",
      parsedRows: [baseParsed({})],
      previewRows: [basePreviewRow({})],
      createdAt: Date.now(),
    }

    await applyTradeRepublicImport(tx as never, { preview, resolutions: {}, tickerOverrides: {} })

    expect(assetUpdate).toHaveBeenCalledWith({
      where: { id: "asset-existing" },
      data: { isin: "IE00BK5BQT8V" },
    })
    expect(assetEntryCreate).toHaveBeenCalled()
  })
})
