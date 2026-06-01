import { NextResponse } from "next/server"
import { requireSession } from "@/lib/household-auth"
import { markAllNotificationsRead } from "@/lib/services/notifications"

export async function POST() {
  const ctx = await requireSession()
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const count = await markAllNotificationsRead(ctx.householdId, ctx.userId)
  return NextResponse.json({ count })
}
