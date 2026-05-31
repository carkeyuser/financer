import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const schema = z.object({
  userId: z.string(),
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  amount: z.number().nonnegative(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.householdId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const member = await prisma.householdMember.findUnique({
    where: { userId_householdId: { userId: parsed.data.userId, householdId: session.user.householdId } },
  })
  if (!member) return NextResponse.json({ error: "User not in household" }, { status: 403 })

  const householdId = session.user.householdId
  const { userId, year, month, amount } = parsed.data

  const [record] = await prisma.$transaction(async (tx) => {
    const income = await tx.monthlyIncome.upsert({
      where: { householdId_userId_year_month: { householdId, userId, year, month } },
      update: { amount },
      create: { householdId, userId, year, month, amount },
    })

    // Fixkosten-Snapshot: nur beim ersten Eintrag für diesen Monat anlegen, nie überschreiben.
    const existing = await tx.monthlyFixedCostSnapshot.findUnique({
      where: { householdId_year_month: { householdId, year, month } },
    })
    if (!existing) {
      const sum = await tx.fixedCost.aggregate({ _sum: { amount: true }, where: { householdId } })
      await tx.monthlyFixedCostSnapshot.create({
        data: { householdId, year, month, fixedCosts: (sum._sum.amount ?? 0).toString() },
      })
    }

    return [income]
  })

  return NextResponse.json(record, { status: 201 })
}
