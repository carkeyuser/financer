// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

const requireSession = vi.fn()
const loadPersonalIncomeYearSummary = vi.fn()
const upsertPersonalIncomeMonth = vi.fn()
const deletePersonalIncomeBonus = vi.fn()

vi.mock("@/lib/household-auth", () => ({
  requireSession: (...args: unknown[]) => requireSession(...args),
}))

vi.mock("@/lib/services/personal-income", () => ({
  loadPersonalIncomeYearSummary: (...args: unknown[]) => loadPersonalIncomeYearSummary(...args),
  upsertPersonalIncomeMonth: (...args: unknown[]) => upsertPersonalIncomeMonth(...args),
  deletePersonalIncomeBonus: (...args: unknown[]) => deletePersonalIncomeBonus(...args),
}))

describe("personal-income API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireSession.mockResolvedValue({ userId: "user-1", householdId: "hh-1" })
    loadPersonalIncomeYearSummary.mockResolvedValue({ year: 2026, months: [] })
    upsertPersonalIncomeMonth.mockResolvedValue(undefined)
    deletePersonalIncomeBonus.mockResolvedValue(true)
  })

  it("GET summary returns 401 without session", async () => {
    requireSession.mockResolvedValue({ error: "Nicht autorisiert", status: 401 })
    const { GET } = await import("@/app/api/personal-income/summary/route")

    const response = await GET(
      new NextRequest("http://localhost/api/personal-income/summary?year=2026")
    )
    expect(response.status).toBe(401)
    expect(loadPersonalIncomeYearSummary).not.toHaveBeenCalled()
  })

  it("GET summary scopes queries to session user and household", async () => {
    const { GET } = await import("@/app/api/personal-income/summary/route")

    const response = await GET(
      new NextRequest("http://localhost/api/personal-income/summary?year=2026")
    )
    expect(response.status).toBe(200)
    expect(loadPersonalIncomeYearSummary).toHaveBeenCalledWith("hh-1", "user-1", 2026)
  })

  it("PUT months upserts only for session user", async () => {
    const { PUT } = await import("@/app/api/personal-income/months/route")

    const response = await PUT(
      new Request("http://localhost/api/personal-income/months", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: 2026, month: 3, netSalary: 3200 }),
      })
    )

    expect(response.status).toBe(200)
    expect(upsertPersonalIncomeMonth).toHaveBeenCalledWith(
      "hh-1",
      "user-1",
      expect.objectContaining({ year: 2026, month: 3, netSalary: 3200 })
    )
  })

  it("DELETE bonus scopes delete to session user", async () => {
    const { DELETE } = await import("@/app/api/personal-income/bonuses/[id]/route")

    const response = await DELETE(new Request("http://localhost/api/bonuses/b1"), {
      params: Promise.resolve({ id: "bonus-1" }),
    })

    expect(response.status).toBe(200)
    expect(deletePersonalIncomeBonus).toHaveBeenCalledWith("hh-1", "user-1", "bonus-1")
  })
})
