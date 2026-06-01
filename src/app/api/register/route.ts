import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { fixedCostsForHousehold } from "@/lib/constants/default-fixed-costs"
import { DEFAULT_LOCALE } from "@/i18n/locales"
import { createRegisterSchema } from "@/lib/validations/auth"

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = createRegisterSchema(DEFAULT_LOCALE).safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { name, username, password, householdName, inviteToken } = parsed.data

  const existingUsername = await prisma.user.findUnique({ where: { username } })
  if (existingUsername) {
    return NextResponse.json({ error: { username: ["Benutzername ist bereits vergeben"] } }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 12)

  if (inviteToken) {
    const invite = await prisma.householdInvite.findUnique({
      where: { token: inviteToken },
      include: { household: true },
    })

    if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
      return NextResponse.json({ error: { inviteToken: ["Einladung ungültig oder abgelaufen"] } }, { status: 400 })
    }

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: { name, username, passwordHash, role: "MEMBER" },
      })
      await tx.householdMember.create({
        data: { userId: newUser.id, householdId: invite.householdId, role: "MEMBER" },
      })
      await tx.householdInvite.update({ where: { id: invite.id }, data: { usedAt: new Date() } })
      return newUser
    })

    return NextResponse.json({ id: user.id, householdId: invite.householdId }, { status: 201 })
  }

  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: { name, username, passwordHash, role: "ADMIN" },
    })
    const household = await tx.household.create({ data: { name: householdName! } })
    await tx.householdMember.create({
      data: { userId: newUser.id, householdId: household.id, role: "OWNER" },
    })
    await tx.fixedCost.createMany({
      data: fixedCostsForHousehold(household.id),
    })
    return newUser
  })

  return NextResponse.json({ id: user.id }, { status: 201 })
}
