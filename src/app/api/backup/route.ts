import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSession, requireHouseholdAdmin } from "@/lib/household-auth"
import { backupSchema } from "@/lib/validations/backup"

// ── Export ────────────────────────────────────────────────────────────────────

export async function GET() {
  const ctx = await requireSession()
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  }
  const { householdId } = ctx

  const [household, members, fixedCosts, monthlyIncomes, monthlyPayouts, fixedCostSnapshots, assets, simulations] =
    await Promise.all([
      prisma.household.findUnique({ where: { id: householdId } }),
      prisma.householdMember.findMany({
        where: { householdId },
        include: { user: { select: { username: true, name: true } } },
      }),
      prisma.fixedCost.findMany({ where: { householdId }, orderBy: { order: "asc" } }),
      prisma.monthlyIncome.findMany({
        where: { householdId },
        include: { user: { select: { username: true } } },
      }),
      prisma.monthlyPayout.findMany({
        where: { householdId },
        include: { user: { select: { username: true } } },
      }),
      prisma.monthlyFixedCostSnapshot.findMany({ where: { householdId } }),
      prisma.asset.findMany({
        where: { householdId },
        include: {
          user: { select: { username: true } },
          entries: { orderBy: { date: "asc" } },
          dividends: {
            include: { user: { select: { username: true } } },
            orderBy: [{ year: "asc" }, { exDate: "asc" }],
          },
        },
        orderBy: { order: "asc" },
      }),
      prisma.householdFinanceSimulation.findMany({
        where: { householdId },
        include: {
          createdBy: { select: { username: true } },
          months: {
            include: {
              entries: {
                include: { user: { select: { username: true } } },
                orderBy: { type: "asc" },
              },
            },
            orderBy: [{ year: "asc" }, { month: "asc" }],
          },
        },
        orderBy: { updatedAt: "asc" },
      }),
    ])

  const backup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    household: {
      name: household!.name,
      currency: household!.currency,
    },
    members: members.map((m) => ({
      username: m.user.username,
      name: m.user.name,
      role: m.role,
    })),
    fixedCosts: fixedCosts.map((fc) => ({
      name: fc.name,
      amount: fc.amount.toString(),
      order: fc.order,
    })),
    monthlyIncomes: monthlyIncomes.map((mi) => ({
      username: mi.user.username,
      year: mi.year,
      month: mi.month,
      amount: mi.amount.toString(),
    })),
    monthlyPayouts: monthlyPayouts.map((mp) => ({
      username: mp.user.username,
      year: mp.year,
      month: mp.month,
      amount: mp.amount.toString(),
    })),
    fixedCostSnapshots: fixedCostSnapshots.map((s) => ({
      year: s.year,
      month: s.month,
      fixedCosts: s.fixedCosts.toString(),
    })),
    assets: assets.map((a) => ({
      username: a.user.username,
      ticker: a.ticker,
      name: a.name,
      type: a.type,
      currency: a.currency,
      isin: a.isin,
      wkn: a.wkn,
      notes: a.notes,
      account: a.account,
      quantity: a.quantity.toString(),
      order: a.order,
      entries: a.entries.map((e) => ({
        type: e.type,
        price: e.price.toString(),
        quantity: e.quantity?.toString() ?? null,
        date: e.date.toISOString(),
        note: e.note,
      })),
      dividends: a.dividends.map((d) => ({
        username: d.user.username,
        year: d.year,
        exDate: d.exDate.toISOString(),
        payDate: d.payDate?.toISOString() ?? null,
        amountPerShare: d.amountPerShare.toString(),
        quantity: d.quantity.toString(),
        grossAmount: d.grossAmount.toString(),
        taxAmount: d.taxAmount.toString(),
        netAmount: d.netAmount.toString(),
        currency: d.currency,
        eurRate: d.eurRate.toString(),
        status: d.status,
        source: d.source,
        note: d.note,
      })),
    })),
    simulations: simulations.map((s) => ({
      createdByUsername: s.createdBy?.username ?? null,
      name: s.name,
      startYear: s.startYear,
      startMonth: s.startMonth,
      endYear: s.endYear,
      endMonth: s.endMonth,
      months: s.months.map((m) => ({
        year: m.year,
        month: m.month,
        fixedCosts: m.fixedCosts.toString(),
        entries: m.entries.map((e) => ({
          username: e.user.username,
          type: e.type,
          amount: e.amount.toString(),
        })),
      })),
    })),
  }

  return NextResponse.json(backup)
}

