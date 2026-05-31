import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const layoutItemSchema = z.object({
  widgetId: z.string().min(1),
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  w: z.number().int().min(1),
  h: z.number().int().min(1),
})

const saveSchema = z.array(layoutItemSchema)

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const userId = session.user.id

  const widgets = await prisma.dashboardWidget.findMany({ where: { userId } })
  return NextResponse.json(widgets)
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const userId = session.user.id

  const body = await req.json()
  const parsed = saveSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  await prisma.$transaction(
    parsed.data.map((item) =>
      prisma.dashboardWidget.upsert({
        where: { userId_widgetId: { userId, widgetId: item.widgetId } },
        update: { x: item.x, y: item.y, w: item.w, h: item.h },
        create: { userId, widgetId: item.widgetId, x: item.x, y: item.y, w: item.w, h: item.h },
      })
    )
  )

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const userId = session.user.id

  const { widgetId } = await req.json()
  if (!widgetId) return NextResponse.json({ error: "widgetId required" }, { status: 400 })

  await prisma.dashboardWidget.deleteMany({ where: { userId, widgetId } })
  return NextResponse.json({ ok: true })
}
