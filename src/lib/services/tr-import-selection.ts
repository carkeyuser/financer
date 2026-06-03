import { isDateInRange } from "@/lib/services/tr-import-date-filter"
import { ROW_STATUS_PRIORITY } from "@/lib/services/tr-import-sort"
import type { TrImportEventType, TrImportPreviewRow, TrImportResolution } from "@/lib/services/tr-import-types"

export type TrImportSelectionPreset = "all" | "none" | "new_only" | "matched_only" | "with_value"

export function rowValueEur(row: TrImportPreviewRow): number {
  if (row.totalEur !== null && row.totalEur > 0) return row.totalEur
  if (row.quantity !== null && row.price !== null && row.quantity > 0 && row.price > 0) {
    return Math.abs(row.quantity * row.price)
  }
  if (row.taxEur !== null && row.taxEur > 0) return row.taxEur
  return 0
}

export function isSelectableRow(row: TrImportPreviewRow): boolean {
  return row.status !== "skip_hard" && row.status !== "ignored"
}

export function isRowSelected(row: TrImportPreviewRow, resolutions: Record<string, TrImportResolution>): boolean {
  if (!isSelectableRow(row)) return false
  const action = resolutions[row.rowId] ?? defaultResolutionForRow(row)
  return action !== "skip"
}

export function defaultResolutionForRow(row: TrImportPreviewRow): TrImportResolution {
  if (row.status === "import_new" || row.status === "needs_ticker") return "import"
  if (row.status === "skip_soft" && row.matchedEntry) return "link"
  return row.defaultResolution
}

export function resolutionForSelected(row: TrImportPreviewRow, selected: boolean): TrImportResolution {
  if (!selected) return "skip"
  if (row.status === "skip_soft" && row.matchedEntry) return "link"
  if (row.status === "conflict") return resolutionsOrImport(row)
  return "import"
}

function resolutionsOrImport(row: TrImportPreviewRow): TrImportResolution {
  return row.matchedEntry ? "link" : "import"
}

export function applySelectionPreset(
  preset: TrImportSelectionPreset,
  rows: TrImportPreviewRow[],
  current: Record<string, TrImportResolution>
): Record<string, TrImportResolution> {
  const next = { ...current }
  for (const row of rows) {
    if (!isSelectableRow(row)) continue
    const selected = rowMatchesPreset(row, preset)
    next[row.rowId] = resolutionForSelected(row, selected)
  }
  return next
}

function rowMatchesPreset(row: TrImportPreviewRow, preset: TrImportSelectionPreset): boolean {
  switch (preset) {
    case "all":
      return true
    case "none":
      return false
    case "new_only":
      return row.status === "import_new"
    case "matched_only":
      return row.status === "skip_soft" && row.matchedEntry !== null
    case "with_value":
      return rowValueEur(row) > 0
  }
}

export function sortSelectionRows(rows: TrImportPreviewRow[]): TrImportPreviewRow[] {
  return [...rows].sort((a, b) => {
    const valueA = rowValueEur(a)
    const valueB = rowValueEur(b)
    const aHasValue = valueA > 0
    const bHasValue = valueB > 0
    if (aHasValue !== bHasValue) return aHasValue ? -1 : 1
    if (aHasValue && bHasValue && valueA !== valueB) return valueB - valueA
    const statusDiff = ROW_STATUS_PRIORITY[a.status] - ROW_STATUS_PRIORITY[b.status]
    if (statusDiff !== 0) return statusDiff
    return a.lineNumber - b.lineNumber
  })
}

export function buildInitialResolutions(rows: TrImportPreviewRow[]): Record<string, TrImportResolution> {
  const resolutions: Record<string, TrImportResolution> = {}
  for (const row of rows) {
    if (!isSelectableRow(row)) continue
    resolutions[row.rowId] = defaultResolutionForRow(row)
  }
  return resolutions
}

export function countSelectedRows(
  rows: TrImportPreviewRow[],
  resolutions: Record<string, TrImportResolution>
): { selected: number; total: number } {
  const selectable = rows.filter(isSelectableRow)
  const selected = selectable.filter((row) => isRowSelected(row, resolutions)).length
  return { selected, total: selectable.length }
}

export function resolveImportAction(
  row: TrImportPreviewRow,
  resolutions: Record<string, TrImportResolution>
): TrImportResolution {
  if (row.status === "skip_hard" || row.status === "ignored") return "skip"
  return resolutions[row.rowId] ?? defaultResolutionForRow(row)
}

export function isTradeRow(row: TrImportPreviewRow): boolean {
  return row.eventType === "purchase" || row.eventType === "sale" || row.eventType === "interest"
}

export function isDividendRow(row: TrImportPreviewRow): boolean {
  return row.eventType === "dividend"
}

export function rowDividendAmounts(row: TrImportPreviewRow): { gross: number; tax: number; net: number } {
  const gross = row.totalEur ?? 0
  const tax = row.taxEur ?? 0
  return { gross, tax, net: gross - tax }
}

export function dividendPositionLabel(row: TrImportPreviewRow): string | null {
  if (row.matchedEntry?.ticker) return row.matchedEntry.ticker
  if (row.suggestedTicker?.symbol) return row.suggestedTicker.symbol
  return null
}

export function filterSelectionRows(
  rows: TrImportPreviewRow[],
  options: {
    statusFilter: string
    dateFrom: string
    dateTo: string
    showOutsideRange: boolean
    eventTypes?: TrImportEventType[]
  }
): TrImportPreviewRow[] {
  let filtered = rows
  if (options.eventTypes?.length) {
    filtered = filtered.filter((row) => options.eventTypes!.includes(row.eventType))
  }
  if (options.statusFilter !== "all") {
    filtered = filtered.filter((row) => row.status === options.statusFilter)
  }
  if (!options.showOutsideRange) {
    filtered = filtered.filter((row) => isDateInRange(row.date, options.dateFrom, options.dateTo))
  }
  return sortSelectionRows(filtered)
}

export function inRangeSelectableRows(
  rows: TrImportPreviewRow[],
  dateFrom: string,
  dateTo: string
): TrImportPreviewRow[] {
  return rows.filter((row) => isSelectableRow(row) && isDateInRange(row.date, dateFrom, dateTo))
}
