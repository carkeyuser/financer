import { NextResponse } from "next/server"
import { requireHouseholdAdmin } from "@/lib/household-auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({ enabled: z.boolean() })

// PATCH — admin requires or disables 2FA for another household member.
// Requiring 2FA clears stale/unconfirmed secrets; the user must confirm TOTP in settings.
// Disabling clears the requirement and the stored secret.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const admin = await requireHouseholdAdmin()
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status })
  }
  const { householdId } = admin
  const { userId } = await params

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 })
  }

  // Verify target is a member of this household
  const membership = await prisma.householdMember.findUnique({
    where: { userId_householdId: { userId, householdId } },
  })
  if (!membership) {
    return NextResponse.json({ error: "Mitglied nicht gefunden" }, { status: 404 })
  }

  if (parsed.data.enabled) {
    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true, twoFactorSecret: null },
    })
  } else {
    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    })
  }

  return NextResponse.json({
    success: true,
    enabled: parsed.data.enabled,
    requiresSetup: parsed.data.enabled,
  })
}
