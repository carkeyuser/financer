import type { Prisma } from "@/generated/prisma"
import { isInterestAsset } from "@/lib/constants/interest-asset"
import { recalculateQuantityFromEntries } from "@/lib/utils/asset-quantity"

export interface MergeAssetsInput {
  householdId: string
  targetAssetId: string
  sourceAssetIds: string[]
}

export class MergeAssetsError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
    this.name = "MergeAssetsError"
  }
}

type Tx = Prisma.TransactionClient

export async function mergeAssets(tx: Tx, input: MergeAssetsInput): Promise<{ targetAssetId: string }> {
  const { householdId, targetAssetId, sourceAssetIds } = input

  if (sourceAssetIds.includes(targetAssetId)) {
    throw new MergeAssetsError("Ziel-Position darf nicht gleichzeitig Quelle sein", 400)
  }

  const uniqueSources = [...new Set(sourceAssetIds)]
  if (uniqueSources.length === 0) {
    throw new MergeAssetsError("Mindestens eine Quell-Position erforderlich", 400)
  }
  if (uniqueSources.length > 10) {
    throw new MergeAssetsError("Maximal 10 Quell-Positionen pro Vorgang", 400)
  }

  const allIds = [targetAssetId, ...uniqueSources]
  const assets = await tx.asset.findMany({
    where: { id: { in: allIds }, householdId },
    include: { entries: { select: { id: true } } },
  })

  if (assets.length !== allIds.length) {
    throw new MergeAssetsError("Eine oder mehrere Positionen wurden nicht gefunden", 404)
  }

  const target = assets.find((a) => a.id === targetAssetId)!
  const sources = assets.filter((a) => a.id !== targetAssetId)

  if (isInterestAsset(target) || sources.some((a) => isInterestAsset(a))) {
    throw new MergeAssetsError("Interest-Position kann nicht zusammengeführt werden", 403)
  }

  const userIds = new Set(assets.map((a) => a.userId))
  if (userIds.size > 1) {
    throw new MergeAssetsError("Positionen müssen demselben Besitzer gehören", 422)
  }

  for (const sourceId of uniqueSources) {
    await tx.assetEntry.updateMany({
      where: { assetId: sourceId },
      data: { assetId: targetAssetId },
    })
    await tx.dividendPayment.updateMany({
      where: { assetId: sourceId },
      data: { assetId: targetAssetId },
    })
  }

  const allEntries = await tx.assetEntry.findMany({
    where: { assetId: targetAssetId },
    select: { type: true, quantity: true, date: true },
  })

  const newQty = recalculateQuantityFromEntries(
    allEntries.map((e) => ({
      type: e.type,
      quantity: e.quantity?.toString() ?? null,
      date: e.date,
    }))
  )
  if (newQty < -1e-6) {
    throw new MergeAssetsError("Menge würde nach Zusammenführung negativ — Buchungen prüfen", 422)
  }

  const mergedIsin = target.isin ?? sources.find((s) => s.isin)?.isin ?? null
  const mergedWkn = target.wkn ?? sources.find((s) => s.wkn)?.wkn ?? null
  const noteParts = [target.notes, ...sources.map((s) => s.notes)]
    .filter(Boolean)
    .filter((n, i, arr) => arr.indexOf(n) === i) as string[]
  const mergedNotes = noteParts.length > 0 ? noteParts.join("\n---\n") : null
  const minOrder = Math.min(target.order, ...sources.map((s) => s.order))

  await tx.asset.update({
    where: { id: targetAssetId },
    data: {
      quantity: Math.max(0, newQty).toString(),
      isin: mergedIsin,
      wkn: mergedWkn,
      notes: mergedNotes,
      order: minOrder,
    },
  })

  await tx.asset.deleteMany({
    where: { id: { in: uniqueSources } },
  })

  return { targetAssetId }
}
