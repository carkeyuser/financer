import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { acceptInviteSchema } from "@/lib/validations/household"

async function findValidInvite(token: string) {
  const invite = await prisma.householdInvite.findUnique({
    where: { token },
    include: { household: { select: { id: true, name: true } } },
  })
  if (!invite) return null
  if (invite.usedAt) return null
  if (invite.expiresAt < new Date()) return null
  return invite
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get("token")
  if (!token) return NextResponse.json({ error: "Token fehlt" }, { status: 400 })

  const invite = await findValidInvite(token)
  if (!invite) return NextResponse.json({ error: "Einladung ungültig oder abgelaufen" }, { status: 404 })

  return NextResponse.json({
    householdName: invite.household.name,
    email: invite.email,
    expiresAt: invite.expiresAt.toISOString(),
  })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bitte zuerst anmelden" }, { status: 401 })
  }

  const body = await request.json()
  const parsed = acceptInviteSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })

  const invite = await findValidInvite(parsed.data.token)
  if (!invite) return NextResponse.json({ error: "Einladung ungültig oder abgelaufen" }, { status: 404 })

  const existing = await prisma.householdMember.findUnique({
    where: { userId_householdId: { userId: session.user.id, householdId: invite.householdId } },
  })
  if (existing) return NextResponse.json({ householdId: invite.householdId, alreadyMember: true })

  await prisma.$transaction(async (tx) => {
    await tx.householdMember.create({
      data: { userId: session.user.id, householdId: invite.householdId, role: "MEMBER" },
    })
    await tx.householdInvite.update({ where: { id: invite.id }, data: { usedAt: new Date() } })
  })

  return NextResponse.json({ householdId: invite.householdId, householdName: invite.household.name })
}
