import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const schema = z.object({
  name: z.string().min(1).max(100),
  amount: z.number().positive(),
  order: z.number().int().optional(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.householdId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const costs = await prisma.fixedCost.findMany({
    where: { householdId: session.user.householdId },
    orderBy: { order: "asc" },
  })
  return NextResponse.json(costs.map((c) => ({ ...c, amount: Number(c.amount) })))
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.householdId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const maxOrder = await prisma.fixedCost.aggregate({
    where: { householdId: session.user.householdId },
    _max: { order: true },
  })

  const cost = await prisma.fixedCost.create({
    data: {
      householdId: session.user.householdId,
      name: parsed.data.name,
      amount: parsed.data.amount,
      order: parsed.data.order ?? (maxOrder._max.order ?? 0) + 1,
    },
  })
  return NextResponse.json({ ...cost, amount: Number(cost.amount) }, { status: 201 })
}
