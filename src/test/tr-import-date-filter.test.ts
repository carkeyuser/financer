import { describe, it, expect } from "vitest"
import {
  applyDateRangeToResolutions,
  computeDateRangeFromRows,
  isDateInRange,
  normalizeDateRange,
} from "@/lib/services/tr-import-date-filter"
import {
  filterSelectionRows,
  inRangeSelectableRows,
  isDividendRow,
  isRowSelected,
  isTradeRow,
  rowDividendAmounts,
} from "@/lib/services/tr-import-selection"
import type { TrImportPreviewRow } from "@/lib/services/tr-import-types"

const baseRow = (overrides: Partial<TrImportPreviewRow>): TrImportPreviewRow => ({
  rowId: "row-1",
  lineNumber: 1,
  date: "2024-06-15",
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

describe("tr-import-date-filter", () => {
  it("computes min/max from rows", () => {
    const range = computeDateRangeFromRows([
      baseRow({ date: "2024-03-01" }),
      baseRow({ date: "2024-12-31" }),
      baseRow({ date: "2024-06-15" }),
    ])
    expect(range).toEqual({ from: "2024-03-01", to: "2024-12-31" })
  })

  it("normalizes swapped from/to", () => {
    expect(normalizeDateRange("2024-12-01", "2024-01-01")).toEqual({
      from: "2024-01-01",
      to: "2024-12-01",
    })
  })

  it("selects in-range rows and skips outside range", () => {
    const rows = [
      baseRow({ rowId: "in", date: "2024-06-01", status: "import_new" }),
      baseRow({ rowId: "out", date: "2023-01-01", status: "import_new" }),
    ]
    const resolutions = applyDateRangeToResolutions(rows, "2024-01-01", "2024-12-31")
    expect(isRowSelected(rows[0], resolutions)).toBe(true)
    expect(isRowSelected(rows[1], resolutions)).toBe(false)
    expect(resolutions.out).toBe("skip")
  })
})

describe("filterSelectionRows", () => {
  it("splits trades and dividends", () => {
    const rows = [
      baseRow({ rowId: "trade", eventType: "purchase" }),
      baseRow({ rowId: "div", eventType: "dividend", totalEur: 42, taxEur: 10 }),
    ]
    expect(isTradeRow(rows[0])).toBe(true)
    expect(isDividendRow(rows[1])).toBe(true)

    const trades = filterSelectionRows(rows, {
      statusFilter: "all",
      dateFrom: "2024-01-01",
      dateTo: "2024-12-31",
      showOutsideRange: true,
      eventTypes: ["purchase", "sale", "interest"],
    })
    const dividends = filterSelectionRows(rows, {
      statusFilter: "all",
      dateFrom: "2024-01-01",
      dateTo: "2024-12-31",
      showOutsideRange: true,
      eventTypes: ["dividend"],
    })
    expect(trades.map((r) => r.rowId)).toEqual(["trade"])
    expect(dividends.map((r) => r.rowId)).toEqual(["div"])
  })

  it("hides outside-range rows when toggle is off", () => {
    const rows = [
      baseRow({ rowId: "in", date: "2024-06-01" }),
      baseRow({ rowId: "out", date: "2020-01-01" }),
    ]
    const visible = filterSelectionRows(rows, {
      statusFilter: "all",
      dateFrom: "2024-01-01",
      dateTo: "2024-12-31",
      showOutsideRange: false,
    })
    expect(visible.map((r) => r.rowId)).toEqual(["in"])
  })

  it("marks outside rows with isDateInRange", () => {
    expect(isDateInRange("2024-06-01", "2024-01-01", "2024-12-31")).toBe(true)
    expect(isDateInRange("2020-01-01", "2024-01-01", "2024-12-31")).toBe(false)
  })
})

describe("rowDividendAmounts", () => {
  it("derives net from gross and tax", () => {
    expect(rowDividendAmounts(baseRow({ totalEur: 100, taxEur: 26.375 }))).toEqual({
      gross: 100,
      tax: 26.375,
      net: 73.625,
    })
  })
})

describe("inRangeSelectableRows", () => {
  it("returns only selectable rows in range", () => {
    const rows = [
      baseRow({ rowId: "in", date: "2024-06-01", status: "import_new" }),
      baseRow({ rowId: "out", date: "2020-01-01", status: "import_new" }),
      baseRow({ rowId: "hard", date: "2024-06-02", status: "skip_hard" }),
    ]
    expect(inRangeSelectableRows(rows, "2024-01-01", "2024-12-31").map((r) => r.rowId)).toEqual(["in"])
  })
})
