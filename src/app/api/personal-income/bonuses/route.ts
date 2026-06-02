import { NextRequest, NextResponse } from "next/server"
import { requireSession } from "@/lib/household-auth"
import {
  createPersonalIncomeBonus,
  listPersonalIncomeBonusesForMonth,
} from "@/lib/services/personal-income"
import { personalIncomeBonusCreateSchema } from "@/lib/validations/personal-income"

export async function GET(req: NextRequest) {
  const ctx = await requireSession()
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  }

  const year = parseInt(req.nextUrl.searchParams.get("year") ?? "", 10)
  const month = parseInt(req.nextUrl.searchParams.get("month") ?? "", 10)
  if (Number.isNaN(year) || Number.isNaN(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: "year und month erforderlich" }, { status: 400 })
  }

  const items = await listPersonalIncomeBonusesForMonth(ctx.householdId, ctx.userId, year, month)
  return NextResponse.json({ items })
}

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

  const parsed = personalIncomeBonusCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const item = await createPersonalIncomeBonus(ctx.householdId, ctx.userId, parsed.data)
    return NextResponse.json(item, { status: 201 })
  } catch (e) {
    if (e instanceof Error && e.message === "INVALID_DATE") {
      return NextResponse.json({ error: "INVALID_DATE" }, { status: 400 })
    }
    throw e
  }
}
