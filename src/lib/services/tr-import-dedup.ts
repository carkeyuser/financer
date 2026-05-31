import type { AssetEntryType } from "@/generated/prisma"
import type { ResolvedSecurity } from "@/lib/services/isin-resolver"
import type { TrImportPreviewRow, TrImportResolution, TrImportRowStatus, TrImportSummary, TrMatchedEntry, TrParsedRow, TrTickerOverride } from "@/lib/services/tr-import-types"

const QTY_TOLERANCE = 0.001
const PRICE_TOLERANCE_RATIO = 0.02
const DATE_TOLERANCE_MS = 24 * 60 * 60 * 1000

export interface ExistingAssetEntry {
  id: string
  assetId: string
  type: AssetEntryType
  price: string
  quantity: string | null
  date: Date
  importRef: string | null
  asset: {
    id: string
    ticker: string
    name: string
    isin: string | null
    userId: string
  }
}

export interface ExistingDividend {
  id: string
  exDate: Date
  grossAmount: string
  taxAmount: string
  netAmount: string
  quantity: string
  importRef: string | null
  asset: {
    id: string
    ticker: string
    name: string
    isin: string | null
    userId: string
  }
}

export interface DedupContext {
  existingImportRefs: Set<string>
  assetEntries: ExistingAssetEntry[]
  dividends: ExistingDividend[]
  isinResolutions: Map<string, ResolvedSecurity | null>
}

export function buildPreviewRows(parsed: TrParsedRow[], ctx: DedupContext): TrImportPreviewRow[] {
  const rows = parsed.map((row) => classifyRow(row, ctx))
  return rows
}

export function summarizePreviewRows(rows: TrImportPreviewRow[]): TrImportSummary {
  return {
    importNew: rows.filter((r) => r.status === "import_new").length,
    skipHard: rows.filter((r) => r.status === "skip_hard").length,
    skipSoft: rows.filter((r) => r.status === "skip_soft").length,
    conflict: rows.filter((r) => r.status === "conflict").length,
    needsTicker: rows.filter((r) => r.status === "needs_ticker").length,
    ignored: rows.filter((r) => r.status === "ignored").length,
    tickersToReview: 0,
  }
}

function classifyRow(row: TrParsedRow, ctx: DedupContext): TrImportPreviewRow {
  if (row.eventType === "ignored") {
    return toPreviewRow(row, "ignored", null, null, "skip")
  }

  if (ctx.existingImportRefs.has(row.importRef)) {
    return toPreviewRow(row, "skip_hard", null, null, "skip")
  }

  const needsTicker =
    row.eventType !== "interest" && row.isin && !ctx.isinResolutions.get(row.isin.toUpperCase())
  if (needsTicker) {
    return toPreviewRow(row, "needs_ticker", null, null, "import")
  }

  const match = findSoftMatch(row, ctx)
  if (match) {
    if (match.kind === "conflict") {
      return toPreviewRow(row, "conflict", match.entry, null, "skip")
    }
    return toPreviewRow(row, "skip_soft", match.entry, null, "skip")
  }

  return toPreviewRow(row, "import_new", null, suggestedTicker(row, ctx), "import")
}

function suggestedTicker(row: TrParsedRow, ctx: DedupContext): TrTickerOverride | null {
  if (!row.isin) return null
  const resolved = ctx.isinResolutions.get(row.isin.toUpperCase())
  if (!resolved) return null
  return {
    symbol: resolved.symbol,
    name: resolved.name,
    type: resolved.type,
    currency: resolved.currency,
  }
}

function toPreviewRow(
  row: TrParsedRow,
  status: TrImportRowStatus,
  matchedEntry: TrMatchedEntry | null,
  suggestedTickerValue: TrTickerOverride | null,
  defaultResolution: TrImportResolution
): TrImportPreviewRow {
  return {
    rowId: row.rowId,
    lineNumber: row.lineNumber,
    status,
    eventType: row.eventType,
    date: row.date,
    product: row.product,
    isin: row.isin,
    quantity: row.quantity,
    price: row.price,
    totalEur: row.totalEur,
    taxEur: row.taxEur,
    orderId: row.orderId,
    importRef: row.importRef,
    suggestedTicker: suggestedTickerValue,
    matchedEntry,
    defaultResolution,
  }
}

function findSoftMatch(
  row: TrParsedRow,
  ctx: DedupContext
): { kind: "soft" | "conflict"; entry: TrMatchedEntry } | null {
  if (row.eventType === "interest") {
    return matchDividend(row, ctx.dividends)
  }
  if (row.eventType === "dividend") {
    return matchDividend(row, ctx.dividends)
  }
  return matchAssetEntry(row, ctx.assetEntries)
}

