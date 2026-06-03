import type { Prisma, PrismaClient } from "@/generated/prisma"
import { prisma } from "@/lib/prisma"
import {
  bonusForCalendarMonth,
  buildPersonalIncomeYearSummary,
  buildPersonalIncomeYearsMatrixFromList,
  mergePersonalIncomeYearList,
  type PersonalIncomeYearColumn,
  type PersonalIncomeYearSummary,
} from "@/lib/utils/personal-income"

type DbClient = PrismaClient | Prisma.TransactionClient

function toNum(value: Prisma.Decimal | null | undefined): number | null {
  if (value == null) return null
  return Number(value)
}

export async function listPersonalIncomeAvailableYears(
  householdId: string,
  userId: string
): Promise<{ years: number[]; currentYear: number }> {
  const currentYear = new Date().getFullYear()

  const [monthRows, bonusYearRows, trackedRows] = await Promise.all([
    prisma.personalIncomeMonth.findMany({
      where: { householdId, userId },
      select: { year: true },
      distinct: ["year"],
    }),
    prisma.$queryRaw<{ year: number }[]>`
      SELECT DISTINCT EXTRACT(YEAR FROM date)::int AS year
      FROM "PersonalIncomeBonus"
      WHERE "householdId" = ${householdId} AND "userId" = ${userId}
    `,
    prisma.personalIncomeTrackedYear.findMany({
      where: { householdId, userId, year: { lte: currentYear } },
      select: { year: true },
    }),
  ])

  const dataYears = [
    ...monthRows.map((r) => r.year),
    ...bonusYearRows.map((r) => r.year),
  ]
  const trackedYears = trackedRows.map((r) => r.year)
  const years = mergePersonalIncomeYearList(currentYear, dataYears, trackedYears)

  return { years, currentYear }
}

export async function trackPersonalIncomeYear(
  householdId: string,
  userId: string,
  year: number
): Promise<{ years: number[] }> {
  const currentYear = new Date().getFullYear()
  if (year >= currentYear) {
    throw new Error("YEAR_NOT_PAST")
  }

  await prisma.personalIncomeTrackedYear.upsert({
    where: {
      householdId_userId_year: { householdId, userId, year },
    },
    update: {},
    create: { householdId, userId, year },
  })

  const { years } = await listPersonalIncomeAvailableYears(householdId, userId)
  return { years }
}

export async function loadPersonalIncomeYearSummary(
  householdId: string,
  userId: string,
  year: number
): Promise<PersonalIncomeYearSummary> {
  const [months, bonuses, householdIncomes] = await Promise.all([
    prisma.personalIncomeMonth.findMany({
      where: { householdId, userId, year },
    }),
    prisma.personalIncomeBonus.findMany({
      where: {
        householdId,
        userId,
        date: {
          gte: new Date(year, 0, 1),
          lt: new Date(year + 1, 0, 1),
        },
      },
    }),
    prisma.monthlyIncome.findMany({
      where: { householdId, userId, year },
    }),
  ])

  const extraBonusesByMonth: Record<number, number> = {}
  for (let m = 1; m <= 12; m++) {
    extraBonusesByMonth[m] = bonusForCalendarMonth(
      bonuses.map((b) => ({ date: b.date, amount: Number(b.amount) })),
      year,
      m
    )
  }

  const householdIncomeByMonth: Record<number, number | null> = {}
  for (let m = 1; m <= 12; m++) {
    const inc = householdIncomes.find((i) => i.month === m)
    householdIncomeByMonth[m] = inc ? Number(inc.amount) : null
  }

  return buildPersonalIncomeYearSummary({
    year,
    months: months.map((m) => ({
      month: m.month,
      grossSalary: toNum(m.grossSalary),
      netSalary: toNum(m.netSalary),
      monthBonus: toNum(m.monthBonus),
      note: m.note,
      syncedToHouseholdAt: m.syncedToHouseholdAt,
    })),
    extraBonusesByMonth,
    householdIncomeByMonth,
  })
}

