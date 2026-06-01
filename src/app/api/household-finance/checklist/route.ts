import { NextRequest, NextResponse } from "next/server"
import { HouseholdChecklistStep } from "@/generated/prisma"
import { requireSession } from "@/lib/household-auth"
import { prisma } from "@/lib/prisma"

const STEPS = new Set<string>(Object.values(HouseholdChecklistStep))

export async function GET(req: NextRequest) {
  const ctx = await requireSession()
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const now = new Date()
  const year = parseInt(req.nextUrl.searchParams.get("year") ?? String(now.getFullYear()), 10)
  const month = parseInt(req.nextUrl.searchParams.get("month") ?? String(now.getMonth() + 1), 10)

  const [members, rows] = await Promise.all([
    prisma.householdMember.findMany({
      where: { householdId: ctx.householdId },
      include: { user: { select: { id: true, name: true, username: true } } },
    }),
    prisma.householdMonthChecklist.findMany({
      where: { householdId: ctx.householdId, year, month },
    }),
  ])

  const byUser = new Map<string, { step: string; completedAt: string }[]>()
  for (const row of rows) {
    if (!byUser.has(row.userId)) byUser.set(row.userId, [])
    byUser.get(row.userId)!.push({
      step: row.step,
      completedAt: row.completedAt.toISOString(),
    })
  }

  return NextResponse.json({
    year,
    month,
    members: members.map((m) => ({
      userId: m.userId,
      name: m.user.name ?? m.user.username ?? m.userId,
      steps: byUser.get(m.userId) ?? [],
    })),
  })
}

export async function PUT(req: NextRequest) {
  const ctx = await requireSession()
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const body = (await req.json()) as {
    year?: number
    month?: number
    step?: string
    completed?: boolean
  }

  const now = new Date()
  const year = body.year ?? now.getFullYear()
  const month = body.month ?? now.getMonth() + 1
  const step = body.step
  const completed = body.completed ?? true

  if (!step || !STEPS.has(step)) {
    return NextResponse.json({ error: "Ungültiger Schritt" }, { status: 400 })
  }

  const unique = {
    householdId_year_month_userId_step: {
      householdId: ctx.householdId,
      year,
      month,
      userId: ctx.userId,
      step: step as HouseholdChecklistStep,
    },
  }

  if (completed) {
    await prisma.householdMonthChecklist.upsert({
      where: unique,
      create: {
        householdId: ctx.householdId,
        year,
        month,
        userId: ctx.userId,
        step: step as HouseholdChecklistStep,
      },
      update: { completedAt: new Date() },
    })
  } else {
    await prisma.householdMonthChecklist.deleteMany({
      where: {
        householdId: ctx.householdId,
        year,
        month,
        userId: ctx.userId,
        step: step as HouseholdChecklistStep,
      },
    })
  }

  return NextResponse.json({ ok: true })
}
