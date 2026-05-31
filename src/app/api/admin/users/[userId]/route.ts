import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { requireHouseholdAdmin } from "@/lib/household-auth"
import { prisma } from "@/lib/prisma"
import { editUserSchema } from "@/lib/validations/household"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params
  const admin = await requireHouseholdAdmin()
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status })
  }

  const targetMember = await prisma.householdMember.findUnique({
    where: { userId_householdId: { userId, householdId: admin.householdId } },
  })
  if (!targetMember) {
    return NextResponse.json({ error: "Benutzer nicht gefunden" }, { status: 404 })
  }
  if (targetMember.role === "OWNER") {
    return NextResponse.json({ error: "Der Eigentümer kann nicht bearbeitet werden" }, { status: 403 })
  }

  const body = await request.json()
  const parsed = editUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { name, username, password } = parsed.data

  if (username) {
    const existing = await prisma.user.findFirst({
      where: { username, NOT: { id: userId } },
    })
    if (existing) {
      return NextResponse.json(
        { error: { username: ["Benutzername bereits vergeben"] } },
        { status: 409 }
      )
    }
  }

  const updateData: Record<string, unknown> = {}
  if (name !== undefined) updateData.name = name
  if (username !== undefined) updateData.username = username
  if (password !== undefined) updateData.passwordHash = await bcrypt.hash(password, 12)

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: { id: true, name: true, username: true },
  })

  return NextResponse.json(user)
}
