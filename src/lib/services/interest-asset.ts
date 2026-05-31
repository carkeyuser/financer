import { prisma } from "@/lib/prisma"
import { INTEREST_ASSET_NAME, INTEREST_ASSET_TICKER } from "@/lib/constants/interest-asset"

export async function ensureInterestAsset(householdId: string, userId: string) {
  return prisma.asset.upsert({
    where: {
      householdId_userId_ticker: { householdId, userId, ticker: INTEREST_ASSET_TICKER },
    },
    create: {
      householdId,
      userId,
      ticker: INTEREST_ASSET_TICKER,
      name: INTEREST_ASSET_NAME,
      type: "OTHER",
      currency: "EUR",
      account: "",
      quantity: "0",
      order: -1,
    },
    update: {},
  })
}
