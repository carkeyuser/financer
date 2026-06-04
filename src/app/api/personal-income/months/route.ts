import { NextRequest, NextResponse } from "next/server"
import { requireSession } from "@/lib/household-auth"
import { upsertPersonalIncomeMonth, loadPersonalIncomeYearSummary } from "@/lib/services/personal-income"
import { createPersonalIncomeMonthUpsertSchema } from "@/lib/validations/personal-income"
import { sessionLocale } from "@/lib/session-locale"

export async function PUT(req: NextRequest) {
  const ctx = await requireSession()
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Ungültiges JSON" }, { status: 400 })
  }

  const parsed = createPersonalIncomeMonthUpsertSchema(sessionLocale(ctx.session)).safeParse(
    body
  )
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { year, month, grossSalary, netSalary, monthBonus, note } = parsed.data

  await upsertPersonalIncomeMonth(ctx.householdId, ctx.userId, {
    year,
    month,
    grossSalary: grossSalary === undefined ? undefined : grossSalary,
    netSalary: netSalary === undefined ? undefined : netSalary,
    monthBonus: monthBonus === undefined ? undefined : monthBonus,
    note: note === undefined ? undefined : note,
  })

  const summary = await loadPersonalIncomeYearSummary(ctx.householdId, ctx.userId, year)
  const monthRow = summary.months.find((m) => m.month === month)
  return NextResponse.json(monthRow ?? null)
}
