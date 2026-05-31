import type { Prisma } from "@/generated/prisma"
import { INTEREST_ASSET_TICKER, INTEREST_ASSET_NAME } from "@/lib/constants/interest-asset"
import { tickerOverrideKey } from "@/lib/services/tr-import-ticker-mapping"
import { formatInvalidTradeError, resolveTradeQuantityPrice } from "@/lib/services/trade-republic-csv"
import { resolveImportAction } from "@/lib/services/tr-import-selection"
import type { TrImportPreviewCacheEntry } from "@/lib/services/tr-import-preview-cache"
import type { TrImportResolution, TrParsedRow, TrTickerOverride } from "@/lib/services/tr-import-types"
import type { TrImportPreviewRow } from "@/lib/services/tr-import-types"

export interface ApplyImportInput {
  preview: TrImportPreviewCacheEntry
  resolutions: Record<string, TrImportResolution>
  tickerOverrides: Record<string, TrTickerOverride>
}

export interface ApplyImportResult {
  created: number
  linked: number
  skipped: number
  errors: string[]
}

type Tx = Prisma.TransactionClient

export async function applyTradeRepublicImport(
  tx: Tx,
  input: ApplyImportInput,
  onProgress?: (current: number, total: number) => void
): Promise<ApplyImportResult> {
  const result: ApplyImportResult = { created: 0, linked: 0, skipped: 0, errors: [] }
  const { preview, resolutions, tickerOverrides } = input
  const previewById = new Map(preview.previewRows.map((r) => [r.rowId, r]))
  const assetCache = new Map<string, string>()

  const sortedParsed = [...preview.parsedRows].sort((a, b) => a.date.localeCompare(b.date))
  const total = sortedParsed.length
  let current = 0

  for (const parsed of sortedParsed) {
    try {
      const previewRow = previewById.get(parsed.rowId)
      if (!previewRow) continue

      const resolution = resolveImportAction(previewRow, resolutions)
      if (resolution === "skip") {
        result.skipped++
        continue
      }

      if (parsed.eventType === "interest") {
        await applyInterest(tx, preview, parsed, previewRow, resolution, result)
        continue
      }

      const tickerInfo = resolveTicker(parsed, previewRow, tickerOverrides)
      if (!tickerInfo) {
        result.errors.push(`Zeile ${parsed.lineNumber}: Ticker fehlt für ${parsed.isin ?? parsed.product}`)
        result.skipped++
        continue
      }

      if (parsed.eventType === "dividend") {
        await applyDividend(tx, preview, parsed, previewRow, resolution, tickerInfo!, assetCache, result)
      } else if (parsed.eventType === "purchase" || parsed.eventType === "sale") {
        await applyTrade(tx, preview, parsed, previewRow, resolution, tickerInfo!, assetCache, result)
      }
    } catch (err) {
      result.errors.push(`Zeile ${parsed.lineNumber}: ${err instanceof Error ? err.message : "Unbekannter Fehler"}`)
      result.skipped++
    } finally {
      current++
      onProgress?.(current, total)
    }
  }

  return result
}

function resolveTicker(
  parsed: TrParsedRow,
  previewRow: TrImportPreviewRow,
  overrides: Record<string, TrTickerOverride>
): TrTickerOverride | null {
  const key = tickerOverrideKey(parsed)
  if (overrides[key]) return overrides[key]
  if (previewRow.suggestedTicker) return previewRow.suggestedTicker
  return null
}

