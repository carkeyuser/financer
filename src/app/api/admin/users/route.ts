import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
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

  const { name, username, password } = parsed.data

  const existing = await prisma.user.findUnique({ where: { username } })
  if (existing) {
    return NextResponse.json(
      { error: { username: ["Benutzername bereits vergeben"] } },
      { status: 409 }
    )
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: { name, username, passwordHash, role: "MEMBER" },
    })
    await tx.householdMember.create({
      data: { userId: newUser.id, householdId: admin.householdId, role: "MEMBER" },
    })
    return newUser
  })

  return NextResponse.json({ id: user.id, username: user.username }, { status: 201 })
}
