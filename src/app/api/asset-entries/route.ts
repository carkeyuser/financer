import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createAssetEntrySchema } from "@/lib/validations/asset"
import { sessionLocale } from "@/lib/session-locale"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.householdId) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 })
  }
  const householdId = session.user.householdId

  const body = await request.json()
  const parsed = createAssetEntrySchema(sessionLocale(session)).safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { assetId, type, price, quantity, date, note } = parsed.data

  const asset = await prisma.asset.findFirst({ where: { id: assetId, householdId } })
  if (!asset) return NextResponse.json({ error: "Asset nicht gefunden" }, { status: 404 })

  if ((type === "PURCHASE" || type === "SALE") && !quantity) {
    return NextResponse.json({ error: { quantity: ["Menge ist erforderlich"] } }, { status: 400 })
  }
  if ((type === "PURCHASE" || type === "SALE") && !price) {
    return NextResponse.json({ error: { price: ["Preis ist erforderlich"] } }, { status: 400 })
  }
  if (type === "QUANTITY_UPDATE" && !quantity) {
    return NextResponse.json({ error: { quantity: ["Neue Menge ist erforderlich"] } }, { status: 400 })
  }
  if (type === "VWAP_UPDATE" && !price) {
    return NextResponse.json({ error: { price: ["Neuer Kaufpreis ist erforderlich"] } }, { status: 400 })
  }

  if (type === "SALE" && quantity) {
    const currentQty = parseFloat(asset.quantity.toString())
    if (quantity > currentQty) {
      return NextResponse.json(
        { error: { quantity: [`Nicht genug Anteile (verfügbar: ${currentQty})`] } },
        { status: 400 }
      )
    }
  }

  const entryDate = date ? new Date(date) : new Date()

  const result = await prisma.$transaction(async (tx) => {
    let entry

    if (type === "PRICE_UPDATE") {
      // Tagespräzise Upsert: existierenden PRICE_UPDATE desselben Tages überschreiben
      const dayStart = new Date(entryDate)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(entryDate)
      dayEnd.setHours(23, 59, 59, 999)

      const existing = await tx.assetEntry.findFirst({
        where: { assetId, type: "PRICE_UPDATE", date: { gte: dayStart, lte: dayEnd } },
      })

      if (existing) {
        entry = await tx.assetEntry.update({
          where: { id: existing.id },
          data: { price: price!.toString(), note: note || null },
        })
      } else {
        entry = await tx.assetEntry.create({
          data: { assetId, type, price: price!.toString(), quantity: null, date: entryDate, note: note || null },
        })
      }
    } else if (type === "QUANTITY_UPDATE") {
      // Absolute Mengenkorrektur: Menge direkt auf neuen Wert setzen
      const purchases = await tx.assetEntry.findMany({ where: { assetId, type: "PURCHASE" } })
      const vwap = purchases.length > 0
        ? purchases.reduce((s, e) => s + parseFloat(e.price.toString()) * parseFloat(e.quantity?.toString() ?? "0"), 0) /
          purchases.reduce((s, e) => s + parseFloat(e.quantity?.toString() ?? "0"), 0)
        : 0
      const storedPrice = vwap > 0 ? vwap : 1

      entry = await tx.assetEntry.create({
        data: { assetId, type, price: storedPrice.toString(), quantity: quantity!.toString(), date: entryDate, note: note || null },
      })
      await tx.asset.update({ where: { id: assetId }, data: { quantity: quantity!.toString() } })
    } else if (type === "VWAP_UPDATE") {
      // Kaufpreis-Baseline überschreiben: price = neuer VWAP, quantity = aktuelle Menge als Kontext
      const currentQty = parseFloat(asset.quantity.toString())
      entry = await tx.assetEntry.create({
        data: { assetId, type, price: price!.toString(), quantity: currentQty.toString(), date: entryDate, note: note || null },
      })
      // asset.quantity bleibt unverändert
    } else {
      entry = await tx.assetEntry.create({
        data: {
          assetId,
          type,
          price: price!.toString(),
          quantity: quantity != null ? quantity.toString() : null,
          date: entryDate,
          note: note || null,
        },
      })
    }

    if (type === "PURCHASE" && quantity) {
      await tx.asset.update({ where: { id: assetId }, data: { quantity: { increment: quantity } } })
    } else if (type === "SALE" && quantity) {
      await tx.asset.update({ where: { id: assetId }, data: { quantity: { decrement: quantity } } })
    }

    return entry
  })

  return NextResponse.json(
    { ...result, price: result.price.toString(), quantity: result.quantity?.toString() ?? null },
    { status: 201 }
  )
}
