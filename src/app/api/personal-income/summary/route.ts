import { NextRequest, NextResponse } from "next/server"
import { requireSession } from "@/lib/household-auth"
import { loadPersonalIncomeYearSummary } from "@/lib/services/personal-income"
import { personalIncomeSummaryQuerySchema } from "@/lib/validations/personal-income"

export async function GET(req: NextRequest) {
  const ctx = await requireSession()
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  }

  const raw = {
    year: parseInt(req.nextUrl.searchParams.get("year") ?? String(new Date().getFullYear()), 10),
  }
  const parsed = personalIncomeSummaryQuerySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const summary = await loadPersonalIncomeYearSummary(
    ctx.householdId,
    ctx.userId,
    parsed.data.year
  )
  return NextResponse.json(summary)
}