export async function loadPersonalIncomeYearsMatrix(
  householdId: string,
  userId: string,
  years: number[]
) {
  const uniqueYears = [...new Set(years)].filter((y) => y >= 2000)
  if (uniqueYears.length === 0) {
    return buildPersonalIncomeYearsMatrixFromList([], [])
  }

  const [months, bonuses] = await Promise.all([
    prisma.personalIncomeMonth.findMany({
      where: { householdId, userId, year: { in: uniqueYears } },
    }),
    prisma.personalIncomeBonus.findMany({
      where: {
        householdId,
        userId,
        OR: uniqueYears.map((year) => ({
          date: {
            gte: new Date(year, 0, 1),
            lt: new Date(year + 1, 0, 1),
          },
        })),
      },
    }),
  ])

  const columns: PersonalIncomeYearColumn[] = []
  for (const year of uniqueYears) {
    const yearMonths = months.filter((m) => m.year === year)
    const yearBonuses = bonuses.filter((b) => b.date.getFullYear() === year)

    let extraBonusTotal = 0
    for (let m = 1; m <= 12; m++) {
      extraBonusTotal += bonusForCalendarMonth(
        yearBonuses.map((b) => ({ date: b.date, amount: Number(b.amount) })),
        year,
        m
      )
    }

    const monthBonusTotal = yearMonths.reduce((s, m) => s + Number(m.monthBonus ?? 0), 0)

    columns.push({
      year,
      gross: yearMonths.reduce((s, m) => s + Number(m.grossSalary ?? 0), 0),
      net: yearMonths.reduce((s, m) => s + Number(m.netSalary ?? 0), 0),
      totalBonus: monthBonusTotal + extraBonusTotal,
    })
  }

  return buildPersonalIncomeYearsMatrixFromList(uniqueYears, columns)
}

export async function upsertPersonalIncomeMonth(
  householdId: string,
  userId: string,
  data: {
    year: number
    month: number
    grossSalary?: number | null
    netSalary?: number | null
    monthBonus?: number | null
    note?: string | null
  }
) {
  const createUpdate = {
    grossSalary: data.grossSalary ?? null,
    netSalary: data.netSalary ?? null,
    monthBonus: data.monthBonus ?? null,
    note: data.note ?? null,
  }

  return prisma.personalIncomeMonth.upsert({
    where: {
      householdId_userId_year_month: { householdId, userId, year: data.year, month: data.month },
    },
    update: createUpdate,
    create: {
      householdId,
      userId,
      year: data.year,
      month: data.month,
      ...createUpdate,
    },
  })
}

export async function upsertHouseholdIncomeFromNet(
  tx: DbClient,
  householdId: string,
  userId: string,
  year: number,
  month: number,
  amount: number
) {
  await tx.monthlyIncome.upsert({
    where: { householdId_userId_year_month: { householdId, userId, year, month } },
    update: { amount },
    create: { householdId, userId, year, month, amount },
  })

  const existing = await tx.monthlyFixedCostSnapshot.findUnique({
    where: { householdId_year_month: { householdId, year, month } },
  })
  if (!existing) {
    const sum = await tx.fixedCost.aggregate({ _sum: { amount: true }, where: { householdId } })
    await tx.monthlyFixedCostSnapshot.create({
      data: { householdId, year, month, fixedCosts: (sum._sum.amount ?? 0).toString() },
    })
  }
}

export async function syncPersonalIncomeToHousehold(
  householdId: string,
  userId: string,
  year: number,
  month: number
) {
  const record = await prisma.personalIncomeMonth.findUnique({
    where: { householdId_userId_year_month: { householdId, userId, year, month } },
  })

  if (!record?.netSalary) {
    throw new Error("NO_NET_SALARY")
  }

  const netAmount = Number(record.netSalary)

  await prisma.$transaction(async (tx) => {
    await upsertHouseholdIncomeFromNet(tx, householdId, userId, year, month, netAmount)
    await tx.personalIncomeMonth.update({
      where: { id: record.id },
      data: { syncedToHouseholdAt: new Date() },
    })
  })

  return { netAmount }
}

export async function listPersonalIncomeBonusesForMonth(
  householdId: string,
  userId: string,
  year: number,
  month: number
) {
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 1)

  const rows = await prisma.personalIncomeBonus.findMany({
    where: {
      householdId,
      userId,
      date: { gte: start, lt: end },
    },
    orderBy: { date: "asc" },
  })

  return rows.map((b) => ({
    id: b.id,
    date: b.date.toISOString().slice(0, 10),
    amount: Number(b.amount),
    label: b.label,
    note: b.note,
  }))
}

export async function createPersonalIncomeBonus(
  householdId: string,
  userId: string,
  data: { date: string; amount: number; label: string; note?: string | null }
) {
  const date = new Date(data.date)
  if (Number.isNaN(date.getTime())) {
    throw new Error("INVALID_DATE")
  }

  const row = await prisma.personalIncomeBonus.create({
    data: {
      householdId,
      userId,
      date,
      amount: data.amount,
      label: data.label,
      note: data.note ?? null,
    },
  })

  return {
    id: row.id,
    date: row.date.toISOString().slice(0, 10),
    amount: Number(row.amount),
    label: row.label,
    note: row.note,
  }
}

export async function deletePersonalIncomeBonus(
  householdId: string,
  userId: string,
  bonusId: string
) {
  const row = await prisma.personalIncomeBonus.findFirst({
    where: { id: bonusId, householdId, userId },
  })
  if (!row) return null
  await prisma.personalIncomeBonus.delete({ where: { id: bonusId } })
  return row
}
