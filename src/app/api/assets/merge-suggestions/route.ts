import { NextResponse } from "next/server"
import { excludeInterestTicker } from "@/lib/constants/interest-asset"
import { requireSession } from "@/lib/household-auth"
import { prisma } from "@/lib/prisma"
import { buildMergeSuggestionGroups } from "@/lib/services/asset-merge-suggestions"
import { getEurRate } from "@/lib/utils/currency"
import { createNdjsonResponse } from "@/lib/utils/ndjson-stream"
import { mergeSuggestionsCompleteSchema, type MergeScanProgressEvent } from "@/lib/validations/asset-merge"

async function loadMergeSuggestions(
  householdId: string,
  filterUserId: string | undefined,
  trAccount: string | undefined,
  onProgress?: (phase: MergeScanProgressEvent["phase"], current: number, total: number) => void
) {
  onProgress?.("load_assets", 0, 1)
  const assets = await prisma.asset.findMany({
    where: {
      householdId,
      ticker: excludeInterestTicker,
      ...(filterUserId ? { userId: filterUserId } : {}),
    },
    include: {
      entries: { orderBy: { date: "asc" } },
      user: { select: { name: true, username: true } },
    },
    orderBy: { order: "asc" },
  })
  onProgress?.("load_assets", 1, 1)

  const currencies = [...new Set(assets.map((a) => a.currency))]
  onProgress?.("load_rates", 0, currencies.length || 1)
  let eurRates: Record<string, number>
  try {
    eurRates = Object.fromEntries(
      await Promise.all(
        currencies.map(async (c, i) => {
          const rate = await getEurRate(c)
          onProgress?.("load_rates", i + 1, currencies.length || 1)
          return [c, rate] as const
        })
      )
    )
  } catch {
    throw new Error("Wechselkurse konnten nicht geladen werden")
  }

  const scanAssets = assets.map((a) => ({
    id: a.id,
    userId: a.userId,
    ticker: a.ticker,
    name: a.name,
    type: a.type,
    isin: a.isin,
    account: a.account,
    quantity: a.quantity.toString(),
    order: a.order,
    ownerName: a.user?.name ?? a.user?.username ?? "",
    eurRate: eurRates[a.currency] ?? 1,
    entries: a.entries.map((e) => ({
      id: e.id,
      type: e.type,
      price: e.price.toString(),
      quantity: e.quantity?.toString() ?? null,
      date: e.date.toISOString(),
      importRef: e.importRef,
    })),
  }))

  onProgress?.("analyze", 0, 1)
  const groups = buildMergeSuggestionGroups(scanAssets, { trAccount })
  onProgress?.("analyze", 1, 1)

  return { groups, assetCount: assets.length }
}

export async function GET(req: Request) {
  const ctx = await requireSession()
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  }

  const { householdId } = ctx
  const url = new URL(req.url)
  const filterUserId = url.searchParams.get("userId") ?? undefined
  const trAccount = url.searchParams.get("trAccount") ?? undefined
  const stream = url.searchParams.get("stream") === "1"

  if (stream) {
    return createNdjsonResponse<MergeScanProgressEvent>(async (emit) => {
      const result = await loadMergeSuggestions(householdId, filterUserId, trAccount, (phase, current, total) => {
        emit({ type: "progress", phase, current, total })
      })
      emit({ type: "complete", data: result })
    })
  }

  try {
    const result = await loadMergeSuggestions(householdId, filterUserId, trAccount)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler"
    if (message.includes("Wechselkurse")) {
      return NextResponse.json({ error: message }, { status: 503 })
    }
    throw err
  }
}
