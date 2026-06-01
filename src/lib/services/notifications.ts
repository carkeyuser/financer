import type { NotificationType, Prisma } from "@/generated/prisma"
import { excludeInterestTicker } from "@/lib/constants/interest-asset"
import { prisma } from "@/lib/prisma"
import { fetchCalendarEvents } from "@/lib/services/nasdaq-calendar"
import {
  enrichAssetsForDisplay,
  loadHouseholdAssets,
  loadHouseholdPortfolioItems,
  startOfUtcDay,
} from "@/lib/services/portfolio-data"
import { calculateHouseholdFinance } from "@/lib/utils/household-finance"
import { filterCalendarEventsWithinDays } from "@/lib/utils/market-calendar-utils"
import { getEurRate } from "@/lib/utils/currency"
import { addDays, format } from "date-fns"

const PRICE_MOVE_THRESHOLD = 5
const CALENDAR_DAYS = 7
const HOUSEHOLD_EMPTY_FROM_DAY = 5
const QUARTER_BONUS_DAYS = 14
const DIVIDEND_DAYS = 7

type NotificationInput = {
  householdId: string
  userId?: string | null
  type: NotificationType
  titleKey: string
  bodyKey: string
  payload: Prisma.InputJsonValue
  dedupeKey: string
}

async function upsertNotification(input: NotificationInput) {
  return prisma.notification.upsert({
    where: {
      householdId_dedupeKey: {
        householdId: input.householdId,
        dedupeKey: input.dedupeKey,
      },
    },
    create: {
      householdId: input.householdId,
      userId: input.userId ?? null,
      type: input.type,
      titleKey: input.titleKey,
      bodyKey: input.bodyKey,
      payload: input.payload,
      dedupeKey: input.dedupeKey,
    },
    update: {
      titleKey: input.titleKey,
      bodyKey: input.bodyKey,
      payload: input.payload,
    },
  })
}

export async function syncNotificationsForHousehold(householdId: string) {
  const todayKey = format(startOfUtcDay(), "yyyy-MM-dd")
  await Promise.all([
    syncPriceMoveNotifications(householdId, todayKey),
    syncCalendarNotifications(householdId, todayKey),
    syncHouseholdMonthNotifications(householdId, todayKey),
    syncQuarterBonusNotifications(householdId, todayKey),
    syncDividendNotifications(householdId, todayKey),
    syncPartnerPendingNotifications(householdId, todayKey),
  ])
}

async function syncPriceMoveNotifications(householdId: string, todayKey: string) {
  const assets = await loadHouseholdAssets(householdId)
  const currencies = [...new Set(assets.map((a) => a.currency))]
  const eurRates = Object.fromEntries(
    await Promise.all(currencies.map(async (c) => [c, await getEurRate(c)]))
  )
  const enriched = enrichAssetsForDisplay(assets, eurRates)

  for (const asset of enriched) {
    if (Math.abs(asset.gainLossPct) < PRICE_MOVE_THRESHOLD) continue
    await upsertNotification({
      householdId,
      type: "PRICE_MOVE",
      titleKey: "notifications.priceMove.title",
      bodyKey: "notifications.priceMove.body",
      payload: {
        assetId: asset.id,
        ticker: asset.ticker,
        name: asset.name,
        percent: Math.round(asset.gainLossPct * 10) / 10,
        href: `/investments/${asset.id}`,
      },
      dedupeKey: `price:${asset.id}:${todayKey}`,
    })
  }
}

async function syncCalendarNotifications(householdId: string, todayKey: string) {
  const assets = await prisma.asset.findMany({
    where: { householdId, ticker: excludeInterestTicker },
    select: { ticker: true, name: true },
  })
  const events = filterCalendarEventsWithinDays(await fetchCalendarEvents(assets), CALENDAR_DAYS)

  for (const event of events) {
    const eventDate = format(new Date(event.date), "yyyy-MM-dd")
    const daysUntil = Math.ceil(
      (new Date(event.date).setHours(0, 0, 0, 0) - startOfUtcDay().getTime()) / 86_400_000
    )
    await upsertNotification({
      householdId,
      type: "CALENDAR",
      titleKey: "notifications.calendar.title",
      bodyKey:
        event.type === "earnings"
          ? "notifications.calendar.bodyEarnings"
          : "notifications.calendar.bodyDividend",
      payload: {
        ticker: event.ticker,
        name: event.name,
        eventType: event.type,
        date: eventDate,
        daysUntil,
        href: "/dashboard",
      },
      dedupeKey: `cal:${event.ticker}:${event.type}:${eventDate}`,
    })
  }
}

async function syncHouseholdMonthNotifications(householdId: string, todayKey: string) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  if (now.getDate() < HOUSEHOLD_EMPTY_FROM_DAY) return

  const status = await getCurrentMonthStatus(householdId, year, month)
  if (status !== "leer") return

  await upsertNotification({
    householdId,
    type: "HOUSEHOLD_MONTH",
    titleKey: "notifications.householdMonth.title",
    bodyKey: "notifications.householdMonth.body",
    payload: { year, month, href: "/haushaltskasse" },
    dedupeKey: `household:empty:${year}-${month}:${todayKey}`,
  })
}

