import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createSimulationSchema } from "@/lib/validations/household-finance-simulation"
import { buildSimulationBaseline, simulationMonthEntries } from "@/lib/services/household-finance-simulation"

export async function GET() {
  const session = await auth()
  if (!session?.user?.householdId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const simulations = await prisma.householdFinanceSimulation.findMany({
    where: { householdId: session.user.householdId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      startYear: true,
      startMonth: true,
      endYear: true,
      endMonth: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return NextResponse.json(simulations)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.householdId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = createSimulationSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const householdId = session.user.householdId
  const data = parsed.data
  const baseline = await buildSimulationBaseline({ householdId, ...data })

  const simulation = await prisma.householdFinanceSimulation.create({
    data: {
      householdId,
      createdById: session.user.id,
      name: data.name,
      startYear: data.startYear,
      startMonth: data.startMonth,
      endYear: data.endYear,
      endMonth: data.endMonth,
      months: {
        create: baseline.map((month) => ({
          year: month.year,
          month: month.month,
          fixedCosts: month.fixedCosts,
          entries: { create: simulationMonthEntries(month) },
        })),
      },
    },
    select: {
      id: true,
      name: true,
      startYear: true,
      startMonth: true,
      endYear: true,
      endMonth: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return NextResponse.json(simulation, { status: 201 })
}
