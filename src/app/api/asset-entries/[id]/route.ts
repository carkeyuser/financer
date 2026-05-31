import { NextResponse } from "next/server"
import { requireHouseholdAdmin } from "@/lib/household-auth"
import { prisma } from "@/lib/prisma"
import { assetEntryUpdateSchema } from "@/lib/validations/asset"

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireHouseholdAdmin()
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status })
  }
  const { id } = await params
  const householdId = admin.householdId

  const body = await req.json()
  const parsed = assetEntryUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }
  const data = parsed.data

  const entry = await prisma.assetEntry.findFirst({
    where: { id },
    include: { asset: { select: { householdId: true, quantity: true } } },
  })

  if (!entry || entry.asset.householdId !== householdId) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 })
  }

  const isQuantityUpdate = entry.type === "QUANTITY_UPDATE" || data.type === "QUANTITY_UPDATE"
      || entry.type === "VWAP_UPDATE" || data.type === "VWAP_UPDATE"

  let netDelta = 0
  if (!isQuantityUpdate) {
    const oldQty = entry.quantity ? parseFloat(entry.quantity.toString()) : 0
    const oldEffect = entry.type === "PURCHASE" ? oldQty : entry.type === "SALE" ? -oldQty : 0
    const newQty = data.quantity ?? 0
    const newEffect = data.type === "PURCHASE" ? newQty : data.type === "SALE" ? -newQty : 0
    netDelta = newEffect - oldEffect

    const currentQty = parseFloat(entry.asset.quantity.toString())
    if (currentQty + netDelta < 0) {
      return NextResponse.json({ error: "Menge würde negativ werden" }, { status: 422 })
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.assetEntry.update({
      where: { id },
      data: {
        type: data.type,
        price: data.price ?? parseFloat(entry.price.toString()),
        quantity: (data.type === "PRICE_UPDATE") ? null : (data.quantity ?? entry.quantity),
        date: data.date ? new Date(data.date) : entry.date,
        note: data.note ?? null,
      },
    })
    if (data.type === "QUANTITY_UPDATE" && data.quantity != null) {
      await tx.asset.update({ where: { id: entry.assetId }, data: { quantity: data.quantity.toString() } })
    } else if (netDelta !== 0) {
      await tx.asset.update({ where: { id: entry.assetId }, data: { quantity: { increment: netDelta } } })
    }
    return result
  })

  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireHouseholdAdmin()
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status })
  }
  const { id } = await params
  const householdId = admin.householdId

  const entry = await prisma.assetEntry.findFirst({
    where: { id },
    include: { asset: { select: { householdId: true, quantity: true } } },
  })

  if (!entry || entry.asset.householdId !== householdId) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 })
  }

  await prisma.$transaction(async (tx) => {
    await tx.assetEntry.delete({ where: { id } })

    if (entry.type === "PURCHASE" && entry.quantity) {
      await tx.asset.update({
        where: { id: entry.assetId },
        data: { quantity: { decrement: parseFloat(entry.quantity.toString()) } },
      })
    } else if (entry.type === "SALE" && entry.quantity) {
      await tx.asset.update({
        where: { id: entry.assetId },
        data: { quantity: { increment: parseFloat(entry.quantity.toString()) } },
      })
    }
    // QUANTITY_UPDATE: kein Rollback möglich (absoluter Wert) – Menge bleibt unverändert
  })

  return new NextResponse(null, { status: 204 })
}