async function getOrCreateAsset(
  tx: Tx,
  preview: TrImportPreviewCacheEntry,
  parsed: TrParsedRow,
  tickerInfo: TrTickerOverride,
  assetCache: Map<string, string>
) {
  const cacheKey = `${preview.targetUserId}:${tickerInfo.symbol}`
  if (assetCache.has(cacheKey)) return assetCache.get(cacheKey)!

  if (parsed.isin) {
    const isinKey = parsed.isin.trim().toUpperCase()
    const isinCacheKey = `${preview.targetUserId}:isin:${isinKey}`
    if (assetCache.has(isinCacheKey)) {
      const id = assetCache.get(isinCacheKey)!
      assetCache.set(cacheKey, id)
      return id
    }

    const byIsin = await tx.asset.findFirst({
      where: {
        householdId: preview.householdId,
        userId: preview.targetUserId,
        isin: { equals: isinKey, mode: "insensitive" },
      },
    })

    if (byIsin) {
      assetCache.set(isinCacheKey, byIsin.id)
      assetCache.set(cacheKey, byIsin.id)
      return byIsin.id
    }
  }

  const existing = await tx.asset.findUnique({
    where: {
      householdId_userId_ticker: {
        householdId: preview.householdId,
        userId: preview.targetUserId,
        ticker: tickerInfo.symbol,
      },
    },
  })

  if (existing) {
    if (parsed.isin && !existing.isin) {
      const isinKey = parsed.isin.trim().toUpperCase()
      await tx.asset.update({ where: { id: existing.id }, data: { isin: isinKey } })
    }
    assetCache.set(cacheKey, existing.id)
    if (parsed.isin) {
      assetCache.set(`${preview.targetUserId}:isin:${parsed.isin.trim().toUpperCase()}`, existing.id)
    }
    return existing.id
  }

  const created = await tx.asset.create({
    data: {
      householdId: preview.householdId,
      userId: preview.targetUserId,
      ticker: tickerInfo.symbol,
      name: tickerInfo.name || parsed.product,
      type: tickerInfo.type,
      currency: tickerInfo.currency,
      account: preview.account,
      isin: parsed.isin,
      quantity: "0",
    },
  })
  assetCache.set(cacheKey, created.id)
  if (parsed.isin) {
    assetCache.set(`${preview.targetUserId}:isin:${parsed.isin.trim().toUpperCase()}`, created.id)
  }
  return created.id
}

async function applyTrade(
  tx: Tx,
  preview: TrImportPreviewCacheEntry,
  parsed: TrParsedRow,
  previewRow: TrImportPreviewRow,
  resolution: TrImportResolution,
  tickerInfo: TrTickerOverride,
  assetCache: Map<string, string>,
  result: ApplyImportResult
) {
  if (resolution === "link" && previewRow.matchedEntry?.kind === "asset_entry") {
    await tx.assetEntry.update({
      where: { id: previewRow.matchedEntry.id },
      data: { importRef: parsed.importRef },
    })
    result.linked++
    return
  }

  if (resolution === "replace" && previewRow.matchedEntry?.kind === "asset_entry") {
    const old = await tx.assetEntry.findUnique({
      where: { id: previewRow.matchedEntry.id },
      include: { asset: true },
    })
    if (old?.quantity && old.type === "PURCHASE") {
      await tx.asset.update({
        where: { id: old.assetId },
        data: { quantity: { decrement: old.quantity } },
      })
    } else if (old?.quantity && old.type === "SALE") {
      await tx.asset.update({
        where: { id: old.assetId },
        data: { quantity: { increment: old.quantity } },
      })
    }
    await tx.assetEntry.delete({ where: { id: previewRow.matchedEntry.id } })
  }

  const assetId = await getOrCreateAsset(tx, preview, parsed, tickerInfo, assetCache)
  const entryType = parsed.eventType === "sale" ? "SALE" : "PURCHASE"
  const { qty, price } = resolveTradeQuantityPrice(parsed)
  if (qty <= 0 || price <= 0) {
    throw new Error(formatInvalidTradeError(parsed))
  }

  await tx.assetEntry.create({
    data: {
      assetId,
      type: entryType,
      price: price.toString(),
      quantity: qty.toString(),
      date: new Date(`${parsed.date}T12:00:00.000Z`),
      note: parsed.orderId ? `TR Import ${parsed.orderId}` : "TR Import",
      importRef: parsed.importRef,
    },
  })

  await tx.asset.update({
    where: { id: assetId },
    data: entryType === "PURCHASE" ? { quantity: { increment: qty } } : { quantity: { decrement: qty } },
  })

  result.created++
}

