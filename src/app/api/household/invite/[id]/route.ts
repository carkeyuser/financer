import { NextResponse } from "next/server"
import { requireHouseholdAdmin } from "@/lib/household-auth"
import { prisma } from "@/lib/prisma"

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireHouseholdAdmin()
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status })
  }

  const { id } = await params

  const invite = await prisma.householdInvite.findFirst({
    where: { id, householdId: admin.householdId, usedAt: null },
  })

  if (!invite) {
    return NextResponse.json({ error: "Einladung nicht gefunden" }, { status: 404 })
  }

  if (invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "Einladung bereits abgelaufen" }, { status: 400 })
  }

  await prisma.householdInvite.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
