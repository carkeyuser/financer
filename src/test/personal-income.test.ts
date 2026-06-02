import { describe, expect, it } from "vitest"
import {
  bonusForCalendarMonth,
  buildPersonalIncomeYearSummary,
  buildPersonalIncomeYearsMatrix,
  sumDefined,
} from "@/lib/utils/personal-income"

describe("personal-income utils", () => {
  it("sumDefined ignores nulls", () => {
    expect(sumDefined([100, null, 50, undefined])).toBe(150)
  })

  it("bonusForCalendarMonth filters by year and month", () => {
    const bonuses = [
      { date: new Date(2026, 5, 15), amount: 500 },
      { date: new Date(2026, 6, 1), amount: 200 },
      { date: new Date(2025, 5, 15), amount: 999 },
    ]
    expect(bonusForCalendarMonth(bonuses, 2026, 6)).toBe(500)
    expect(bonusForCalendarMonth(bonuses, 2026, 7)).toBe(200)
  })

  it("buildPersonalIncomeYearSummary aggregates 12 months", () => {
    const summary = buildPersonalIncomeYearSummary({
      year: 2026,
      months: [
        {
          month: 1,
          grossSalary: 5000,
          netSalary: 3200,
          monthBonus: 100,
          note: null,
          syncedToHouseholdAt: new Date("2026-02-01"),
        },
        {
          month: 3,
          grossSalary: 5100,
          netSalary: 3300,
          monthBonus: null,
          note: "Q1",
          syncedToHouseholdAt: null,
        },
      ],
      extraBonusesByMonth: { 1: 200, 3: 0 },
      householdIncomeByMonth: { 1: 3200, 3: null },
    })

    expect(summary.months).toHaveLength(12)
    expect(summary.months[0].totalBonus).toBe(300)
    expect(summary.months[0].householdIncomeAmount).toBe(3200)
    expect(summary.months[1].grossSalary).toBeNull()
    expect(summary.totals.gross).toBe(10100)
    expect(summary.totals.net).toBe(6500)
    expect(summary.totals.totalBonus).toBe(300)
  })

  it("buildPersonalIncomeYearsMatrix fills missing years", () => {
    const matrix = buildPersonalIncomeYearsMatrix(
      [
        { year: 2024, gross: 60000, net: 40000, totalBonus: 1000 },
        { year: 2026, gross: 62000, net: 41000, totalBonus: 1500 },
      ],
      2024,
      2026
    )
    expect(matrix.years).toEqual([2024, 2025, 2026])
    expect(matrix.columns[1]).toEqual({ year: 2025, gross: 0, net: 0, totalBonus: 0 })
  })
})