async function applyDividend(
  tx: Tx,
  preview: TrImportPreviewCacheEntry,
  parsed: TrParsedRow,
  previewRow: TrImportPreviewRow,
  resolution: TrImportResolution,
  tickerInfo: TrTickerOverride,
  assetCache: Map<string, string>,
  result: ApplyImportResult
) {
  if (resolution === "link" && previewRow.matchedEntry?.kind === "dividend") {
    await tx.dividendPayment.update({
      where: { id: previewRow.matchedEntry.id },
      data: { importRef: parsed.importRef },
    })
    result.linked++
    return
  }

  if (resolution === "replace" && previewRow.matchedEntry?.kind === "dividend") {
    await tx.dividendPayment.delete({ where: { id: previewRow.matchedEntry.id } })
  }

  const assetId = await getOrCreateAsset(tx, preview, parsed, tickerInfo, assetCache)
  const gross = parsed.totalEur ?? 0
  const tax = parsed.taxEur ?? 0
  const net = gross - tax
  const qty = parsed.quantity ?? 0

  await tx.dividendPayment.create({
    data: {
      householdId: preview.householdId,
      assetId,
      userId: preview.targetUserId,
      year: new Date(`${parsed.date}T12:00:00.000Z`).getUTCFullYear(),
      exDate: new Date(`${parsed.date}T12:00:00.000Z`),
      payDate: new Date(`${parsed.date}T12:00:00.000Z`),
      amountPerShare: qty > 0 ? (gross / qty).toString() : gross.toString(),
      quantity: qty.toString(),
      grossAmount: gross.toString(),
      taxAmount: tax.toString(),
      netAmount: net.toString(),
      currency: "EUR",
      eurRate: "1",
      status: "RECEIVED",
      source: "MANUAL",
      note: parsed.orderId ? `TR Import ${parsed.orderId}` : "TR Import",
      importRef: parsed.importRef,
    },
  })
  result.created++
}

async function applyInterest(
  tx: Tx,
  preview: TrImportPreviewCacheEntry,
  parsed: TrParsedRow,
  previewRow: TrImportPreviewRow,
  resolution: TrImportResolution,
  result: ApplyImportResult
) {
  if (resolution === "link" && previewRow.matchedEntry?.kind === "dividend") {
    await tx.dividendPayment.update({
      where: { id: previewRow.matchedEntry.id },
      data: { importRef: parsed.importRef },
    })
    result.linked++
    return
  }
  if (resolution === "skip") {
    result.skipped++
    return
  }

  let asset = await tx.asset.findUnique({
    where: {
      householdId_userId_ticker: {
        householdId: preview.householdId,
        userId: preview.targetUserId,
        ticker: INTEREST_ASSET_TICKER,
      },
    },
  })

  if (!asset) {
    asset = await tx.asset.create({
      data: {
        householdId: preview.householdId,
        userId: preview.targetUserId,
        ticker: INTEREST_ASSET_TICKER,
        name: INTEREST_ASSET_NAME,
        type: "OTHER",
        currency: "EUR",
        account: preview.account,
        quantity: "0",
      },
    })
  }

  const gross = parsed.totalEur ?? 0
  await tx.dividendPayment.create({
    data: {
      householdId: preview.householdId,
      assetId: asset.id,
      userId: preview.targetUserId,
      year: new Date(`${parsed.date}T12:00:00.000Z`).getUTCFullYear(),
      exDate: new Date(`${parsed.date}T12:00:00.000Z`),
      payDate: new Date(`${parsed.date}T12:00:00.000Z`),
      amountPerShare: gross.toString(),
      quantity: "1",
      grossAmount: gross.toString(),
      taxAmount: (parsed.taxEur ?? 0).toString(),
      netAmount: (gross - (parsed.taxEur ?? 0)).toString(),
      currency: "EUR",
      eurRate: "1",
      status: "RECEIVED",
      source: "MANUAL",
      note: "TR Zinsen",
      importRef: parsed.importRef,
    },
  })
  result.created++
}
