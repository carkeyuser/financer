import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { excludeInterestTicker } from "@/lib/constants/interest-asset"
import { prisma } from "@/lib/prisma"
import {
  fetchCalendarEvents,
  type CalendarEvent,
} from "@/lib/services/nasdaq-calendar"

export type { CalendarEvent }

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const assets = await prisma.asset.findMany({
      where: { householdId: session.user.householdId, ticker: excludeInterestTicker },
      select: { ticker: true, name: true },
    })

    const events = (await fetchCalendarEvents(assets))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return NextResponse.json(events)
  } catch (error) {
    console.error("[market-calendar]", error)
    return NextResponse.json([])
  }
}
