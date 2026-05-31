import { describe, expect, it } from "vitest"
import {
  calculateHouseholdFinance,
  getMonthRange,
  previewMonthTransfers,
  type HouseholdFinanceMemberInput,
  type HouseholdFinanceMonthInput,
} from "@/lib/utils/household-finance"

const members: HouseholdFinanceMemberInput[] = [
  { id: "u1", name: "Ada", email: "ada@example.test" },
  { id: "u2", name: "Ben", email: "ben@example.test" },
]

describe("getMonthRange", () => {
  it("creates a range across year boundaries", () => {
    expect(getMonthRange(2026, 12, 2027, 2)).toEqual([
      { year: 2026, month: 12 },
      { year: 2027, month: 1 },
      { year: 2027, month: 2 },
    ])
  })
})

describe("calculateHouseholdFinance", () => {
  const months: HouseholdFinanceMonthInput[] = [
    {
      year: 2026,
      month: 12,
      fixedCosts: 2000,
      incomes: [
        { userId: "u1", amount: 3000 },
        { userId: "u2", amount: 2500 },
      ],
      payouts: [
        { userId: "u1", amount: 1000 },
        { userId: "u2", amount: 1000 },
      ],
    },
    {
      year: 2027,
      month: 1,
      fixedCosts: 2500,
      incomes: [{ userId: "u1", amount: 1000 }],
      payouts: [],
    },
    {
      year: 2027,
      month: 2,
      fixedCosts: 2100,
      incomes: [],
      payouts: [],
    },
  ]

  it("calculates monthly values for multiple members", () => {
    const result = calculateHouseholdFinance({ members, months })
    expect(result.months[0].combinedIncome).toBe(5500)
    expect(result.months[0].remainder).toBe(3500)
    expect(result.months[0].theoreticalPayoutPerPerson).toBe(1750)
    expect(result.months[0].actualPayoutPerPerson).toBe(1000)
    expect(result.months[0].surplusPerPerson).toBe(750)
    expect(result.months[0].transfers).toEqual([
      { userId: "u1", userName: "Ada", amount: 2000 },
      { userId: "u2", userName: "Ben", amount: 1500 },
    ])
    expect(result.months[0].totalTransfer).toBe(3500)
    expect(result.months[0].status).toBe("fertig")
  })

  it("returns empty transfers when no payouts are recorded", () => {
    const result = calculateHouseholdFinance({ members, months })
    expect(result.months[1].transfers).toEqual([])
    expect(result.months[1].totalTransfer).toBe(0)
  })

  it("allows negative transfer when payout exceeds income", () => {
    const negativeMonths: HouseholdFinanceMonthInput[] = [
      {
        year: 2026,
        month: 1,
        fixedCosts: 1000,
        incomes: [{ userId: "u1", amount: 500 }],
        payouts: [{ userId: "u1", amount: 800 }],
      },
    ]
    const result = calculateHouseholdFinance({ members, months: negativeMonths })
    expect(result.months[0].transfers).toEqual([{ userId: "u1", userName: "Ada", amount: -300 }])
    expect(result.months[0].totalTransfer).toBe(-300)
  })

  it("does not create theoretical payouts for negative remainder months", () => {
    const result = calculateHouseholdFinance({ members, months })
    expect(result.months[1].remainder).toBe(-1500)
    expect(result.months[1].theoreticalPayoutPerPerson).toBe(0)
    expect(result.months[1].status).toBe("vorkalkuliert")
  })

  it("keeps empty months empty while still counting simulated fixed costs", () => {
    const result = calculateHouseholdFinance({ members, months })
    expect(result.months[2].status).toBe("leer")
    expect(result.months[2].fixedCosts).toBe(2100)
    expect(result.totals.totalFixedCosts).toBe(6600)
  })

  it("groups quarter surplus by real calendar quarters across years", () => {
    const result = calculateHouseholdFinance({ members, months })
    expect(result.quarters).toEqual([
      { year: 2026, q: 4, surplus: 750, bonusPerPerson: 750 },
      { year: 2027, q: 1, surplus: 0, bonusPerPerson: 0 },
    ])
  })
})

describe("previewMonthTransfers", () => {
  it("calculates transfer as income minus payout for entered members", () => {
    const transfers = previewMonthTransfers(
      members,
      { u1: 3000, u2: 2500 },
      { u1: 1000, u2: 700 }
    )
    expect(transfers).toEqual([
      { userId: "u1", userName: "Ada", amount: 2000 },
      { userId: "u2", userName: "Ben", amount: 1800 },
    ])
  })
})
