import { NextResponse } from "next/server"
import { requireSession } from "@/lib/household-auth"
import { listNotificationsForUser, syncNotificationsForHousehold } from "@/lib/services/notifications"
import { upsertTodayPortfolioSnapshot } from "@/lib/services/portfolio-snapshot"

export async function GET() {
  const ctx = await requireSession()
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  try {
    await upsertTodayPortfolioSnapshot(ctx.householdId)
    await syncNotificationsForHousehold(ctx.householdId)
    const data = await listNotificationsForUser(ctx.householdId, ctx.userId)
    return NextResponse.json(data)
  } catch (error) {
    console.error("[notifications]", error)
    return NextResponse.json({ error: "Benachrichtigungen konnten nicht geladen werden" }, { status: 500 })
  }
}
