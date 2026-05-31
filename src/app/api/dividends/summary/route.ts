import { NextResponse } from "next/server"
import { isInterestAsset } from "@/lib/constants/interest-asset"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/household-auth"
import { ensureInterestAsset } from "@/lib/services/interest-asset"
import {
  buildManualDividendEvent,
  buildMonthlyDividendSeries,
  calculateDividendKpis,
  type DividendAssetOption,
  type ManualDividendEvent,
} from "@/lib/utils/dividends"

function isValidYear(value: string | null): number {
  const year = value ? Number(value) : new Date().getFullYear()
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return new Date().getFullYear()
  return year
}

export async function GET(request: Request) {
  const ctx = await requireSession()
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const { searchParams } = new URL(request.url)
  const year = isValidYear(searchParams.get("year"))

  await ensureInterestAsset(ctx.householdId, ctx.userId)

  const assets = await prisma.asset.findMany({
    where: { householdId: ctx.householdId },
    include: {
      user: { select: { id: true, name: true, username: true } },
    },
    orderBy: { order: "asc" },
  })

  const assetOptions: DividendAssetOption[] = assets
    .map((asset) => ({
      id: asset.id,
      ticker: asset.ticker,
      name: asset.name,
      type: asset.type,
      account: asset.account,
      ownerName: asset.user?.name ?? asset.user?.username ?? null,
      quantity: asset.quantity.toString(),
    }))
    .sort((a, b) => {
      const aInterest = isInterestAsset(a) ? 0 : 1
      const bInterest = isInterestAsset(b) ? 0 : 1
      if (aInterest !== bInterest) return aInterest - bInterest
      return a.name.localeCompare(b.name)
    })

  const assetsById = new Map(assetOptions.map((asset) => [asset.id, asset]))
  const payments = await prisma.dividendPayment.findMany({
    where: { householdId: ctx.householdId, year },
    orderBy: [{ exDate: "desc" }, { createdAt: "desc" }],
  })

  const events = payments
    .map((payment) => {
      const asset = assetsById.get(payment.assetId)
      return asset ? buildManualDividendEvent(payment, asset) : null
    })
    .filter((event): event is ManualDividendEvent => event !== null)
    .sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name))

  return NextResponse.json({
    year,
    kpis: calculateDividendKpis(events),
    monthly: buildMonthlyDividendSeries(year, events),
    events,
    assets: assetOptions,
  })
}
