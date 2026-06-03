// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const prisma = {
  personalIncomeMonth: {
    findMany: vi.fn(),
  },
  personalIncomeBonus: {
    findMany: vi.fn(),
  },
  personalIncomeTrackedYear: {
    findMany: vi.fn(),
    upsert: vi.fn(),
  },
  $queryRaw: vi.fn(),
}

vi.mock("@/lib/prisma", () => ({
  prisma,
}))

describe("personal-income service", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    prisma.personalIncomeMonth.findMany.mockResolvedValue([{ year: 2024 }])
    prisma.$queryRaw.mockResolvedValue([{ year: 2023 }])
    prisma.personalIncomeTrackedYear.findMany.mockResolvedValue([{ year: 2010 }])
    prisma.personalIncomeTrackedYear.upsert.mockResolvedValue({})
  })

  it("listPersonalIncomeAvailableYears merges defaults, data, and tracked years", async () => {
    const { listPersonalIncomeAvailableYears } = await import("@/lib/services/personal-income")
    const currentYear = new Date().getFullYear()

    const result = await listPersonalIncomeAvailableYears("hh-1", "user-1")

    expect(result.currentYear).toBe(currentYear)
    expect(result.years).toContain(currentYear)
    expect(result.years).toContain(2024)
    expect(result.years).toContain(2023)
    expect(result.years).toContain(2010)
    expect(prisma.personalIncomeTrackedYear.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ year: { lte: currentYear } }),
      })
    )
  })

  it("trackPersonalIncomeYear rejects current year", async () => {
    const { trackPersonalIncomeYear } = await import("@/lib/services/personal-income")
    const currentYear = new Date().getFullYear()

    await expect(trackPersonalIncomeYear("hh-1", "user-1", currentYear)).rejects.toThrow(
      "YEAR_NOT_PAST"
    )
    expect(prisma.personalIncomeTrackedYear.upsert).not.toHaveBeenCalled()
  })

  it("trackPersonalIncomeYear upserts past year and returns refreshed list", async () => {
    const { trackPersonalIncomeYear } = await import("@/lib/services/personal-income")

    const result = await trackPersonalIncomeYear("hh-1", "user-1", 2010)

    expect(prisma.personalIncomeTrackedYear.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { householdId_userId_year: { householdId: "hh-1", userId: "user-1", year: 2010 } },
      })
    )
    expect(result.years).toContain(2010)
  })
})
