import type { Prisma } from "@/generated/prisma"
import { prisma } from "@/lib/prisma"

/** Deletes a tenant user and sole-member households; fails if user still has dependents. */
export async function deleteProvisionedUserAccount(
  userId: string,
  tx: Prisma.TransactionClient = prisma
) {
  const dependentCount = await tx.user.count({ where: { provisionedByUserId: userId } })
  if (dependentCount > 0) {
    throw new Error("HAS_PROVISIONED_USERS")
  }

  const memberships = await tx.householdMember.findMany({
    where: { userId },
    select: { id: true, householdId: true },
  })

  for (const m of memberships) {
    const memberCount = await tx.householdMember.count({ where: { householdId: m.householdId } })
    if (memberCount === 1) {
      await tx.household.delete({ where: { id: m.householdId } })
    } else {
      await tx.householdMember.delete({ where: { id: m.id } })
    }
  }

  await tx.asset.deleteMany({ where: { userId } })
  await tx.monthlyIncome.deleteMany({ where: { userId } })
  await tx.monthlyPayout.deleteMany({ where: { userId } })
  await tx.householdFinanceSimulationEntry.deleteMany({ where: { userId } })
  await tx.user.delete({ where: { id: userId } })
}
