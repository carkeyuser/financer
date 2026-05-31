import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { registerSchema } from "@/lib/validations/auth"

const DEFAULT_FIXED_COSTS = [
  { name: "Miete",                 amount: 900.0,  order: 1 },
  { name: "Allianz Invest + Rent", amount: 400.0,  order: 2 },
  { name: "Versicherung",          amount: 220.0,  order: 3 },
  { name: "Auto",                  amount: 269.6,  order: 4 },
  { name: "Gym",                   amount: 90.0,   order: 5 },
  { name: "Strom",                 amount: 80.0,   order: 6 },
  { name: "Verpflegung",           amount: 450.0,  order: 7 },
  { name: "Tanken",                amount: 150.0,  order: 8 },
  { name: "Internet",              amount: 80.0,   order: 9 },
  { name: "Puffer",                amount: 100.0,  order: 10 },
]

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = registerSchema.safeParse(body)

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
      data: DEFAULT_FIXED_COSTS.map((c) => ({ ...c, householdId: household.id })),
    })
    return newUser
  })

  return NextResponse.json({ id: user.id }, { status: 201 })
}
