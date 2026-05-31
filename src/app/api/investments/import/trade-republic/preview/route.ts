import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { prisma } from "@/lib/prisma"
import { canManageHousehold, requireSession } from "@/lib/household-auth"
import { resolveIsins } from "@/lib/services/isin-resolver"
import {
  buildIsinResolutionMap,
  buildTickerMappings,
  type TrExistingAssetByIsin,
} from "@/lib/services/tr-import-ticker-mapping"
import {
  buildPreviewRows,
  summarizePreviewRows,
} from "@/lib/services/tr-import-dedup"
import { storePreview } from "@/lib/services/tr-import-preview-cache"
import { parseTradeRepublicCsv } from "@/lib/services/trade-republic-csv"

const MAX_FILE_BYTES = 5 * 1024 * 1024

export async function POST(request: Request) {
  const ctx = await requireSession()
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const form = await request.formData()
  const file = form.get("file")
  const account = (form.get("account")?.toString().trim() || "Trade Republic").slice(0, 100)
  const targetUserIdRaw = form.get("targetUserId")?.toString().trim()

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Keine CSV-Datei hochgeladen" }, { status: 400 })
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "Datei zu groß (max. 5 MB)" }, { status: 400 })
  }

  let targetUserId = ctx.userId
  if (targetUserIdRaw && targetUserIdRaw !== ctx.userId) {
    const membership = await prisma.householdMember.findUnique({
      where: { userId_householdId: { userId: ctx.userId, householdId: ctx.householdId } },
    })
    if (!membership || !canManageHousehold(membership.role)) {
      return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })
    }
    const targetMember = await prisma.householdMember.findUnique({
      where: { userId_householdId: { userId: targetUserIdRaw, householdId: ctx.householdId } },
    })
    if (!targetMember) {
      return NextResponse.json({ error: "Zielbenutzer nicht im Haushalt" }, { status: 400 })
    }
    targetUserId = targetUserIdRaw
  }

  let parsed
  try {
    const content = await file.text()
    parsed = parseTradeRepublicCsv(content)
  } catch (err) {
    const code = err instanceof Error ? err.message : "PARSE_ERROR"
    const messages: Record<string, string> = {
      EMPTY_FILE: "Die CSV-Datei ist leer",
      NO_DATA: "Die CSV-Datei enthält keine Daten",
      MISSING_DATE_COLUMN: "Pflichtspalte Datum nicht gefunden",
      NO_IMPORTABLE_ROWS: "Keine importierbaren Transaktionen gefunden",
    }
    return NextResponse.json({ error: messages[code] ?? "CSV konnte nicht gelesen werden" }, { status: 400 })
  }

  const isins = [...new Set(parsed.filter((r) => r.isin).map((r) => r.isin!.toUpperCase()))]
  const yahooResolutions = await resolveIsins(
    isins.map((isin) => ({
      isin,
      productName: parsed.find((r) => r.isin?.toUpperCase() === isin)?.product,
    }))
  )

  const existingAssetsRaw = await prisma.asset.findMany({
    where: {
      householdId: ctx.householdId,
      userId: targetUserId,
      isin: { not: null },
    },
    select: { isin: true, ticker: true, name: true, type: true, currency: true },
  })
  const existingAssets: TrExistingAssetByIsin[] = existingAssetsRaw
    .filter((a): a is typeof a & { isin: string } => !!a.isin)
    .map((a) => ({
      isin: a.isin,
      ticker: a.ticker,
      name: a.name,
      type: a.type,
      currency: a.currency,
    }))

  const tickerMappings = buildTickerMappings(parsed, existingAssets, yahooResolutions)
  const isinResolutions = buildIsinResolutionMap(tickerMappings)

  const [entries, dividends, existingRefs] = await Promise.all([
    prisma.assetEntry.findMany({
      where: { asset: { householdId: ctx.householdId, userId: targetUserId } },
      include: { asset: { select: { id: true, ticker: true, name: true, isin: true, userId: true } } },
    }),
    prisma.dividendPayment.findMany({
      where: { householdId: ctx.householdId, userId: targetUserId },
      include: { asset: { select: { id: true, ticker: true, name: true, isin: true, userId: true } } },
    }),
    loadExistingImportRefs(ctx.householdId),
  ])

  const previewRows = buildPreviewRows(parsed, {
    existingImportRefs: existingRefs,
    assetEntries: entries.map((e) => ({
      id: e.id,
      assetId: e.assetId,
      type: e.type,
      price: e.price.toString(),
      quantity: e.quantity?.toString() ?? null,
      date: e.date,
      importRef: e.importRef,
      asset: e.asset,
    })),
    dividends: dividends.map((d) => ({
      id: d.id,
      exDate: d.exDate,
      grossAmount: d.grossAmount.toString(),
      taxAmount: d.taxAmount.toString(),
      netAmount: d.netAmount.toString(),
      quantity: d.quantity.toString(),
      importRef: d.importRef,
      asset: d.asset,
    })),
    isinResolutions,
  })

  const previewId = randomUUID()
  storePreview({
    previewId,
    householdId: ctx.householdId,
    userId: ctx.userId,
    targetUserId,
    account,
    parsedRows: parsed,
    previewRows,
    createdAt: Date.now(),
  })

  return NextResponse.json({
    previewId,
    account,
    targetUserId,
    summary: {
      ...summarizePreviewRows(previewRows),
      tickersToReview: tickerMappings.length,
    },
    tickerMappings,
    rows: previewRows,
  })
}

async function loadExistingImportRefs(householdId: string): Promise<Set<string>> {
  const [entryRefs, dividendRefs] = await Promise.all([
    prisma.assetEntry.findMany({
      where: { importRef: { not: null }, asset: { householdId } },
      select: { importRef: true },
    }),
    prisma.dividendPayment.findMany({
      where: { householdId, importRef: { not: null } },
      select: { importRef: true },
    }),
  ])
  return new Set(
    [...entryRefs, ...dividendRefs]
      .map((r) => r.importRef)
      .filter((ref): ref is string => !!ref)
  )
}
