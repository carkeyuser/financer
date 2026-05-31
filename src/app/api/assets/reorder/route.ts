import { NextResponse } from "next/server"
import { requireSession } from "@/lib/household-auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const reorderSchema = z.object({
  orderedIds: z.array(z.string()),
})

export async function POST(request: Request) {
  const base = await requireSession()
  if ("error" in base) return NextResponse.json({ error: base.error }, { status: base.status })
  const { householdId } = base

  const body = await request.json()
  const parsed = reorderSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Reihenfolge" }, { status: 400 })
  }

  await prisma.$transaction(
    parsed.data.orderedIds.map((id, index) =>
      prisma.asset.updateMany({
        where: { id, householdId },
        data: { order: index },
      })
    )
  )

  return new NextResponse(null, { status: 204 })
}
