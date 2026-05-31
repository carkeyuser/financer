import type { Session } from "next-auth"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { HouseholdMember, HouseholdRole } from "@/generated/prisma"

export type AuthError = { error: string; status: number }

export type SessionContext = {
  session: Session
  userId: string
  householdId: string
}

export type AdminContext = SessionContext & {
  membership: HouseholdMember
}

export function canManageHousehold(role: HouseholdRole): boolean {
  return role === "OWNER" || role === "ADMIN"
}

export async function getMembership(userId: string, householdId: string) {
  return prisma.householdMember.findUnique({
    where: { userId_householdId: { userId, householdId } },
  })
}

export async function requireSession(): Promise<AuthError | SessionContext> {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Nicht autorisiert", status: 401 }
  }
  if (!session.user.householdId) {
    return { error: "Kein Haushalt ausgewählt", status: 403 }
  }
  return {
    session,
    userId: session.user.id,
    householdId: session.user.householdId,
  }
}

export async function requireHouseholdAdmin(): Promise<AuthError | AdminContext> {
  const base = await requireSession()
  if ("error" in base) return base

  const membership = await getMembership(base.userId, base.householdId)
  if (!membership || !canManageHousehold(membership.role)) {
    return { error: "Keine Berechtigung", status: 403 }
  }

  return { ...base, membership }
}
