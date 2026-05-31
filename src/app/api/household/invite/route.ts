import { NextResponse } from "next/server"
import { addDays } from "date-fns"
import { requireHouseholdAdmin } from "@/lib/household-auth"
import { prisma } from "@/lib/prisma"

export async function POST() {
  const admin = await requireHouseholdAdmin()
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status })
  }

  const expiresAt = addDays(new Date(), 7)

  const invite = await prisma.householdInvite.create({
    data: {
      householdId: admin.householdId,
      email: "",
      expiresAt,
    },
  })

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000"
  const inviteUrl = `${baseUrl}/auth/accept-invite?token=${invite.token}`

  return NextResponse.json({
    inviteUrl,
    token: invite.token,
    expiresAt: invite.expiresAt.toISOString(),
  })
}
