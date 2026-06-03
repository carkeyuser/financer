import { defaultResolutionForRow, isSelectableRow } from "@/lib/services/tr-import-selection"
import type { TrImportPreviewRow, TrImportResolution } from "@/lib/services/tr-import-types"

export interface TrImportDateRange {
  from: string
  to: string
}

export function computeDateRangeFromRows(rows: TrImportPreviewRow[]): TrImportDateRange | null {
  if (rows.length === 0) return null
  let from = rows[0].date
  let to = rows[0].date
  for (const row of rows) {
    if (row.date < from) from = row.date
    if (row.date > to) to = row.date
  }
  return { from, to }
}

export function normalizeDateRange(from: string, to: string): TrImportDateRange {
  if (!from || !to) return { from, to }
  return from <= to ? { from, to } : { from: to, to: from }
}

export function isDateInRange(date: string, from: string, to: string): boolean {
  if (!from || !to) return true
  const { from: start, to: end } = normalizeDateRange(from, to)
  return date >= start && date <= end
}

export function applyDateRangeToResolutions(
  rows: TrImportPreviewRow[],
  from: string,
  to: string
): Record<string, TrImportResolution> {
  const resolutions: Record<string, TrImportResolution> = {}
  for (const row of rows) {
    if (!isSelectableRow(row)) continue
    resolutions[row.rowId] = isDateInRange(row.date, from, to)
      ? defaultResolutionForRow(row)
      : "skip"
  }
  return resolutions
}

export function buildInitialResolutionsWithDateRange(
  rows: TrImportPreviewRow[],
  from: string,
  to: string
): Record<string, TrImportResolution> {
  return applyDateRangeToResolutions(rows, from, to)
}

export function filterRowsByDateVisibility(
  rows: TrImportPreviewRow[],
  from: string,
  to: string,
  showOutsideRange: boolean
): TrImportPreviewRow[] {
  if (showOutsideRange) return rows
  return rows.filter((row) => isDateInRange(row.date, from, to))
}