function matchAssetEntry(
  row: TrParsedRow,
  entries: ExistingAssetEntry[]
): { kind: "soft" | "conflict"; entry: TrMatchedEntry } | null {
  const candidates = entries.filter((e) => !e.importRef && entryTypeMatches(row.eventType, e.type))
  for (const entry of candidates) {
    if (!sameIsinOrTicker(row, entry.asset.isin, entry.asset.ticker)) continue
    if (!datesClose(row.date, entry.date)) continue

    const entryQty = entry.quantity ? Math.abs(parseFloat(entry.quantity)) : null
    const rowQty = row.quantity
    const entryPrice = parseFloat(entry.price)
    const rowPrice = row.price

    const qtyMatch =
      entryQty === null ||
      rowQty === null ||
      Math.abs(entryQty - rowQty) <= QTY_TOLERANCE
    const priceMatch =
      rowPrice === null ||
      Number.isNaN(entryPrice) ||
      Math.abs(entryPrice - rowPrice) / Math.max(entryPrice, rowPrice, 0.000001) <= PRICE_TOLERANCE_RATIO

    const matched = toMatchedAssetEntry(entry)
    if (qtyMatch && priceMatch) return { kind: "soft", entry: matched }
    if (datesClose(row.date, entry.date, 0)) return { kind: "conflict", entry: matched }
  }
  return null
}

function matchDividend(
  row: TrParsedRow,
  dividends: ExistingDividend[]
): { kind: "soft" | "conflict"; entry: TrMatchedEntry } | null {
  for (const div of dividends) {
    if (div.importRef) continue
    if (row.eventType === "dividend" && row.isin && !sameIsinOrTicker(row, div.asset.isin, div.asset.ticker)) continue
    if (!datesClose(row.date, div.exDate)) continue

    const gross = parseFloat(div.grossAmount)
    const rowAmount = row.totalEur ?? row.quantity
    const amountMatch =
      rowAmount === null ||
      Math.abs(gross - rowAmount) / Math.max(gross, rowAmount, 0.000001) <= PRICE_TOLERANCE_RATIO

    const matched = toMatchedDividend(div)
    if (amountMatch) return { kind: "soft", entry: matched }
    return { kind: "conflict", entry: matched }
  }
  return null
}

function entryTypeMatches(eventType: TrParsedRow["eventType"], entryType: AssetEntryType): boolean {
  if (eventType === "purchase") return entryType === "PURCHASE"
  if (eventType === "sale") return entryType === "SALE"
  return false
}

function sameIsinOrTicker(row: TrParsedRow, assetIsin: string | null, ticker: string): boolean {
  if (row.isin && assetIsin && row.isin.toUpperCase() === assetIsin.toUpperCase()) return true
  return false
}

function datesClose(isoDate: string, dbDate: Date, toleranceDays = 1): boolean {
  const a = new Date(`${isoDate}T12:00:00.000Z`).getTime()
  const b = new Date(dbDate).setUTCHours(12, 0, 0, 0)
  return Math.abs(a - b) <= DATE_TOLERANCE_MS * toleranceDays
}

function toMatchedAssetEntry(entry: ExistingAssetEntry): TrMatchedEntry {
  return {
    id: entry.id,
    kind: "asset_entry",
    date: entry.date.toISOString().slice(0, 10),
    assetName: entry.asset.name,
    ticker: entry.asset.ticker,
    quantity: entry.quantity ? parseFloat(entry.quantity) : null,
    price: parseFloat(entry.price),
    amountEur: null,
    type: entry.type,
  }
}

function toMatchedDividend(div: ExistingDividend): TrMatchedEntry {
  return {
    id: div.id,
    kind: "dividend",
    date: div.exDate.toISOString().slice(0, 10),
    assetName: div.asset.name,
    ticker: div.asset.ticker,
    quantity: parseFloat(div.quantity),
    price: null,
    amountEur: parseFloat(div.grossAmount),
    type: "DIVIDEND",
  }
}

export function rowNeedsResolution(row: TrImportPreviewRow): boolean {
  return row.status === "conflict" || row.status === "skip_soft"
}

export function rowNeedsTicker(row: TrImportPreviewRow): boolean {
  return row.status === "needs_ticker"
}

export function isResolvable(rows: TrImportPreviewRow[], resolutions: Record<string, TrImportResolution>): boolean {
  return rows.every((row) => {
    if (rowNeedsResolution(row)) return !!resolutions[row.rowId]
    if (rowNeedsTicker(row)) return !!resolutions[`ticker:${row.isin}`]
    return true
  })
}
