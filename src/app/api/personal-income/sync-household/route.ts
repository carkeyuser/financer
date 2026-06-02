import { NextRequest, NextResponse } from "next/server"
import { requireSession } from "@/lib/household-auth"
import { syncPersonalIncomeToHousehold, loadPersonalIncomeYearSummary } from "@/lib/services/personal-income"
import { personalIncomeSyncHouseholdSchema } from "@/lib/validations/personal-income"

export async function POST(req: NextRequest) {
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

  const parsed = personalIncomeSyncHouseholdSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { year, month } = parsed.data

  try {
    const result = await syncPersonalIncomeToHousehold(ctx.householdId, ctx.userId, year, month)
    const summary = await loadPersonalIncomeYearSummary(ctx.householdId, ctx.userId, year)
    const monthRow = summary.months.find((m) => m.month === month)
    return NextResponse.json({ ...result, month: monthRow })
  } catch (e) {
    if (e instanceof Error && e.message === "NO_NET_SALARY") {
      return NextResponse.json({ error: "NO_NET_SALARY" }, { status: 400 })
    }
    throw e
  }
}
