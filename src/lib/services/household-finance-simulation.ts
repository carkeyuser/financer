import { prisma } from "@/lib/prisma"
import {
  compareYearMonth,
  getMonthRange,
  monthKey,
  type HouseholdFinanceAmountInput,
  type HouseholdFinanceMonthInput,
} from "@/lib/utils/household-finance"

export async function getHouseholdFinanceMembers(householdId: string) {
  const members = await prisma.householdMember.findMany({
    where: { householdId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { joinedAt: "asc" },
  })

  return members.map((m) => ({ id: m.userId, name: m.user.name, email: m.user.email }))
}

export async function assertSimulationAccess(id: string, householdId: string) {
  return prisma.householdFinanceSimulation.findFirst({
    where: { id, householdId },
  })
}

export async function buildSimulationBaseline({
  householdId,
  startYear,
  startMonth,
  endYear,
  endMonth,
}: {
  householdId: string
  startYear: number
  startMonth: number
  endYear: number
  endMonth: number
}): Promise<HouseholdFinanceMonthInput[]> {
  const range = getMonthRange(startYear, startMonth, endYear, endMonth)
  const rangeKeys = new Set(range.map((m) => monthKey(m.year, m.month)))
  const years = Array.from(new Set(range.map((m) => m.year)))

  const [fixedCosts, incomes, payouts, snapshots] = await Promise.all([
    prisma.fixedCost.findMany({ where: { householdId } }),
    prisma.monthlyIncome.findMany({ where: { householdId, year: { in: years } } }),
    prisma.monthlyPayout.findMany({ where: { householdId, year: { in: years } } }),
    prisma.monthlyFixedCostSnapshot.findMany({ where: { householdId, year: { in: years } } }),
  ])

  const currentFixedCosts = fixedCosts.reduce((sum, cost) => sum + Number(cost.amount), 0)

  return range.map(({ year, month }) => {
    const key = monthKey(year, month)
    const snapshot = snapshots.find((s) => s.year === year && s.month === month)
    const monthIncomes = incomes.filter((inc) => rangeKeys.has(key) && inc.year === year && inc.month === month)
    const monthPayouts = payouts.filter((p) => rangeKeys.has(key) && p.year === year && p.month === month)

    return {
      year,
      month,
      fixedCosts: snapshot ? Number(snapshot.fixedCosts) : currentFixedCosts,
      incomes: monthIncomes.map((inc) => ({ userId: inc.userId, amount: Number(inc.amount) })),
      payouts: monthPayouts.map((p) => ({ userId: p.userId, amount: Number(p.amount) })),
    }
  })
}

export function simulationMonthEntries(data: {
  incomes: HouseholdFinanceAmountInput[]
  payouts: HouseholdFinanceAmountInput[]
}) {
  return [
    ...data.incomes
      .filter((entry) => entry.amount > 0)
      .map((entry) => ({ userId: entry.userId, type: "INCOME" as const, amount: entry.amount })),
    ...data.payouts
      .filter((entry) => entry.amount > 0)
      .map((entry) => ({ userId: entry.userId, type: "PAYOUT" as const, amount: entry.amount })),
  ]
}

export function monthsWithinSimulation(
  simulation: { startYear: number; startMonth: number; endYear: number; endMonth: number },
  from?: { year: number; month: number }
) {
  const months = getMonthRange(
    simulation.startYear,
    simulation.startMonth,
    simulation.endYear,
    simulation.endMonth
  )
  if (!from) return months
  return months.filter((month) => compareYearMonth(month, from) >= 0)
}
