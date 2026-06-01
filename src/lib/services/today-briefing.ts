import { prisma } from "@/lib/prisma"
import { excludeInterestTicker } from "@/lib/constants/interest-asset"
import { fetchCalendarEvents } from "@/lib/services/nasdaq-calendar"
import {
  enrichAssetsForDisplay,
  loadHouseholdAssets,
  loadHouseholdPortfolioItems,
  startOfUtcDay,
} from "@/lib/services/portfolio-data"
import { getPortfolioSnapshotDelta } from "@/lib/services/portfolio-snapshot"
import { calculateHouseholdFinance } from "@/lib/utils/household-finance"
import { filterCalendarEventsWithinDays } from "@/lib/utils/market-calendar-utils"
import {
  buildManualDividendEvent,
  calculateDividendKpis,
  type DividendAssetOption,
} from "@/lib/utils/dividends"
import { getEurRate } from "@/lib/utils/currency"
import { computePortfolioSummary } from "@/lib/utils/calculations"

export async function buildTodayBriefing(householdId: string, userId: string) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  let portfolio: Awaited<ReturnType<typeof buildPortfolioSection>> | { error: "fx" }
  try {
    portfolio = await buildPortfolioSection(householdId)
  } catch {
    portfolio = { error: "fx" }
  }

  const topFlop = await buildTopFlopSection(householdId)
  const calendar = await buildCalendarSection(householdId)
  const household = await buildHouseholdSection(householdId, year, month)
  const dividends = await buildDividendsSection(householdId, year, month)
  const checklist = await buildChecklistSection(householdId, year, month)

  return {
    generatedAt: now.toISOString(),
    portfolio,
    topFlop,
    calendar,
    household,
    dividends,
    checklist,
    visit: { userId, householdId },
  }
}

async function buildPortfolioSection(householdId: string) {
  const { items } = await loadHouseholdPortfolioItems(householdId)
  const summary = computePortfolioSummary(items)
  const snapshot = await getPortfolioSnapshotDelta(householdId)

  return {
    portfolioTotal: summary.portfolioTotal,
    portfolioGainLoss: summary.portfolioGainLoss,
    portfolioGainLossPercent: summary.portfolioGainLossPercent,
    positionCount: summary.positionCount,
    sinceYesterday: snapshot,
  }
}

async function buildTopFlopSection(householdId: string) {
  const assets = await loadHouseholdAssets(householdId)
  const currencies = [...new Set(assets.map((a) => a.currency))]
  const eurRates = Object.fromEntries(
    await Promise.all(currencies.map(async (c) => [c, await getEurRate(c)]))
  )
  const enriched = enrichAssetsForDisplay(assets, eurRates).sort((a, b) => b.gainLossPct - a.gainLossPct)

  return {
    top: enriched.slice(0, 3).map((a) => ({
      id: a.id,
      name: a.name,
      ticker: a.ticker,
      gainLossPct: a.gainLossPct,
      gainLossEur: a.gainLossEur,
    })),
    flop: enriched.slice(-3).reverse().map((a) => ({
      id: a.id,
      name: a.name,
      ticker: a.ticker,
      gainLossPct: a.gainLossPct,
      gainLossEur: a.gainLossEur,
    })),
  }
}

async function buildCalendarSection(householdId: string) {
  const assets = await prisma.asset.findMany({
    where: { householdId, ticker: excludeInterestTicker },
    select: { ticker: true, name: true },
  })
  const events = filterCalendarEventsWithinDays(await fetchCalendarEvents(assets), 7)
  return { events: events.slice(0, 10), portfolioOnly: true }
}

async function buildHouseholdSection(householdId: string, year: number, month: number) {
  const [fixedCosts, members, incomes, payouts, snapshots] = await Promise.all([
    prisma.fixedCost.findMany({ where: { householdId } }),
    prisma.householdMember.findMany({
      where: { householdId },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.monthlyIncome.findMany({ where: { householdId, year } }),
    prisma.monthlyPayout.findMany({ where: { householdId, year } }),
    prisma.monthlyFixedCostSnapshot.findMany({ where: { householdId, year } }),
  ])

  const currentFixedCosts = fixedCosts.reduce((s, c) => s + Number(c.amount), 0)
  const monthInputs = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1
    const snapshot = snapshots.find((s) => s.month === m)
    return {
      year,
      month: m,
      fixedCosts: snapshot ? Number(snapshot.fixedCosts) : currentFixedCosts,
      incomes: incomes
        .filter((inc) => inc.month === m)
        .map((inc) => ({ userId: inc.userId, amount: Number(inc.amount) })),
      payouts: payouts
        .filter((p) => p.month === m)
        .map((p) => ({ userId: p.userId, amount: Number(p.amount) })),
    }
  })

  const calc = calculateHouseholdFinance({
    members: members.map((m) => ({ id: m.userId, name: m.user.name, email: m.user.email })),
    months: monthInputs,
  })

  const current = calc.months.find((m) => m.year === year && m.month === month)
  return {
    year,
    month,
    status: current?.status ?? "leer",
    transfers: current?.transfers ?? [],
    remainder: current?.remainder ?? 0,
    combinedIncome: current?.combinedIncome ?? 0,
  }
}

async function buildDividendsSection(householdId: string, year: number, month: number) {
  const assets = await prisma.asset.findMany({
    where: { householdId },
    include: { user: { select: { name: true, username: true } } },
  })
  const assetOptions: DividendAssetOption[] = assets.map((a) => ({
    id: a.id,
    ticker: a.ticker,
    name: a.name,
    type: a.type,
    account: a.account,
    ownerName: a.user?.name ?? a.user?.username ?? null,
    quantity: a.quantity.toString(),
  }))
  const assetsById = new Map(assetOptions.map((a) => [a.id, a]))

  const payments = await prisma.dividendPayment.findMany({
    where: { householdId, year },
    orderBy: [{ exDate: "desc" }],
  })

  const events = payments
    .map((p) => {
      const asset = assetsById.get(p.assetId)
      return asset ? buildManualDividendEvent(p, asset) : null
    })
    .filter((e): e is NonNullable<typeof e> => e != null)

  const kpis = calculateDividendKpis(events)
  const upcoming = events
    .filter((e) => e.status === "EXPECTED")
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3)
    .map((e) => ({
      id: e.id,
      name: e.name,
      ticker: e.ticker,
      date: e.date,
      amount: e.amount,
    }))

  return { kpis, upcoming, month }
}

async function buildChecklistSection(householdId: string, year: number, month: number) {
  const [members, rows] = await Promise.all([
    prisma.householdMember.findMany({
      where: { householdId },
      include: { user: { select: { id: true, name: true, username: true } } },
    }),
    prisma.householdMonthChecklist.findMany({ where: { householdId, year, month } }),
  ])

  const byUser = new Map<string, string[]>()
  for (const row of rows) {
    if (!byUser.has(row.userId)) byUser.set(row.userId, [])
    byUser.get(row.userId)!.push(row.step)
  }

  return {
    members: members.map((m) => ({
      userId: m.userId,
      name: m.user.name ?? m.user.username ?? m.userId,
      completedSteps: byUser.get(m.userId) ?? [],
    })),
  }
}

export async function recordTodayVisit(userId: string) {
  // Stored client-side in localStorage for "since last visit" delta; server timestamp optional
  return { visitedAt: startOfUtcDay().toISOString() }
}