// ── Restore ───────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const ctx = await requireHouseholdAdmin()
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  }
  const { householdId, userId } = ctx

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Ungültiges JSON" }, { status: 400 })
  }

  const parsed = backupSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ungültiges Backup-Format", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const backup = parsed.data

  // Build username → userId map from current household members
  const currentMembers = await prisma.householdMember.findMany({
    where: { householdId },
    include: { user: { select: { id: true, username: true } } },
  })
  const usernameToId = new Map(currentMembers.map((m) => [m.user.username, m.user.id]))

  function resolveUser(username?: string | null): string {
    if (!username) return userId
    return usernameToId.get(username) ?? userId
  }

  await prisma.$transaction(async (tx) => {
    // Delete all household-scoped data before importing the replacement set.
    await tx.dividendPayment.deleteMany({ where: { householdId } })
    await tx.householdFinanceSimulation.deleteMany({ where: { householdId } })
    await tx.fixedCost.deleteMany({ where: { householdId } })
    await tx.monthlyIncome.deleteMany({ where: { householdId } })
    await tx.monthlyPayout.deleteMany({ where: { householdId } })
    await tx.monthlyFixedCostSnapshot.deleteMany({ where: { householdId } })
    await tx.asset.deleteMany({ where: { householdId } })

    if (backup.fixedCosts.length > 0) {
      await tx.fixedCost.createMany({
        data: backup.fixedCosts.map((fc) => ({
          householdId,
          name: fc.name,
          amount: fc.amount,
          order: fc.order,
        })),
      })
    }

    if (backup.monthlyIncomes.length > 0) {
      await tx.monthlyIncome.createMany({
        data: backup.monthlyIncomes.map((mi) => ({
          householdId,
          userId: resolveUser(mi.username),
          year: mi.year,
          month: mi.month,
          amount: mi.amount,
        })),
        skipDuplicates: true,
      })
    }

    if (backup.monthlyPayouts.length > 0) {
      await tx.monthlyPayout.createMany({
        data: backup.monthlyPayouts.map((mp) => ({
          householdId,
          userId: resolveUser(mp.username),
          year: mp.year,
          month: mp.month,
          amount: mp.amount,
        })),
        skipDuplicates: true,
      })
    }

    if (backup.fixedCostSnapshots.length > 0) {
      await tx.monthlyFixedCostSnapshot.createMany({
        data: backup.fixedCostSnapshots.map((s) => ({
          householdId,
          year: s.year,
          month: s.month,
          fixedCosts: s.fixedCosts,
        })),
        skipDuplicates: true,
      })
    }

    for (const a of backup.assets) {
      const asset = await tx.asset.create({
        data: {
          householdId,
          userId: resolveUser(a.username),
          ticker: a.ticker,
          name: a.name,
          type: a.type,
          currency: a.currency,
          isin: a.isin ?? null,
          wkn: a.wkn ?? null,
          notes: a.notes ?? null,
          account: a.account ?? "",
          quantity: a.quantity,
          order: a.order,
        },
      })

      if (a.entries.length > 0) {
        await tx.assetEntry.createMany({
          data: a.entries.map((e) => ({
            assetId: asset.id,
            type: e.type,
            price: e.price,
            quantity: e.quantity ?? null,
            date: new Date(e.date),
            note: e.note ?? null,
          })),
        })
      }

      if (a.dividends.length > 0) {
        await tx.dividendPayment.createMany({
          data: a.dividends.map((d) => ({
            householdId,
            assetId: asset.id,
            userId: resolveUser(d.username),
            year: d.year,
            exDate: new Date(d.exDate),
            payDate: d.payDate ? new Date(d.payDate) : null,
            amountPerShare: d.amountPerShare,
            quantity: d.quantity,
            grossAmount: d.grossAmount,
            taxAmount: d.taxAmount,
            netAmount: d.netAmount,
            currency: d.currency,
            eurRate: d.eurRate,
            status: d.status,
            source: d.source,
            note: d.note ?? null,
          })),
        })
      }
    }

    for (const s of backup.simulations) {
      const simulation = await tx.householdFinanceSimulation.create({
        data: {
          householdId,
          createdById: resolveUser(s.createdByUsername),
          name: s.name,
          startYear: s.startYear,
          startMonth: s.startMonth,
          endYear: s.endYear,
          endMonth: s.endMonth,
        },
      })

      for (const m of s.months) {
        const month = await tx.householdFinanceSimulationMonth.create({
          data: {
            simulationId: simulation.id,
            year: m.year,
            month: m.month,
            fixedCosts: m.fixedCosts,
          },
        })

        if (m.entries.length > 0) {
          await tx.householdFinanceSimulationEntry.createMany({
            data: m.entries.map((e) => ({
              simulationMonthId: month.id,
              userId: resolveUser(e.username),
              type: e.type,
              amount: e.amount,
            })),
          })
        }
      }
    }
  })

  return NextResponse.json({ success: true })
}
