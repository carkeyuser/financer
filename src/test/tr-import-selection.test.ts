import { describe, it, expect } from "vitest"
import {
  applySelectionPreset,
  buildInitialResolutions,
  countSelectedRows,
  isRowSelected,
  isSelectableRow,
  resolveImportAction,
  rowValueEur,
  sortSelectionRows,
} from "@/lib/services/tr-import-selection"
import type { TrImportPreviewRow } from "@/lib/services/tr-import-types"

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

describe("rowValueEur", () => {
  it("prefers totalEur", () => {
    expect(rowValueEur(baseRow({ totalEur: 427.5, quantity: 5, price: 85.5 }))).toBe(427.5)
  })

  it("derives from quantity and price", () => {
    expect(rowValueEur(baseRow({ totalEur: null, quantity: 5, price: 85.5 }))).toBeCloseTo(427.5)
  })

  it("returns 0 when no amounts", () => {
    expect(rowValueEur(baseRow({ totalEur: null, quantity: 0, price: null }))).toBe(0)
  })
})

describe("sortSelectionRows", () => {
  it("puts valued rows above zero-value rows", () => {
    const rows = sortSelectionRows([
      baseRow({ rowId: "zero", totalEur: 0, quantity: 0, price: null }),
      baseRow({ rowId: "high", totalEur: 500 }),
      baseRow({ rowId: "low", totalEur: 10 }),
    ])
    expect(rows.map((r) => r.rowId)).toEqual(["high", "low", "zero"])
  })
})

describe("applySelectionPreset", () => {
  it("selects only new rows with new_only preset", () => {
    const rows = [
      baseRow({ rowId: "new", status: "import_new" }),
      baseRow({ rowId: "soft", status: "skip_soft", defaultResolution: "skip" }),
    ]
    const resolutions = applySelectionPreset("new_only", rows, {})
    expect(isRowSelected(rows[0], resolutions)).toBe(true)
    expect(isRowSelected(rows[1], resolutions)).toBe(false)
  })

  it("selects matched soft duplicates with matched_only preset", () => {
    const rows = [
      baseRow({ rowId: "new", status: "import_new" }),
      baseRow({
        rowId: "soft",
        status: "skip_soft",
        defaultResolution: "skip",
        matchedEntry: {
          id: "e1",
          kind: "asset_entry",
          date: "2024-01-15",
          assetName: "Test",
          ticker: "VWCE.DE",
          quantity: 1,
          price: 100,
          amountEur: null,
          type: "PURCHASE",
        },
      }),
    ]
    const resolutions = applySelectionPreset("matched_only", rows, {})
    expect(isRowSelected(rows[0], resolutions)).toBe(false)
    expect(isRowSelected(rows[1], resolutions)).toBe(true)
    expect(resolutions.soft).toBe("link")
  })
})

describe("resolveImportAction", () => {
  it("allows skipping import_new via resolutions", () => {
    const row = baseRow({ status: "import_new" })
    expect(resolveImportAction(row, { "row-1": "skip" })).toBe("skip")
    expect(resolveImportAction(row, {})).toBe("import")
  })

  it("always skips hard duplicates", () => {
    const row = baseRow({ status: "skip_hard", defaultResolution: "skip" })
    expect(resolveImportAction(row, { "row-1": "import" })).toBe("skip")
  })
})

describe("buildInitialResolutions", () => {
  it("selects new rows and skips hard duplicates", () => {
    const rows = [
      baseRow({ rowId: "new", status: "import_new" }),
      baseRow({ rowId: "hard", status: "skip_hard", defaultResolution: "skip" }),
    ]
    const resolutions = buildInitialResolutions(rows)
    expect(resolutions.new).toBe("import")
    expect(resolutions.hard).toBeUndefined()
    expect(countSelectedRows(rows, resolutions)).toEqual({ selected: 1, total: 1 })
  })
})

describe("isSelectableRow", () => {
  it("excludes hard skip and ignored", () => {
    expect(isSelectableRow(baseRow({ status: "import_new" }))).toBe(true)
    expect(isSelectableRow(baseRow({ status: "skip_hard" }))).toBe(false)
    expect(isSelectableRow(baseRow({ status: "ignored" }))).toBe(false)
  })
})
