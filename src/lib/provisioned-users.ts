import type { HouseholdRole } from "@/generated/prisma"
import { canManageHousehold } from "@/lib/household-auth"
import { prisma } from "@/lib/prisma"

async function householdOwnerUserId(householdId: string): Promise<string | null> {
  const owner = await prisma.householdMember.findFirst({
    where: { householdId, role: "OWNER" },
    select: { userId: true },
  })
  return owner?.userId ?? null
}

/** True when target was provisioned by this household's owner (Owner or Admin may manage). */
async function canManageProvisionedUser(
  adminUserId: string,
  adminHouseholdId: string,
  provisionedByUserId: string | null
): Promise<boolean> {
  if (!provisionedByUserId) return false
  if (provisionedByUserId === adminUserId) return true
  const ownerId = await householdOwnerUserId(adminHouseholdId)
  return ownerId === provisionedByUserId
}

/** Admin/Owner may edit household members (non-OWNER). Owner/Admin may edit/delete provisioned tenant users. */
export async function assertOwnerCanManageUser(
  adminUserId: string,
  adminHouseholdId: string,
  adminRole: HouseholdRole,
  targetUserId: string
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, provisionedByUserId: true },
  })
  if (!targetUser) {
    return { ok: false, status: 404, error: "Benutzer nicht gefunden" }
  }

  if (targetUser.provisionedByUserId) {
    if (!canManageHousehold(adminRole)) {
      return { ok: false, status: 403, error: "Keine Berechtigung" }
    }
    const allowed = await canManageProvisionedUser(
      adminUserId,
      adminHouseholdId,
      targetUser.provisionedByUserId
    )
    if (!allowed) {
      return { ok: false, status: 403, error: "Keine Berechtigung" }
    }
    return { ok: true }
  }

  if (!canManageHousehold(adminRole)) {
    return { ok: false, status: 403, error: "Keine Berechtigung" }
  }

  const targetMember = await prisma.householdMember.findUnique({
    where: { userId_householdId: { userId: targetUserId, householdId: adminHouseholdId } },
  })
  if (!targetMember) {
    return { ok: false, status: 404, error: "Benutzer nicht gefunden" }
  }
  if (targetMember.role === "OWNER") {
    return { ok: false, status: 403, error: "Der Eigentümer kann nicht bearbeitet werden" }
  }

  return { ok: true }
}
