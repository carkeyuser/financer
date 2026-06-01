import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calculateHouseholdFinance, monthKey } from "@/lib/utils/household-finance"
import { updateSimulationSchema } from "@/lib/validations/household-finance-simulation"
import { sessionLocale } from "@/lib/session-locale"
import {
  buildSimulationBaseline,
  getHouseholdFinanceMembers,
  simulationMonthEntries,
} from "@/lib/services/household-finance-simulation"

async function getSimulationDetail(id: string, householdId: string) {
  const [simulation, members] = await Promise.all([
    prisma.householdFinanceSimulation.findFirst({
      where: { id, householdId },
      include: {
        months: {
          include: { entries: true },
          orderBy: [{ year: "asc" }, { month: "asc" }],
        },
      },
    }),
    getHouseholdFinanceMembers(householdId),
  ])

  if (!simulation) return null

  const summary = calculateHouseholdFinance({
    members,
    months: simulation.months.map((month) => ({
      year: month.year,
      month: month.month,
      fixedCosts: Number(month.fixedCosts),
      incomes: month.entries
        .filter((entry) => entry.type === "INCOME")
        .map((entry) => ({ userId: entry.userId, amount: Number(entry.amount) })),
      payouts: month.entries
        .filter((entry) => entry.type === "PAYOUT")
        .map((entry) => ({ userId: entry.userId, amount: Number(entry.amount) })),
    })),
  })

  return {
    id: simulation.id,
    name: simulation.name,
    startYear: simulation.startYear,
    startMonth: simulation.startMonth,
    endYear: simulation.endYear,
    endMonth: simulation.endMonth,
    createdAt: simulation.createdAt,
    updatedAt: simulation.updatedAt,
    members,
    ...summary,
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.householdId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const detail = await getSimulationDetail(id, session.user.householdId)
  if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json(detail)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.householdId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const parsed = updateSimulationSchema(sessionLocale(session)).safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const householdId = session.user.householdId
  const existing = await prisma.householdFinanceSimulation.findFirst({
    where: { id, householdId },
    include: { months: true },
  })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const data = parsed.data
  const baseline = await buildSimulationBaseline({ householdId, ...data })
  const rangeKeys = new Set(baseline.map((month) => monthKey(month.year, month.month)))
  const existingKeys = new Set(existing.months.map((month) => monthKey(month.year, month.month)))

  await prisma.$transaction(async (tx) => {
    await tx.householdFinanceSimulation.update({
      where: { id },
      data: {
        name: data.name,
        startYear: data.startYear,
        startMonth: data.startMonth,
        endYear: data.endYear,
        endMonth: data.endMonth,
      },
    })

    await tx.householdFinanceSimulationMonth.deleteMany({
      where: {
        simulationId: id,
        NOT: {
          OR: baseline.map((month) => ({ year: month.year, month: month.month })),
        },
      },
    })

    for (const month of baseline) {
      const key = monthKey(month.year, month.month)
      if (!rangeKeys.has(key) || existingKeys.has(key)) continue
      await tx.householdFinanceSimulationMonth.create({
        data: {
          simulationId: id,
          year: month.year,
          month: month.month,
          fixedCosts: month.fixedCosts,
          entries: { create: simulationMonthEntries(month) },
        },
      })
    }
  })

  const detail = await getSimulationDetail(id, householdId)
  return NextResponse.json(detail)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.householdId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const existing = await prisma.householdFinanceSimulation.findFirst({
    where: { id, householdId: session.user.householdId },
  })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.householdFinanceSimulation.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
