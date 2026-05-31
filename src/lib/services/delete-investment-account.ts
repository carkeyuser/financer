import { excludeInterestTicker } from "@/lib/constants/interest-asset"
import { prisma } from "@/lib/prisma"

export interface DeleteInvestmentAccountResult {
  deletedAssets: number
}

export async function deleteInvestmentAccountData(params: {
  householdId: string
  account: string
  targetUserId: string
}): Promise<DeleteInvestmentAccountResult> {
  const result = await prisma.asset.deleteMany({
    where: {
      householdId: params.householdId,
      userId: params.targetUserId,
      account: params.account,
      ticker: excludeInterestTicker,
    },
  })

  return { deletedAssets: result.count }
}
