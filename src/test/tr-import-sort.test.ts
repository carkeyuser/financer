import { describe, it, expect } from "vitest"
import {
  partitionConflictRows,
  partitionTickerMappings,
  mappingsNeedingReview,
  sortOverviewRows,
} from "@/lib/services/tr-import-sort"
import type { TrImportPreviewRow } from "@/lib/services/tr-import-types"
import type { TrTickerMapping } from "@/lib/services/tr-import-ticker-mapping"

const baseRow = (overrides: Partial<TrImportPreviewRow>): TrImportPreviewRow => ({
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
  ...overrides,
})

const baseMapping = (overrides: Partial<TrTickerMapping>): TrTickerMapping => ({
  isin: "IE00BK5BQT8V",
  productName: "Test ETF",
  transactionCount: 2,
  source: "yahoo",
  suggestedTicker: { symbol: "VWCE.DE", name: "VWCE", type: "ETF", currency: "EUR" },
  portfolioTicker: null,
  yahooTicker: { symbol: "VWCE.DE", name: "VWCE", type: "ETF", currency: "EUR" },
  requiresManual: false,
  hasTickerConflict: false,
  ...overrides,
})

describe("sortOverviewRows", () => {
  it("puts conflicts before import_new", () => {
    const rows = sortOverviewRows([
      baseRow({ rowId: "a", status: "import_new", lineNumber: 1 }),
      baseRow({ rowId: "b", status: "conflict", lineNumber: 2 }),
    ])
    expect(rows[0].status).toBe("conflict")
  })
})

describe("partitionConflictRows", () => {
  it("separates unresolved conflicts from resolved", () => {
    const rows = [
      baseRow({ rowId: "c1", status: "conflict", lineNumber: 10 }),
      baseRow({ rowId: "s1", status: "skip_soft", lineNumber: 5 }),
      baseRow({ rowId: "c2", status: "conflict", lineNumber: 20 }),
    ]
    const { needsAttention, resolved } = partitionConflictRows(rows, { c2: "skip" })
    expect(needsAttention.map((r) => r.rowId)).toEqual(["c1"])
    expect(resolved.map((r) => r.rowId)).toEqual(["c2", "s1"])
  })
})

describe("partitionTickerMappings", () => {
  it("separates manual mappings from auto-mapped", () => {
    const mappings = [
      baseMapping({ isin: "AAA" }),
      baseMapping({ isin: "BBB", requiresManual: true, suggestedTicker: null, yahooTicker: null }),
    ]
    const { needsAttention, resolved } = partitionTickerMappings(mappings, {})
    expect(needsAttention).toHaveLength(1)
    expect(needsAttention[0].isin).toBe("BBB")
    expect(resolved).toHaveLength(1)
    expect(resolved[0].isin).toBe("AAA")
  })
})

describe("mappingsNeedingReview", () => {
  it("includes conflicts and manual only", () => {
    const mappings = [
      baseMapping({ isin: "AAA" }),
      baseMapping({ isin: "BBB", hasTickerConflict: true }),
    ]
    expect(mappingsNeedingReview(mappings, {}).map((m) => m.isin)).toEqual(["BBB"])
  })
})
