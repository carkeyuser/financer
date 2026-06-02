import { NextRequest, NextResponse } from "next/server"
import { requireSession } from "@/lib/household-auth"
import { loadPersonalIncomeYearsMatrix } from "@/lib/services/personal-income"
import { personalIncomeYearsQuerySchema } from "@/lib/validations/personal-income"

export async function GET(req: NextRequest) {
  const ctx = await requireSession()
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status })
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

  if (fromYear > toYear) {
    return NextResponse.json({ error: "from muss ≤ to sein" }, { status: 400 })
  }

  const matrix = await loadPersonalIncomeYearsMatrix(ctx.householdId, ctx.userId, fromYear, toYear)
  return NextResponse.json(matrix)
}
