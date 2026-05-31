import type { TrTickerMapping } from "@/lib/services/tr-import-ticker-mapping"
import type { TrImportPreviewRow, TrImportResolution, TrImportRowStatus, TrTickerOverride } from "@/lib/services/tr-import-types"

/** Lower = further up — errors first, auto-assigned last. */
export const ROW_STATUS_PRIORITY: Record<TrImportRowStatus, number> = {
  conflict: 0,
  needs_ticker: 1,
  skip_hard: 2,
  skip_soft: 3,
  ignored: 4,
  import_new: 5,
}

export function sortOverviewRows(rows: TrImportPreviewRow[]): TrImportPreviewRow[] {
  return [...rows].sort((a, b) => {
    const diff = ROW_STATUS_PRIORITY[a.status] - ROW_STATUS_PRIORITY[b.status]
    if (diff !== 0) return diff
    return a.lineNumber - b.lineNumber
  })
}

export function rowNeedsAttention(status: TrImportRowStatus): boolean {
  return status === "conflict" || status === "needs_ticker"
}

export function conflictRowNeedsAttention(
  row: TrImportPreviewRow,
  resolutions: Record<string, TrImportResolution>
): boolean {
  return row.status === "conflict" && !resolutions[row.rowId]
}

export function sortConflictRows(
  rows: TrImportPreviewRow[],
  resolutions: Record<string, TrImportResolution>
): TrImportPreviewRow[] {
  const priority = (row: TrImportPreviewRow) => {
    if (row.status === "conflict" && !resolutions[row.rowId]) return 0
    if (row.status === "conflict") return 1
    return 2
  }
  return [...rows].sort((a, b) => {
    const diff = priority(a) - priority(b)
    if (diff !== 0) return diff
    return a.lineNumber - b.lineNumber
  })
}

export function partitionConflictRows(
  rows: TrImportPreviewRow[],
  resolutions: Record<string, TrImportResolution>
) {
  const sorted = sortConflictRows(rows, resolutions)
  const needsAttention = sorted.filter((r) => conflictRowNeedsAttention(r, resolutions))
  const resolved = sorted.filter((r) => !conflictRowNeedsAttention(r, resolutions))
  return { needsAttention, resolved }
}

export function mappingNeedsReview(mapping: TrTickerMapping): boolean {
  return mapping.requiresManual || mapping.hasTickerConflict
}

export function tickerMappingNeedsAttention(
  mapping: TrTickerMapping,
  override: TrTickerOverride | undefined
): boolean {
  if (override?.symbol) return false
  return mapping.requiresManual || mapping.hasTickerConflict
}

export function sortTickerMappings(
  mappings: TrTickerMapping[],
  overrides: Record<string, TrTickerOverride>
): TrTickerMapping[] {
  const priority = (m: TrTickerMapping) => {
    if (tickerMappingNeedsAttention(m, overrides[m.isin])) {
      return m.requiresManual ? 0 : 1
    }
    return 2
  }
  return [...mappings].sort((a, b) => {
    const diff = priority(a) - priority(b)
    if (diff !== 0) return diff
    return a.isin.localeCompare(b.isin)
  })
}

export function mappingsNeedingReview(
  mappings: TrTickerMapping[],
  overrides: Record<string, TrTickerOverride>
): TrTickerMapping[] {
  return sortTickerMappings(
    mappings.filter((m) => mappingNeedsReview(m)),
    overrides
  )
}

export function partitionTickerMappings(
  mappings: TrTickerMapping[],
  overrides: Record<string, TrTickerOverride>
) {
  const sorted = sortTickerMappings(mappings, overrides)
  const needsAttention = sorted.filter((m) => tickerMappingNeedsAttention(m, overrides[m.isin]))
  const resolved = sorted.filter((m) => !tickerMappingNeedsAttention(m, overrides[m.isin]))
  return { needsAttention, resolved }
}
