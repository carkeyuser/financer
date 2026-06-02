import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSession, requireHouseholdAdmin } from "@/lib/household-auth"
import { BACKUP_RESTORE_MAX_BYTES, backupSchema, type BackupInput } from "@/lib/validations/backup"

// ── Export ────────────────────────────────────────────────────────────────────

export async function GET() {
  const ctx = await requireSession()
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  }
  const { householdId, userId } = ctx

  const [
    household,
    members,
    fixedCosts,
    monthlyIncomes,
    monthlyPayouts,
    fixedCostSnapshots,
    assets,
    simulations,
    personalIncomeMonths,
    personalIncomeBonuses,
  ] = await Promise.all([
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
      prisma.personalIncomeMonth.findMany({
        where: { householdId, userId },
        orderBy: [{ year: "asc" }, { month: "asc" }],
      }),
      prisma.personalIncomeBonus.findMany({
        where: { householdId, userId },
        orderBy: { date: "asc" },
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
        importRef: e.importRef,
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
        importRef: d.importRef,
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
    personalIncomeMonths: personalIncomeMonths.map((m) => ({
      year: m.year,
      month: m.month,
      grossSalary: m.grossSalary?.toString() ?? null,
      netSalary: m.netSalary?.toString() ?? null,
      monthBonus: m.monthBonus?.toString() ?? null,
      note: m.note,
      syncedToHouseholdAt: m.syncedToHouseholdAt?.toISOString() ?? null,
    })),
    personalIncomeBonuses: personalIncomeBonuses.map((b) => ({
      date: b.date.toISOString().slice(0, 10),
      amount: b.amount.toString(),
      label: b.label,
      note: b.note,
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

  const contentLength = request.headers.get("content-length")
  if (contentLength) {
    const bytes = Number.parseInt(contentLength, 10)
    if (!Number.isNaN(bytes) && bytes > BACKUP_RESTORE_MAX_BYTES) {
      return NextResponse.json(
        { error: `Backup zu groß (max. ${BACKUP_RESTORE_MAX_BYTES / (1024 * 1024)} MB)` },
        { status: 413 }
      )
    }
  }

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

  const referencedUsernames = collectBackupUsernames(backup)
  const unknownUsernames = [...new Set(referencedUsernames)].filter((u) => !usernameToId.has(u))
  if (unknownUsernames.length > 0) {
    return NextResponse.json(
      {
        error: "Unbekannte Benutzernamen im Backup (kein Haushaltsmitglied)",
        usernames: unknownUsernames,
      },
      { status: 400 }
    )
  }

  function resolveUser(username?: string | null): string {
    if (!username) return userId
    return usernameToId.get(username)!
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
    await tx.personalIncomeBonus.deleteMany({ where: { householdId, userId } })
    await tx.personalIncomeMonth.deleteMany({ where: { householdId, userId } })

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
            importRef: e.importRef ?? null,
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
            importRef: d.importRef ?? null,
          })),
        })
      }
    }

    if (backup.personalIncomeMonths.length > 0) {
      await tx.personalIncomeMonth.createMany({
        data: backup.personalIncomeMonths.map((m) => ({
          householdId,
          userId,
          year: m.year,
          month: m.month,
          grossSalary: m.grossSalary ?? null,
          netSalary: m.netSalary ?? null,
          monthBonus: m.monthBonus ?? null,
          note: m.note ?? null,
          syncedToHouseholdAt: m.syncedToHouseholdAt ? new Date(m.syncedToHouseholdAt) : null,
        })),
        skipDuplicates: true,
      })
    }

    if (backup.personalIncomeBonuses.length > 0) {
      await tx.personalIncomeBonus.createMany({
        data: backup.personalIncomeBonuses.map((b) => ({
          householdId,
          userId,
          date: new Date(b.date),
          amount: b.amount,
          label: b.label,
          note: b.note ?? null,
        })),
      })
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

function collectBackupUsernames(backup: BackupInput): string[] {
  const names: string[] = []
  for (const mi of backup.monthlyIncomes) names.push(mi.username)
  for (const mp of backup.monthlyPayouts) names.push(mp.username)
  for (const a of backup.assets) {
    names.push(a.username)
    for (const d of a.dividends ?? []) names.push(d.username)
  }
  for (const s of backup.simulations) {
    if (s.createdByUsername) names.push(s.createdByUsername)
    for (const m of s.months) {
      for (const e of m.entries) names.push(e.username)
    }
  }
  return names
}
