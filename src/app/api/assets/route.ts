import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { excludeInterestTicker, isInterestAsset } from "@/lib/constants/interest-asset"
import { prisma } from "@/lib/prisma"
import { createAssetSchema } from "@/lib/validations/asset"
import { sessionLocale } from "@/lib/session-locale"
import { getEurRate } from "@/lib/utils/currency"

export async function GET() {
  const session = await auth()
  if (!session?.user?.householdId) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 })
  }
  const householdId = session.user.householdId

  const assets = await prisma.asset.findMany({
    where: { householdId, ticker: excludeInterestTicker },
    include: {
      entries: { orderBy: { date: "asc" } },
      user: { select: { id: true, name: true, username: true } },
    },
    orderBy: { order: "asc" },
  })

  const currencies = [...new Set(assets.map((a) => a.currency))]
  let eurRates: Record<string, number>
  try {
    eurRates = Object.fromEntries(
      await Promise.all(currencies.map(async (c) => [c, await getEurRate(c)]))
    )
  } catch {
    return NextResponse.json({ error: "Wechselkurse konnten nicht geladen werden" }, { status: 503 })
  }

  const serialized = assets.map((a) => ({
    ...a,
    quantity: a.quantity.toString(),
    eurRate: eurRates[a.currency],
    ownerName: a.user?.name ?? a.user?.username ?? null,
    user: undefined,
    entries: a.entries.map((e) => ({
      ...e,
      price: e.price.toString(),
      quantity: e.quantity?.toString() ?? null,
    })),
  }))

  return NextResponse.json(serialized)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.householdId || !session?.user?.id) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 })
  }
  const householdId = session.user.householdId
  const userId = session.user.id

  const body = await request.json()
  const parsed = createAssetSchema(sessionLocale(session)).safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { ticker, name, type, currency, account, isin, wkn, purchaseDate, purchasePrice, quantity, note } = parsed.data

  if (isInterestAsset({ ticker })) {
    return NextResponse.json(
      { error: { ticker: ["Interest ist eine reservierte Dividenden-Position"] } },
      { status: 400 }
    )
  }

  // Nachkauf-Logik: prüft auf (householdId, userId, ticker) — zwei User können denselben Ticker halten
  const existing = await prisma.asset.findUnique({
    where: { householdId_userId_ticker: { householdId, userId, ticker } },
  })

  if (existing) {
    const result = await prisma.$transaction(async (tx) => {
      const entry = await tx.assetEntry.create({
        data: {
          assetId: existing.id,
          type: "PURCHASE",
          price: purchasePrice.toString(),
          quantity: quantity.toString(),
          date: purchaseDate ? new Date(purchaseDate) : new Date(),
          note: note || null,
        },
      })
      const updated = await tx.asset.update({
        where: { id: existing.id },
        data: { quantity: { increment: quantity } },
        include: {
          entries: { orderBy: { date: "asc" } },
          user: { select: { id: true, name: true, username: true } },
        },
      })
      return { asset: updated, entry, merged: true }
    })

    return NextResponse.json({
      ...result,
      asset: {
        ...result.asset,
        quantity: result.asset.quantity.toString(),
        ownerName: result.asset.user?.name ?? result.asset.user?.username ?? null,
        user: undefined,
        entries: result.asset.entries.map((e) => ({
          ...e,
          price: e.price.toString(),
          quantity: e.quantity?.toString() ?? null,
        })),
      },
    })
  }

  const result = await prisma.$transaction(async (tx) => {
    const asset = await tx.asset.create({
      data: { householdId, userId, ticker, name, type, currency, account, isin: isin || null, wkn: wkn || null, quantity: quantity.toString() },
    })
    const entry = await tx.assetEntry.create({
      data: {
        assetId: asset.id,
        type: "PURCHASE",
        price: purchasePrice.toString(),
        quantity: quantity.toString(),
        date: purchaseDate ? new Date(purchaseDate) : new Date(),
        note: note || null,
      },
    })
    return { asset, entry, merged: false }
  })

  const assetWithEntries = await prisma.asset.findUnique({
    where: { id: result.asset.id },
    include: {
      entries: { orderBy: { date: "asc" } },
      user: { select: { id: true, name: true, username: true } },
    },
  })

  return NextResponse.json(
    {
      ...result,
      asset: {
        ...assetWithEntries,
        quantity: assetWithEntries!.quantity.toString(),
        ownerName: assetWithEntries!.user?.name ?? assetWithEntries!.user?.username ?? null,
        user: undefined,
        entries: assetWithEntries!.entries.map((e) => ({
          ...e,
          price: e.price.toString(),
          quantity: e.quantity?.toString() ?? null,
        })),
      },
    },
    { status: 201 }
  )
}
