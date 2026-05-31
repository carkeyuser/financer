import { NextResponse } from "next/server"
import { requireHouseholdAdmin } from "@/lib/household-auth"
import { prisma } from "@/lib/prisma"
import { updateMemberRoleSchema } from "@/lib/validations/household"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const admin = await requireHouseholdAdmin()
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status })
  }
  const { membership, householdId, userId: adminUserId } = admin

  if (membership.role !== "OWNER") {
    return NextResponse.json({ error: "Nur der Eigentümer kann Rollen ändern" }, { status: 403 })
  }

  const { userId } = await params
  const body = await request.json()
  const parsed = updateMemberRoleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const target = await prisma.householdMember.findUnique({
    where: { userId_householdId: { userId, householdId } },
  })
  if (!target) {
    return NextResponse.json({ error: "Mitglied nicht gefunden" }, { status: 404 })
  }
  if (target.role === "OWNER") {
    return NextResponse.json({ error: "Die Rolle des Eigentümers kann nicht geändert werden" }, { status: 403 })
  }

  const updated = await prisma.householdMember.update({
    where: { id: target.id },
    data: { role: parsed.data.role },
    include: { user: { select: { id: true, name: true, email: true } } },
  })

  return NextResponse.json({
    userId: updated.userId,
    role: updated.role,
    name: updated.user.name,
    email: updated.user.email,
  })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const admin = await requireHouseholdAdmin()
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status })
  }
  const { householdId, userId: adminUserId } = admin

  const { userId } = await params

  if (userId === adminUserId) {
    return NextResponse.json({ error: "Du kannst dich nicht selbst entfernen" }, { status: 400 })
  }

  const target = await prisma.householdMember.findUnique({
    where: { userId_householdId: { userId, householdId } },
  })
  if (!target) {
    return NextResponse.json({ error: "Mitglied nicht gefunden" }, { status: 404 })
  }
  if (target.role === "OWNER") {
    return NextResponse.json({ error: "Der Eigentümer kann nicht entfernt werden" }, { status: 403 })
  }

  await prisma.householdMember.delete({ where: { id: target.id } })
  return new NextResponse(null, { status: 204 })
}
