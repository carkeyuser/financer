import { NextRequest, NextResponse } from "next/server"
import { requireSession } from "@/lib/household-auth"
import { loadPersonalIncomeYearSummary } from "@/lib/services/personal-income"

export async function GET(req: NextRequest) {
  const ctx = await requireSession()
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  }

  const year = parseInt(req.nextUrl.searchParams.get("year") ?? String(new Date().getFullYear()), 10)
  if (Number.isNaN(year)) {
    return NextResponse.json({ error: "Ungültiges Jahr" }, { status: 400 })
  }

  const summary = await loadPersonalIncomeYearSummary(ctx.householdId, ctx.userId, year)
  return NextResponse.json(summary)
}
