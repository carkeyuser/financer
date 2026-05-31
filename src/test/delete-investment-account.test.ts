// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const deleteMany = vi.fn()

vi.mock("@/lib/prisma", () => ({
  prisma: {
    asset: { deleteMany: (...args: unknown[]) => deleteMany(...args) },
  },
}))

describe("deleteInvestmentAccountData", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    deleteMany.mockResolvedValue({ count: 3 })
  })

  it("deletes assets for household, user and account", async () => {
    const { deleteInvestmentAccountData } = await import("@/lib/services/delete-investment-account")

    const result = await deleteInvestmentAccountData({
      householdId: "hh-1",
      account: "Trade Republic",
      targetUserId: "user-1",
    })

    expect(result.deletedAssets).toBe(3)
    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        householdId: "hh-1",
        userId: "user-1",
        account: "Trade Republic",
        ticker: { not: "Interest" },
      },
    })
  })
})
