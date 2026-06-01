import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { requireHouseholdAdmin } from "@/lib/household-auth"
import { prisma } from "@/lib/prisma"
import { assertOwnerCanManageUser } from "@/lib/provisioned-users"
import { deleteProvisionedUserAccount } from "@/lib/services/delete-provisioned-user"
import { buildEditUserSchema } from "@/lib/validations/household"
import { sessionLocale } from "@/lib/session-locale"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params
  const admin = await requireHouseholdAdmin()
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status })
  }

  const access = await assertOwnerCanManageUser(
    admin.userId,
    admin.householdId,
    admin.membership.role,
    userId
  )
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status })
  }

  const body = await request.json()
  const parsed = buildEditUserSchema(sessionLocale(admin.session)).safeParse(body)
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

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params
  const admin = await requireHouseholdAdmin()
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status })
  }

  if (userId === admin.userId) {
    return NextResponse.json({ error: "Du kannst dich nicht selbst löschen" }, { status: 400 })
  }

  const access = await assertOwnerCanManageUser(
    admin.userId,
    admin.householdId,
    admin.membership.role,
    userId
  )
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status })
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { provisionedByUserId: true },
  })
  if (!target?.provisionedByUserId) {
    return NextResponse.json(
      { error: "Nur angelegte Tenant-Benutzer können hier gelöscht werden" },
      { status: 400 }
    )
  }

  const inHousehold = await prisma.householdMember.findUnique({
    where: { userId_householdId: { userId, householdId: admin.householdId } },
  })
  if (inHousehold) {
    return NextResponse.json(
      { error: "Haushaltsmitglieder über die Mitgliederverwaltung entfernen" },
      { status: 400 }
    )
  }

  try {
    await deleteProvisionedUserAccount(userId)
  } catch (e) {
    if (e instanceof Error && e.message === "HAS_PROVISIONED_USERS") {
      return NextResponse.json(
        { error: "Benutzer hat selbst angelegte Tenant-Benutzer — zuerst diese löschen" },
        { status: 409 }
      )
    }
    throw e
  }

  return new NextResponse(null, { status: 204 })
}
