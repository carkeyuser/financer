import { NextResponse } from "next/server"
import { excludeInterestTicker } from "@/lib/constants/interest-asset"
import { requireSession } from "@/lib/household-auth"
import { prisma } from "@/lib/prisma"
import { buildMergeSuggestionGroups } from "@/lib/services/asset-merge-suggestions"
import { getEurRate } from "@/lib/utils/currency"

export async function GET(req: Request) {
  const ctx = await requireSession()
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  }

  const { householdId } = ctx
  const url = new URL(req.url)
  const filterUserId = url.searchParams.get("userId") ?? undefined

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

  const currencies = [...new Set(assets.map((a) => a.currency))]
  let eurRates: Record<string, number>
  try {
    eurRates = Object.fromEntries(
      await Promise.all(currencies.map(async (c) => [c, await getEurRate(c)]))
    )
  } catch {
    return NextResponse.json({ error: "Wechselkurse konnten nicht geladen werden" }, { status: 503 })
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
    })),
  }))

  const groups = buildMergeSuggestionGroups(scanAssets)

  return NextResponse.json({
    groups,
    assetCount: assets.length,
  })
}
