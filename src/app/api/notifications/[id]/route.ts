import { NextResponse } from "next/server"
import { requireSession } from "@/lib/household-auth"
import { markNotificationRead } from "@/lib/services/notifications"

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireSession()
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const { id } = await params
  const notification = await markNotificationRead(id, ctx.userId, ctx.householdId)
  if (!notification) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 })
  }
  return NextResponse.json({ ok: true })
}
