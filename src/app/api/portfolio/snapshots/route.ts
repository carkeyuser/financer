import { NextRequest, NextResponse } from "next/server"
import { requireSession } from "@/lib/household-auth"
import {
  getPortfolioSnapshotDelta,
  getPortfolioSnapshotSeries,
  upsertTodayPortfolioSnapshot,
} from "@/lib/services/portfolio-snapshot"

export async function GET(req: NextRequest) {
  const ctx = await requireSession()
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const days = Math.min(365, Math.max(7, parseInt(req.nextUrl.searchParams.get("days") ?? "90", 10) || 90))

  try {
    await upsertTodayPortfolioSnapshot(ctx.householdId)
    const [delta, series] = await Promise.all([
      getPortfolioSnapshotDelta(ctx.householdId),
      getPortfolioSnapshotSeries(ctx.householdId, days),
    ])
    return NextResponse.json({ delta, series })
  } catch (error) {
    console.error("[portfolio/snapshots]", error)
    return NextResponse.json({ error: "Snapshots konnten nicht geladen werden" }, { status: 500 })
  }
}
