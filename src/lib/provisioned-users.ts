import type { HouseholdRole } from "@/generated/prisma"
import { canManageHousehold } from "@/lib/household-auth"
import { prisma } from "@/lib/prisma"

/** Admin/Owner may edit household members (non-OWNER). Owner may edit users they provisioned elsewhere. */
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

  if (targetUser.provisionedByUserId === adminUserId) {
    if (adminRole !== "OWNER") {
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
