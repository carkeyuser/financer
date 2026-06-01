import { prisma } from "@/lib/prisma"
import { computeHouseholdPortfolioSummary, startOfUtcDay } from "@/lib/services/portfolio-data"

export async function upsertTodayPortfolioSnapshot(householdId: string) {
  const today = startOfUtcDay()
  const summary = await computeHouseholdPortfolioSummary(householdId)

  const yesterday = await prisma.portfolioDailySnapshot.findUnique({
    where: {
      householdId_date: { householdId, date: addDays(today, -1) },
    },
  })

  const gainLossEur = yesterday
    ? summary.portfolioTotal - Number(yesterday.totalEur)
    : null

  return prisma.portfolioDailySnapshot.upsert({
    where: { householdId_date: { householdId, date: today } },
    create: {
      householdId,
      date: today,
      totalEur: summary.portfolioTotal,
      gainLossEur,
    },
    update: {
      totalEur: summary.portfolioTotal,
      gainLossEur,
    },
  })
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

export async function getPortfolioSnapshotDelta(householdId: string) {
  const today = startOfUtcDay()
  const yesterday = addDays(today, -1)

  const [todaySnap, yesterdaySnap] = await Promise.all([
    prisma.portfolioDailySnapshot.findUnique({
      where: { householdId_date: { householdId, date: today } },
    }),
    prisma.portfolioDailySnapshot.findUnique({
      where: { householdId_date: { householdId, date: yesterday } },
    }),
  ])

  const current = todaySnap ? Number(todaySnap.totalEur) : null
  const previous = yesterdaySnap ? Number(yesterdaySnap.totalEur) : null

  if (current == null || previous == null) {
    return { current, previous, deltaEur: null, deltaPercent: null }
  }

  const deltaEur = current - previous
  const deltaPercent = previous === 0 ? 0 : (deltaEur / previous) * 100
  return { current, previous, deltaEur, deltaPercent }
}

export async function getPortfolioSnapshotSeries(householdId: string, days: number) {
  const from = addDays(startOfUtcDay(), -(days - 1))
  const rows = await prisma.portfolioDailySnapshot.findMany({
    where: { householdId, date: { gte: from } },
    orderBy: { date: "asc" },
  })
  return rows.map((r) => ({
    date: r.date.toISOString().split("T")[0],
    totalEur: Number(r.totalEur),
    gainLossEur: r.gainLossEur != null ? Number(r.gainLossEur) : null,
  }))
}
