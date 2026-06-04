import { NextRequest, NextResponse } from "next/server"
import { requireSession } from "@/lib/household-auth"
import {
  listPersonalIncomeAvailableYears,
  trackPersonalIncomeYear,
} from "@/lib/services/personal-income"
import { createPersonalIncomeTrackYearSchema } from "@/lib/validations/personal-income"
import { sessionLocale } from "@/lib/session-locale"

export async function GET() {
  const ctx = await requireSession()
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  }

  const result = await listPersonalIncomeAvailableYears(ctx.householdId, ctx.userId)
  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const ctx = await requireSession()
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  }

  const body = await req.json().catch(() => null)
  const parsed = createPersonalIncomeTrackYearSchema(sessionLocale(ctx.session)).safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const result = await trackPersonalIncomeYear(
      ctx.householdId,
      ctx.userId,
      parsed.data.year
    )
    return NextResponse.json(result)
  } catch (e) {
    if (e instanceof Error && e.message === "YEAR_NOT_PAST") {
      return NextResponse.json({ error: "YEAR_NOT_PAST" }, { status: 400 })
    }
    throw e
  }
}