import { NextRequest, NextResponse } from "next/server"
import { requireSession } from "@/lib/household-auth"
import { deletePersonalIncomeBonus } from "@/lib/services/personal-income"

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireSession()
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  }

  const { id } = await params
  const deleted = await deletePersonalIncomeBonus(ctx.householdId, ctx.userId, id)
  if (!deleted) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
