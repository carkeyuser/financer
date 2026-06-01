import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canManageHousehold, getMembership } from "@/lib/household-auth"
import { buildUpdateHouseholdNameSchema } from "@/lib/validations/household"
import { sessionLocale } from "@/lib/session-locale"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 })
  }

  const userId = session.user.id
  const householdId = session.user.householdId

  const memberships = await prisma.householdMember.findMany({
    where: { userId },
    include: { household: { select: { id: true, name: true, currency: true } } },
    orderBy: { joinedAt: "asc" },
  })

  if (!householdId) {
    return NextResponse.json({
      household: null,
      myRole: null,
      members: [],
      households: memberships.map((m) => ({
        id: m.household.id,
        name: m.household.name,
        currency: m.household.currency,
        role: m.role,
      })),
      pendingInvites: [],
      provisionedUsers: [],
    })
  }

  const myMembership = await getMembership(userId, householdId)
  if (!myMembership) {
    return NextResponse.json({ error: "Kein Zugriff auf diesen Haushalt" }, { status: 403 })
  }

  let provisionerId: string | null = null
  if (canManageHousehold(myMembership.role)) {
    if (myMembership.role === "OWNER") {
      provisionerId = userId
    } else {
      const owner = await prisma.householdMember.findFirst({
        where: { householdId, role: "OWNER" },
        select: { userId: true },
      })
      provisionerId = owner?.userId ?? null
    }
  }

  const [household, members, pendingInvites, provisionedUsers] = await Promise.all([
    prisma.household.findUnique({
      where: { id: householdId },
      select: { id: true, name: true, currency: true },
    }),
    prisma.householdMember.findMany({
      where: { householdId },
      include: {
        user: { select: { id: true, name: true, username: true, email: true, image: true, twoFactorEnabled: true, twoFactorSecret: true } },
      },
      orderBy: { joinedAt: "asc" },
    }),
    prisma.householdInvite.findMany({
      where: { householdId, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, token: true, expiresAt: true, createdAt: true },
    }),
    canManageHousehold(myMembership.role) && provisionerId
      ? prisma.user.findMany({
          where: {
            provisionedByUserId: provisionerId,
            NOT: { householdMemberships: { some: { householdId } } },
          },
          include: {
            householdMemberships: {
              include: { household: { select: { id: true, name: true } } },
              orderBy: { joinedAt: "asc" },
              take: 1,
            },
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ])

  return NextResponse.json({
    household: household
      ? { id: household.id, name: household.name, currency: household.currency }
      : null,
    myRole: myMembership.role,
    members: members.map((m) => ({
      id: m.id,
      userId: m.user.id,
      name: m.user.name,
      email: m.user.email ?? m.user.username,
      image: m.user.image,
      role: m.role,
      joinedAt: m.joinedAt.toISOString(),
      twoFactorEnabled: m.user.twoFactorEnabled,
      twoFactorConfigured: !!(m.user.twoFactorEnabled && m.user.twoFactorSecret),
    })),
    households: memberships.map((m) => ({
      id: m.household.id,
      name: m.household.name,
      currency: m.household.currency,
      role: m.role,
    })),
    pendingInvites: pendingInvites.map((i) => ({
      id: i.id,
      email: i.email,
      expiresAt: i.expiresAt.toISOString(),
      createdAt: i.createdAt.toISOString(),
    })),
    provisionedUsers: provisionedUsers.map((u) => {
      const membership = u.householdMemberships[0]
      return {
        userId: u.id,
        name: u.name,
        username: u.username,
        householdId: membership?.household.id ?? null,
        householdName: membership?.household.name ?? null,
        role: membership?.role ?? null,
        createdAt: u.createdAt.toISOString(),
        twoFactorEnabled: u.twoFactorEnabled,
      }
    }),
  })
}

export async function PATCH(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 })
  }

  const householdId = session.user.householdId
  if (!householdId) {
    return NextResponse.json({ error: "Kein Haushalt ausgewählt" }, { status: 400 })
  }

  const membership = await getMembership(session.user.id, householdId)
  if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })
  }

  const body = await request.json()
  const result = buildUpdateHouseholdNameSchema(sessionLocale(session)).safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten().fieldErrors }, { status: 400 })
  }

  const household = await prisma.household.update({
    where: { id: householdId },
    data: { name: result.data.name },
    select: { id: true, name: true, currency: true },
  })

  return NextResponse.json(household)
}
