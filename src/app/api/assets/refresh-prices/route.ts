import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  fetchSecurityPriceFromYahoo,
  resolveStoredPrice,
  upsertTodayPriceUpdate,
} from "@/lib/services/security-price"

export async function POST() {
  const session = await auth()
  if (!session?.user?.householdId) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 })
  }
  const householdId = session.user.householdId

  const assets = await prisma.asset.findMany({
    where: { householdId },
    select: { id: true, ticker: true, currency: true },
  })

  if (assets.length === 0) {
    return NextResponse.json({ updated: 0, failed: [], skipped: [] })
  }

  const results = await Promise.allSettled(
    assets.map(async (asset) => {
      const quote = await fetchSecurityPriceFromYahoo(asset.ticker)
      const storedPrice = resolveStoredPrice(asset.currency, quote)
      if (storedPrice == null) {
        return { ticker: asset.ticker, status: "skipped" as const }
      }
      await prisma.$transaction((tx) =>
        upsertTodayPriceUpdate(tx, asset.id, storedPrice)
      )
      return { ticker: asset.ticker, status: "updated" as const }
    })
  )

  let updated = 0
  const failed: string[] = []
  const skipped: string[] = []

  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    const ticker = assets[i].ticker
    if (result.status === "fulfilled") {
      if (result.value.status === "updated") updated++
      else skipped.push(ticker)
    } else {
      failed.push(ticker)
    }
  }

  return NextResponse.json({ updated, failed, skipped })
}