async function syncQuarterBonusNotifications(householdId: string, todayKey: string) {
  const now = new Date()
  const year = now.getFullYear()
  const summary = await loadHouseholdFinanceSummary(householdId, year)
  const currentQ = Math.ceil(now.getMonth() / 3)
  const quarter = summary.quarters.find((q) => q.year === year && q.q === currentQ)
  if (!quarter || quarter.bonusPerPerson <= 0) return

  const quarterEndMonth = currentQ * 3
  const quarterEnd = new Date(year, quarterEndMonth, 0)
  const daysUntil = Math.ceil((quarterEnd.getTime() - now.getTime()) / 86_400_000)
  if (daysUntil < 0 || daysUntil > QUARTER_BONUS_DAYS) return

  await upsertNotification({
    householdId,
    type: "QUARTER_BONUS",
    titleKey: "notifications.quarterBonus.title",
    bodyKey: "notifications.quarterBonus.body",
    payload: { year, q: currentQ, daysUntil, amount: quarter.bonusPerPerson, href: "/haushaltskasse" },
    dedupeKey: `quarter:${year}-Q${currentQ}:${todayKey}`,
  })
}

async function syncDividendNotifications(householdId: string, todayKey: string) {
  const now = startOfUtcDay()
  const until = addDays(now, DIVIDEND_DAYS)

  const payments = await prisma.dividendPayment.findMany({
    where: {
      householdId,
      status: "EXPECTED",
      OR: [
        { payDate: { gte: now, lte: until } },
        { payDate: null, exDate: { gte: now, lte: until } },
      ],
    },
    include: { asset: { select: { id: true, ticker: true, name: true } } },
  })

  for (const payment of payments) {
    const date = payment.payDate ?? payment.exDate
    const dateKey = format(date, "yyyy-MM-dd")
    await upsertNotification({
      householdId,
      userId: payment.userId,
      type: "DIVIDEND_EXPECTED",
      titleKey: "notifications.dividend.title",
      bodyKey: "notifications.dividend.body",
      payload: {
        paymentId: payment.id,
        ticker: payment.asset.ticker,
        name: payment.asset.name,
        date: dateKey,
        netAmount: Number(payment.netAmount),
        href: "/dividenden",
      },
      dedupeKey: `dividend:${payment.id}:${dateKey}`,
    })
  }
}

async function syncPartnerPendingNotifications(householdId: string, todayKey: string) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const [members, checklist] = await Promise.all([
    prisma.householdMember.findMany({
      where: { householdId },
      include: { user: { select: { id: true, name: true, username: true } } },
    }),
    prisma.householdMonthChecklist.findMany({
      where: { householdId, year, month },
    }),
  ])

  if (members.length < 2) return

  const completedByUser = new Map<string, Set<string>>()
  for (const row of checklist) {
    if (!completedByUser.has(row.userId)) completedByUser.set(row.userId, new Set())
    completedByUser.get(row.userId)!.add(row.step)
  }

  const requiredSteps = ["INCOME", "PAYOUTS", "TRANSFERS_DONE"] as const
  const pending = members.filter((m) => {
    const done = completedByUser.get(m.userId) ?? new Set()
    return !requiredSteps.every((s) => done.has(s))
  })

  if (pending.length === 0) return

  const names = pending
    .map((m) => m.user.name ?? m.user.username ?? m.userId)
    .join(", ")

  await upsertNotification({
    householdId,
    type: "HOUSEHOLD_PARTNER_PENDING",
    titleKey: "notifications.partnerPending.title",
    bodyKey: "notifications.partnerPending.body",
    payload: { year, month, names, href: "/haushaltskasse" },
    dedupeKey: `partner:${year}-${month}:${todayKey}`,
  })
}

async function getCurrentMonthStatus(householdId: string, year: number, month: number) {
  const summary = await loadHouseholdFinanceSummary(householdId, year)
  const m = summary.months.find((x) => x.year === year && x.month === month)
  return m?.status ?? "leer"
}

async function loadHouseholdFinanceSummary(householdId: string, year: number) {
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

  return calculateHouseholdFinance({
    members: members.map((m) => ({ id: m.userId, name: m.user.name, email: m.user.email })),
    months: monthInputs,
  })
}

export async function listNotificationsForUser(householdId: string, userId: string) {
  const notifications = await prisma.notification.findMany({
    where: {
      householdId,
      OR: [{ userId: null }, { userId }],
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { reads: { where: { userId } } },
  })

  const items = notifications.map((n) => ({
    id: n.id,
    type: n.type,
    titleKey: n.titleKey,
    bodyKey: n.bodyKey,
    payload: n.payload,
    createdAt: n.createdAt.toISOString(),
    read: n.reads.length > 0,
  }))

  const unreadCount = items.filter((i) => !i.read).length
  return { items, unreadCount }
}

export async function markNotificationRead(notificationId: string, userId: string, householdId: string) {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, householdId },
  })
  if (!notification) return null

  await prisma.notificationRead.upsert({
    where: { notificationId_userId: { notificationId, userId } },
    create: { notificationId, userId },
    update: { readAt: new Date() },
  })
  return notification
}

export async function markAllNotificationsRead(householdId: string, userId: string) {
  const unread = await prisma.notification.findMany({
    where: {
      householdId,
      OR: [{ userId: null }, { userId }],
      reads: { none: { userId } },
    },
    select: { id: true },
  })

  if (unread.length === 0) return 0

  await prisma.notificationRead.createMany({
    data: unread.map((n) => ({ notificationId: n.id, userId })),
    skipDuplicates: true,
  })
  return unread.length
}
