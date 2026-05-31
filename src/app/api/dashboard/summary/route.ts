import { NextResponse } from "next/server"
import { requireSession } from "@/lib/household-auth"
import { prisma } from "@/lib/prisma"
import {
  computePortfolioSummary,
  type CalcAsset,
  type CalcEntry,
} from "@/lib/utils/calculations"
import { getEurRate } from "@/lib/utils/currency"

function toCalcEntries(
  entries: { id: string; type: string; price: { toString(): string }; quantity: { toString(): string } | null; date: Date }[]
): CalcEntry[] {
  return entries.map((e) => ({
    id: e.id,
    type: e.type as CalcEntry["type"],
    price: e.price.toString(),
    quantity: e.quantity?.toString() ?? null,
    date: e.date.toISOString(),
  }))
}

export async function GET(req: Request) {
  const base = await requireSession()
  if ("error" in base) return NextResponse.json({ error: base.error }, { status: base.status })

  const { householdId, userId } = base
  const scope = new URL(req.url).searchParams.get("scope")
  const mineOnly = scope === "mine"

  const assets = await prisma.asset.findMany({
    where: mineOnly ? { householdId, userId } : { householdId },
    include: { entries: { orderBy: { date: "asc" } } },
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

  const portfolioItems = assets.map((a) => {
    const calcAsset: CalcAsset = { id: a.id, quantity: a.quantity.toString() }
    const calcEntries = toCalcEntries(a.entries)
    const eurRate = eurRates[a.currency]
    return { asset: calcAsset, entries: calcEntries, eurRate, type: a.type }
  })

  return NextResponse.json(computePortfolioSummary(portfolioItems))
}
