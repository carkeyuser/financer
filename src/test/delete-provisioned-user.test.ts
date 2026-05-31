// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const requireHouseholdAdmin = vi.fn()
const assertOwnerCanManageUser = vi.fn()
const deleteProvisionedUserAccount = vi.fn()

vi.mock("@/lib/household-auth", () => ({
  requireHouseholdAdmin: (...args: unknown[]) => requireHouseholdAdmin(...args),
}))

vi.mock("@/lib/provisioned-users", () => ({
  assertOwnerCanManageUser: (...args: unknown[]) => assertOwnerCanManageUser(...args),
}))

vi.mock("@/lib/services/delete-provisioned-user", () => ({
  deleteProvisionedUserAccount: (...args: unknown[]) => deleteProvisionedUserAccount(...args),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    householdMember: {
      findUnique: vi.fn(),
    },
  },
}))

import { prisma } from "@/lib/prisma"

describe("DELETE /api/admin/users/[userId]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireHouseholdAdmin.mockResolvedValue({
      userId: "admin-1",
      householdId: "hh-main",
      membership: { role: "ADMIN" },
    })
    assertOwnerCanManageUser.mockResolvedValue({ ok: true })
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      provisionedByUserId: "owner-1",
    } as never)
    vi.mocked(prisma.householdMember.findUnique).mockResolvedValue(null)
    deleteProvisionedUserAccount.mockResolvedValue(undefined)
  })

  it("deletes provisioned tenant user", async () => {
    const { DELETE } = await import("@/app/api/admin/users/[userId]/route")

    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ userId: "tenant-1" }),
    })

    expect(response.status).toBe(204)
    expect(deleteProvisionedUserAccount).toHaveBeenCalledWith("tenant-1")
  })

  it("rejects self-delete", async () => {
    const { DELETE } = await import("@/app/api/admin/users/[userId]/route")

    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ userId: "admin-1" }),
    })

    expect(response.status).toBe(400)
    expect(deleteProvisionedUserAccount).not.toHaveBeenCalled()
  })

  it("rejects non-provisioned user", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      provisionedByUserId: null,
    } as never)

    const { DELETE } = await import("@/app/api/admin/users/[userId]/route")

    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ userId: "member-1" }),
    })

    expect(response.status).toBe(400)
    expect(deleteProvisionedUserAccount).not.toHaveBeenCalled()
  })
})
