// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const requireSession = vi.fn()
const deleteInvestmentAccountData = vi.fn()

vi.mock("@/lib/household-auth", () => ({
  requireSession: (...args: unknown[]) => requireSession(...args),
  canManageHousehold: () => true,
}))

vi.mock("@/lib/services/delete-investment-account", () => ({
  deleteInvestmentAccountData: (...args: unknown[]) => deleteInvestmentAccountData(...args),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    householdMember: {
      findUnique: vi.fn().mockResolvedValue({ role: "ADMIN" }),
    },
  },
}))

describe("DELETE /api/investments/accounts", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireSession.mockResolvedValue({ userId: "user-1", householdId: "hh-1" })
    deleteInvestmentAccountData.mockResolvedValue({ deletedAssets: 2 })
  })

  it("returns deleted count", async () => {
    const { DELETE } = await import("@/app/api/investments/accounts/route")

    const response = await DELETE(
      new Request("http://localhost/api/investments/accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account: "Trade Republic" }),
      })
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ deletedAssets: 2 })
    expect(deleteInvestmentAccountData).toHaveBeenCalledWith({
      householdId: "hh-1",
      account: "Trade Republic",
      targetUserId: "user-1",
    })
  })
})
