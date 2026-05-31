import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calculateHouseholdFinance } from "@/lib/utils/household-finance"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.householdId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const householdId = session.user.householdId
  const year = parseInt(req.nextUrl.searchParams.get("year") ?? String(new Date().getFullYear()))

  const [fixedCosts, members, incomes, payouts, snapshots] = await Promise.all([
    prisma.fixedCost.findMany({ where: { householdId }, orderBy: { order: "asc" } }),
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
    const month = i + 1
    const monthIncomes = incomes.filter((inc) => inc.month === month)
    const monthPayouts = payouts.filter((p) => p.month === month)

    // Monate mit gespeicherten Einnahmen verwenden den eingefrorenen Fixkostenwert;
    // leere Monate verwenden die aktuellen Fixkosten.
    const snapshot = snapshots.find((s) => s.month === month)
    const effectiveFixedCosts = snapshot ? Number(snapshot.fixedCosts) : currentFixedCosts

    return {
      year,
      month,
      incomes: monthIncomes.map((inc) => ({ userId: inc.userId, amount: Number(inc.amount) })),
      fixedCosts: effectiveFixedCosts,
      payouts: monthPayouts.map((p) => ({ userId: p.userId, amount: Number(p.amount) })),
    }
  })

  const summary = calculateHouseholdFinance({
    members: members.map((m) => ({ id: m.userId, name: m.user.name, email: m.user.email })),
    months: monthInputs,
  })

  return NextResponse.json({
    year,
    fixedCosts: fixedCosts.map((c) => ({ ...c, amount: Number(c.amount) })),
    members: members.map((m) => ({ id: m.userId, name: m.user.name, email: m.user.email })),
    ...summary,
  })
}
