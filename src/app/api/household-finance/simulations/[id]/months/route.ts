import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { compareYearMonth } from "@/lib/utils/household-finance"
import { updateSimulationMonthSchema } from "@/lib/validations/household-finance-simulation"
import { sessionLocale } from "@/lib/session-locale"
import { simulationMonthEntries } from "@/lib/services/household-finance-simulation"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.householdId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const parsed = updateSimulationMonthSchema(sessionLocale(session)).safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const householdId = session.user.householdId
  const data = parsed.data
  const simulation = await prisma.householdFinanceSimulation.findFirst({
    where: { id, householdId },
    include: {
      months: {
        include: { entries: true },
        orderBy: [{ year: "asc" }, { month: "asc" }],
      },
    },
  })
  if (!simulation) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const target = { year: data.year, month: data.month }
  const targetMonth = simulation.months.find((month) => month.year === data.year && month.month === data.month)
  if (!targetMonth) return NextResponse.json({ error: "Month outside simulation" }, { status: 400 })

  const requestedUserIds = new Set([
    ...data.incomes.map((entry) => entry.userId),
    ...data.payouts.map((entry) => entry.userId),
  ])
  const memberCount = await prisma.householdMember.count({
    where: { householdId, userId: { in: Array.from(requestedUserIds) } },
  })
  if (memberCount !== requestedUserIds.size) {
    return NextResponse.json({ error: "User not in household" }, { status: 403 })
  }

  await prisma.$transaction(async (tx) => {
    for (const month of simulation.months) {
      const comparison = compareYearMonth({ year: month.year, month: month.month }, target)
      const isTarget = comparison === 0
      const isFuture = comparison > 0

      const updateFixedCosts = isTarget || (isFuture && data.applyToFuture?.fixedCosts)
      const updateIncomes = isTarget || (isFuture && data.applyToFuture?.incomes)
      const updatePayouts = isTarget || (isFuture && data.applyToFuture?.payouts)

      if (!updateFixedCosts && !updateIncomes && !updatePayouts) continue

      if (updateFixedCosts) {
        await tx.householdFinanceSimulationMonth.update({
          where: { id: month.id },
          data: { fixedCosts: data.fixedCosts },
        })
      }

      if (updateIncomes) {
        await tx.householdFinanceSimulationEntry.deleteMany({
          where: { simulationMonthId: month.id, type: "INCOME" },
        })
        const incomes = simulationMonthEntries({ incomes: data.incomes, payouts: [] })
        if (incomes.length > 0) {
          await tx.householdFinanceSimulationEntry.createMany({
            data: incomes.map((entry) => ({ ...entry, simulationMonthId: month.id })),
          })
        }
      }

      if (updatePayouts) {
        await tx.householdFinanceSimulationEntry.deleteMany({
          where: { simulationMonthId: month.id, type: "PAYOUT" },
        })
        const payouts = simulationMonthEntries({ incomes: [], payouts: data.payouts })
        if (payouts.length > 0) {
          await tx.householdFinanceSimulationEntry.createMany({
            data: payouts.map((entry) => ({ ...entry, simulationMonthId: month.id })),
          })
        }
      }
    }

    await tx.householdFinanceSimulation.update({
      where: { id },
      data: { updatedAt: new Date() },
    })
  })

  return NextResponse.json({ ok: true })
}
