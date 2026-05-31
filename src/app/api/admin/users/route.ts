import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { fixedCostsForHousehold } from "@/lib/constants/default-fixed-costs"
import { requireHouseholdAdmin } from "@/lib/household-auth"
import { prisma } from "@/lib/prisma"
import { createUserSchema } from "@/lib/validations/household"

export async function POST(request: Request) {
  const admin = await requireHouseholdAdmin()
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status })
  }

  if (admin.membership.role !== "OWNER") {
    return NextResponse.json(
      { error: "Nur der Eigentümer kann Benutzer anlegen" },
      { status: 403 }
    )
  }

  const body = await request.json()
  const parsed = createUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { name, username, password, tenancy, householdName } = parsed.data

  const existing = await prisma.user.findUnique({ where: { username } })
  if (existing) {
    return NextResponse.json(
      { error: { username: ["Benutzername bereits vergeben"] } },
      { status: 409 }
    )
  }

  const passwordHash = await bcrypt.hash(password, 12)

  if (tenancy === "tenant") {
    const tenantHouseholdName =
      householdName?.trim() || `Haushalt ${username}`

    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name,
          username,
          passwordHash,
          role: "MEMBER",
          provisionedByUserId: admin.userId,
        },
      })
      const household = await tx.household.create({
        data: { name: tenantHouseholdName },
      })
      await tx.householdMember.create({
        data: {
          userId: newUser.id,
          householdId: household.id,
          role: "OWNER",
        },
      })
      await tx.fixedCost.createMany({
        data: fixedCostsForHousehold(household.id),
      })
      return { user: newUser, householdId: household.id }
    })

    return NextResponse.json(
      {
        id: result.user.id,
        username: result.user.username,
        householdId: result.householdId,
        tenancy: "tenant" as const,
      },
      { status: 201 }
    )
  }

  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        name,
        username,
        passwordHash,
        role: "MEMBER",
        provisionedByUserId: admin.userId,
      },
    })
    await tx.householdMember.create({
      data: { userId: newUser.id, householdId: admin.householdId, role: "MEMBER" },
    })
    return newUser
  })

  return NextResponse.json(
    { id: user.id, username: user.username, tenancy: "household" as const },
    { status: 201 }
  )
}
