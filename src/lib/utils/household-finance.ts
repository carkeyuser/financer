export type HouseholdFinanceStatus = "leer" | "vorkalkuliert" | "fertig"

export interface HouseholdFinanceMemberInput {
  id: string
  name: string | null
  email: string | null
}

export interface HouseholdFinanceAmountInput {
  userId: string
  amount: number
}

export interface HouseholdFinanceMonthInput {
  year: number
  month: number
  fixedCosts: number
  incomes: HouseholdFinanceAmountInput[]
  payouts: HouseholdFinanceAmountInput[]
}

export interface HouseholdFinanceTransfer {
  userId: string
  userName: string | null
  amount: number
}

export interface HouseholdFinanceCalculatedMonth {
  year: number
  month: number
  incomes: { userId: string; userName: string | null; amount: number }[]
  combinedIncome: number
  fixedCosts: number
  remainder: number
  theoreticalPayoutPerPerson: number
  payouts: { userId: string; userName: string | null; amount: number }[]
  actualPayoutPerPerson: number
  surplusPerPerson: number
  transfers: HouseholdFinanceTransfer[]
  totalTransfer: number
  status: HouseholdFinanceStatus
}

export interface HouseholdFinanceQuarter {
  year: number
  q: number
  surplus: number
  bonusPerPerson: number
}

export interface HouseholdFinanceTotals {
  combinedIncome: number
  totalFixedCosts: number
  totalRemainder: number
  totalTheoreticalPayout: number
  totalActualPayout: number
  averageActualPayout: number
}

export interface HouseholdFinanceCalculation {
  months: HouseholdFinanceCalculatedMonth[]
  quarters: HouseholdFinanceQuarter[]
  totals: HouseholdFinanceTotals
}

export function monthIndex(year: number, month: number) {
  return year * 12 + month - 1
}

export function compareYearMonth(
  a: { year: number; month: number },
  b: { year: number; month: number }
) {
  return monthIndex(a.year, a.month) - monthIndex(b.year, b.month)
}

export function getMonthRange(
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number
) {
  const start = monthIndex(startYear, startMonth)
  const end = monthIndex(endYear, endMonth)
  if (end < start) return []

  return Array.from({ length: end - start + 1 }, (_, i) => {
    const index = start + i
    return {
      year: Math.floor(index / 12),
      month: (index % 12) + 1,
    }
  })
}

export function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`
}

function computeMonthTransfers(
  members: HouseholdFinanceMemberInput[],
  incomes: HouseholdFinanceAmountInput[],
  payouts: HouseholdFinanceAmountInput[],
  memberNameById: Map<string, string | null>
): HouseholdFinanceTransfer[] {
  const incomeByUser = new Map(incomes.map((inc) => [inc.userId, inc.amount]))
  const payoutByUser = new Map(payouts.map((p) => [p.userId, p.amount]))

  return members
    .filter((member) => incomeByUser.has(member.id) && payoutByUser.has(member.id))
    .map((member) => ({
      userId: member.id,
      userName: memberNameById.get(member.id) ?? member.name ?? member.email ?? member.id,
      amount: (incomeByUser.get(member.id) ?? 0) - (payoutByUser.get(member.id) ?? 0),
    }))
}

export function previewMonthTransfers(
  members: { id: string; name: string | null; email?: string | null }[],
  incomes: Record<string, number>,
  payouts: Record<string, number>
): HouseholdFinanceTransfer[] {
  return members
    .filter((member) => member.id in payouts)
    .map((member) => ({
      userId: member.id,
      userName: member.name ?? member.email ?? member.id,
      amount: (incomes[member.id] ?? 0) - payouts[member.id],
    }))
}

export function calculateHouseholdFinance({
  members,
  months,
}: {
  members: HouseholdFinanceMemberInput[]
  months: HouseholdFinanceMonthInput[]
}): HouseholdFinanceCalculation {
  const memberCount = members.length || 2
  const memberNameById = new Map(members.map((m) => [m.id, m.name ?? m.email ?? m.id]))

  const calculatedMonths = [...months]
    .sort(compareYearMonth)
    .map((source): HouseholdFinanceCalculatedMonth => {
      const combinedIncome = source.incomes.reduce((s, inc) => s + inc.amount, 0)
      const remainder = combinedIncome - source.fixedCosts
      const theoreticalPayoutPerPerson = remainder > 0 ? remainder / memberCount : 0
      const totalActualPayout = source.payouts.reduce((s, p) => s + p.amount, 0)
      const actualPayoutPerPerson = totalActualPayout / memberCount

      const hasIncome = source.incomes.length > 0
      const hasPayout = source.payouts.length > 0
      const transfers = computeMonthTransfers(members, source.incomes, source.payouts, memberNameById)
      const totalTransfer = transfers.reduce((s, transfer) => s + transfer.amount, 0)

      return {
        year: source.year,
        month: source.month,
        incomes: source.incomes.map((inc) => ({
          userId: inc.userId,
          userName: memberNameById.get(inc.userId) ?? inc.userId,
          amount: inc.amount,
        })),
        combinedIncome,
        fixedCosts: source.fixedCosts,
        remainder,
        theoreticalPayoutPerPerson,
        payouts: source.payouts.map((p) => ({
          userId: p.userId,
          userName: memberNameById.get(p.userId) ?? p.userId,
          amount: p.amount,
        })),
        actualPayoutPerPerson,
        surplusPerPerson: theoreticalPayoutPerPerson - actualPayoutPerPerson,
        transfers,
        totalTransfer,
        status: !hasIncome ? "leer" : !hasPayout ? "vorkalkuliert" : "fertig",
      }
    })

  const quarterKeys = Array.from(
    new Set(calculatedMonths.map((m) => `${m.year}-Q${Math.ceil(m.month / 3)}`))
  )

  const quarters = quarterKeys.map((key) => {
    const [yearPart, qPart] = key.split("-Q")
    const year = Number(yearPart)
    const q = Number(qPart)
    const qMonths = calculatedMonths.filter((m) => m.year === year && Math.ceil(m.month / 3) === q)
    const surplus = qMonths.reduce((s, m) => s + m.surplusPerPerson, 0)
    return { year, q, surplus, bonusPerPerson: surplus }
  })

  const finishedMonths = calculatedMonths.filter((m) => m.status === "fertig")

  return {
    months: calculatedMonths,
    quarters,
    totals: {
      combinedIncome: calculatedMonths.reduce((s, m) => s + m.combinedIncome, 0),
      totalFixedCosts: calculatedMonths.reduce((s, m) => s + m.fixedCosts, 0),
      totalRemainder: calculatedMonths.reduce((s, m) => s + m.remainder, 0),
      totalTheoreticalPayout: calculatedMonths.reduce((s, m) => s + m.theoreticalPayoutPerPerson, 0),
      totalActualPayout: calculatedMonths.reduce((s, m) => s + m.actualPayoutPerPerson, 0),
      averageActualPayout:
        finishedMonths.length > 0
          ? finishedMonths.reduce((s, m) => s + m.actualPayoutPerPerson, 0) / finishedMonths.length
          : 0,
    },
  }
}
