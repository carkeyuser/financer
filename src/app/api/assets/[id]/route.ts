import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { excludeInterestTicker, isInterestAsset } from "@/lib/constants/interest-asset"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/household-auth"
import { createAssetEditSchema } from "@/lib/validations/asset"
import { sessionLocale } from "@/lib/session-locale"
import { getEurRate } from "@/lib/utils/currency"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.householdId) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 })
  }
  const { id } = await params
  const householdId = session.user.householdId

  const asset = await prisma.asset.findFirst({
    where: { id, householdId },
    include: {
      entries: { orderBy: { date: "asc" } },
      user: { select: { id: true, name: true, username: true } },
    },
  })

  if (!asset) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 })

  let eurRate: number
  try {
    eurRate = await getEurRate(asset.currency)
  } catch {
    return NextResponse.json({ error: "Wechselkurs konnte nicht geladen werden" }, { status: 503 })
  }

  return NextResponse.json({
    ...asset,
    quantity: asset.quantity.toString(),
    eurRate,
    ownerName: asset.user?.name ?? asset.user?.username ?? null,
    user: undefined,
    entries: asset.entries.map((e) => ({
      ...e,
      price: e.price.toString(),
      quantity: e.quantity?.toString() ?? null,
    })),
  })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.householdId) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 })
  }
  const { id } = await params
  const householdId = session.user.householdId

  const body = await request.json()
  const parsed = createAssetEditSchema(sessionLocale(session)).safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const asset = await prisma.asset.findFirst({ where: { id, householdId } })
  if (!asset) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 })
  if (isInterestAsset(asset)) {
    return NextResponse.json({ error: "Interest-Position kann nicht bearbeitet werden" }, { status: 403 })
  }

  const updated = await prisma.asset.update({
    where: { id },
    data: {
      name: parsed.data.name,
      type: parsed.data.type,
      account: parsed.data.account,
      isin: parsed.data.isin || null,
      wkn: parsed.data.wkn || null,
      notes: parsed.data.notes || null,
    },
    include: { entries: { orderBy: { date: "asc" } } },
  })

  return NextResponse.json({
    ...updated,
    quantity: updated.quantity.toString(),
    entries: updated.entries.map((e) => ({
      ...e,
      price: e.price.toString(),
      quantity: e.quantity?.toString() ?? null,
    })),
  })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireSession()
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  const { id } = await params
  const { householdId } = ctx

  const asset = await prisma.asset.findFirst({ where: { id, householdId } })
  if (!asset) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 })
  if (isInterestAsset(asset)) {
    return NextResponse.json({ error: "Interest-Position kann nicht gelöscht werden" }, { status: 403 })
  }

  await prisma.asset.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
