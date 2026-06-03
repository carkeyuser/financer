import { NextRequest, NextResponse } from "next/server"
import { requireSession } from "@/lib/household-auth"
import { loadPersonalIncomeYearsMatrix } from "@/lib/services/personal-income"
import {
  PERSONAL_INCOME_MAX_YEARS_SPAN,
  personalIncomeYearsListQuerySchema,
  personalIncomeYearsQuerySchema,
} from "@/lib/validations/personal-income"

export async function GET(req: NextRequest) {
  const ctx = await requireSession()
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  }

  const yearsParam = req.nextUrl.searchParams.get("years")
  if (yearsParam) {
    const parsed = personalIncomeYearsListQuerySchema.safeParse({ years: yearsParam })
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const matrix = await loadPersonalIncomeYearsMatrix(
      ctx.householdId,
      ctx.userId,
      parsed.data.years
    )
    return NextResponse.json(matrix)
  }

  const currentYear = new Date().getFullYear()
  const raw = {
    from: req.nextUrl.searchParams.get("from")
      ? parseInt(req.nextUrl.searchParams.get("from")!, 10)
      : undefined,
    to: req.nextUrl.searchParams.get("to")
      ? parseInt(req.nextUrl.searchParams.get("to")!, 10)
      : undefined,
  }

  const parsed = personalIncomeYearsQuerySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const toYear = parsed.data.to ?? currentYear
  const fromYear = parsed.data.from ?? toYear - 4
  const years = Array.from(
    { length: Math.min(toYear - fromYear + 1, PERSONAL_INCOME_MAX_YEARS_SPAN) },
    (_, i) => fromYear + i
  )

  const matrix = await loadPersonalIncomeYearsMatrix(ctx.householdId, ctx.userId, years)
  return NextResponse.json(matrix)
}
