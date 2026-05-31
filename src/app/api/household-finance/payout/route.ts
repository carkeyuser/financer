import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const schema = z.object({
  userId: z.string(),
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  amount: z.number().nonnegative(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.householdId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const member = await prisma.householdMember.findUnique({
    where: { userId_householdId: { userId: parsed.data.userId, householdId: session.user.householdId } },
  })
  if (!member) return NextResponse.json({ error: "User not in household" }, { status: 403 })

  const record = await prisma.monthlyPayout.upsert({
    where: {
      householdId_userId_year_month: {
        householdId: session.user.householdId,
        userId: parsed.data.userId,
        year: parsed.data.year,
        month: parsed.data.month,
      },
    },
    update: { amount: parsed.data.amount },
    create: {
      householdId: session.user.householdId,
      userId: parsed.data.userId,
      year: parsed.data.year,
      month: parsed.data.month,
      amount: parsed.data.amount,
    },
  })
  return NextResponse.json(record, { status: 201 })
}
