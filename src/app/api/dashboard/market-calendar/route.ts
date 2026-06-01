import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { excludeInterestTicker } from "@/lib/constants/interest-asset"
import { prisma } from "@/lib/prisma"
import {
  fetchCalendarEvents,
  type CalendarEvent,
} from "@/lib/services/nasdaq-calendar"
import { filterCalendarEventsWithinDays } from "@/lib/utils/market-calendar-utils"

export type { CalendarEvent }

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const daysParam = new URL(req.url).searchParams.get("days")
    const daysAhead = daysParam ? Math.min(60, Math.max(1, parseInt(daysParam, 10) || 14)) : 14

    const assets = await prisma.asset.findMany({
      where: { householdId: session.user.householdId, ticker: excludeInterestTicker },
      select: { ticker: true, name: true },
    })

    const events = filterCalendarEventsWithinDays(await fetchCalendarEvents(assets), daysAhead)

    return NextResponse.json(events)
  } catch (error) {
    console.error("[market-calendar]", error)
    return NextResponse.json([])
  }
}
