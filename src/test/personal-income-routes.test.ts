// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

const requireSession = vi.fn()
const loadPersonalIncomeYearSummary = vi.fn()
const upsertPersonalIncomeMonth = vi.fn()
const deletePersonalIncomeBonus = vi.fn()
const listPersonalIncomeAvailableYears = vi.fn()
const trackPersonalIncomeYear = vi.fn()
const loadPersonalIncomeYearsMatrix = vi.fn()

vi.mock("@/lib/household-auth", () => ({
  requireSession: (...args: unknown[]) => requireSession(...args),
}))

vi.mock("@/lib/services/personal-income", () => ({
  loadPersonalIncomeYearSummary: (...args: unknown[]) => loadPersonalIncomeYearSummary(...args),
  upsertPersonalIncomeMonth: (...args: unknown[]) => upsertPersonalIncomeMonth(...args),
  deletePersonalIncomeBonus: (...args: unknown[]) => deletePersonalIncomeBonus(...args),
  listPersonalIncomeAvailableYears: (...args: unknown[]) => listPersonalIncomeAvailableYears(...args),
  trackPersonalIncomeYear: (...args: unknown[]) => trackPersonalIncomeYear(...args),
  loadPersonalIncomeYearsMatrix: (...args: unknown[]) => loadPersonalIncomeYearsMatrix(...args),
}))

describe("personal-income API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireSession.mockResolvedValue({ userId: "user-1", householdId: "hh-1" })
    loadPersonalIncomeYearSummary.mockResolvedValue({ year: 2026, months: [] })
    upsertPersonalIncomeMonth.mockResolvedValue(undefined)
    deletePersonalIncomeBonus.mockResolvedValue(true)
    listPersonalIncomeAvailableYears.mockResolvedValue({
      years: [2026, 2025, 2024],
      currentYear: 2026,
    })
    trackPersonalIncomeYear.mockResolvedValue({ years: [2026, 2025, 2024, 2010] })
    loadPersonalIncomeYearsMatrix.mockResolvedValue({
      fromYear: 2024,
      toYear: 2026,
      years: [2024, 2025, 2026],
      columns: [],
    })
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

  it("GET summary rejects invalid year", async () => {
    const { GET } = await import("@/app/api/personal-income/summary/route")

    const response = await GET(
      new NextRequest("http://localhost/api/personal-income/summary?year=abc")
    )
    expect(response.status).toBe(400)
    expect(loadPersonalIncomeYearSummary).not.toHaveBeenCalled()
  })

  it("GET available-years returns year list for session user", async () => {
    const { GET } = await import("@/app/api/personal-income/available-years/route")

    const response = await GET()
    expect(response.status).toBe(200)
    expect(listPersonalIncomeAvailableYears).toHaveBeenCalledWith("hh-1", "user-1")
    const body = await response.json()
    expect(body.years).toEqual([2026, 2025, 2024])
  })

  it("POST available-years tracks past year for session user", async () => {
    const { POST } = await import("@/app/api/personal-income/available-years/route")

    const response = await POST(
      new NextRequest("http://localhost/api/personal-income/available-years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: 2010 }),
      })
    )
    expect(response.status).toBe(200)
    expect(trackPersonalIncomeYear).toHaveBeenCalledWith("hh-1", "user-1", 2010)
  })

  it("POST available-years rejects current or future year", async () => {
    const { POST } = await import("@/app/api/personal-income/available-years/route")
    const currentYear = new Date().getFullYear()

    const response = await POST(
      new NextRequest("http://localhost/api/personal-income/available-years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: currentYear }),
      })
    )
    expect(response.status).toBe(400)
    expect(trackPersonalIncomeYear).not.toHaveBeenCalled()
  })

  it("GET years uses explicit year list", async () => {
    const { GET } = await import("@/app/api/personal-income/years/route")

    const response = await GET(
      new NextRequest("http://localhost/api/personal-income/years?years=2026,2010")
    )
    expect(response.status).toBe(200)
    expect(loadPersonalIncomeYearsMatrix).toHaveBeenCalledWith("hh-1", "user-1", [2026, 2010])
  })

  it("GET years rejects span over 30 years via from/to", async () => {
    const { GET } = await import("@/app/api/personal-income/years/route")

    const response = await GET(
      new NextRequest("http://localhost/api/personal-income/years?from=1990&to=2026")
    )
    expect(response.status).toBe(400)
    expect(loadPersonalIncomeYearsMatrix).not.toHaveBeenCalled()
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
