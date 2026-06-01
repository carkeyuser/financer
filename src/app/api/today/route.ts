import { NextResponse } from "next/server"
import { requireSession } from "@/lib/household-auth"
import { syncNotificationsForHousehold } from "@/lib/services/notifications"
import { upsertTodayPortfolioSnapshot } from "@/lib/services/portfolio-snapshot"
import { buildTodayBriefing } from "@/lib/services/today-briefing"

export async function GET() {
  const ctx = await requireSession()
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  try {
    await upsertTodayPortfolioSnapshot(ctx.householdId)
    await syncNotificationsForHousehold(ctx.householdId)
    const briefing = await buildTodayBriefing(ctx.householdId, ctx.userId)
    return NextResponse.json(briefing)
  } catch (error) {
    console.error("[today]", error)
    return NextResponse.json({ error: "Briefing konnte nicht geladen werden" }, { status: 500 })
  }
}
