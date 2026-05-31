import { NextResponse } from "next/server"
import { canManageHousehold, requireSession } from "@/lib/household-auth"
import { prisma } from "@/lib/prisma"
import { deleteInvestmentAccountData } from "@/lib/services/delete-investment-account"
import { deleteInvestmentAccountSchema } from "@/lib/validations/investment-account"

async function resolveTargetUserId(
  ctx: { userId: string; householdId: string },
  targetUserIdRaw: string | undefined
): Promise<{ targetUserId: string } | { error: string; status: number }> {
  if (!targetUserIdRaw || targetUserIdRaw === ctx.userId) {
    return { targetUserId: ctx.userId }
  }

  const membership = await prisma.householdMember.findUnique({
    where: { userId_householdId: { userId: ctx.userId, householdId: ctx.householdId } },
  })
  if (!membership || !canManageHousehold(membership.role)) {
    return { error: "Keine Berechtigung", status: 403 }
  }

  const targetMember = await prisma.householdMember.findUnique({
    where: { userId_householdId: { userId: targetUserIdRaw, householdId: ctx.householdId } },
  })
  if (!targetMember) {
    return { error: "Zielbenutzer nicht im Haushalt", status: 400 }
  }

  return { targetUserId: targetUserIdRaw }
}

export async function DELETE(request: Request) {
  const ctx = await requireSession()
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const body = await request.json().catch(() => null)
  const parsed = deleteInvestmentAccountSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const target = await resolveTargetUserId(ctx, parsed.data.targetUserId)
  if ("error" in target) {
    return NextResponse.json({ error: target.error }, { status: target.status })
  }

  const result = await deleteInvestmentAccountData({
    householdId: ctx.householdId,
    account: parsed.data.account,
    targetUserId: target.targetUserId,
  })

  return NextResponse.json(result)
}
