import { NextResponse } from "next/server"
import { requireHouseholdAdmin } from "@/lib/household-auth"
import { prisma } from "@/lib/prisma"
import { MergeAssetsError, mergeAssets } from "@/lib/services/asset-merge-apply"
import { assetMergeBatchSchema } from "@/lib/validations/asset-merge"

export async function POST(request: Request) {
  const admin = await requireHouseholdAdmin()
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status })
  }

  const body = await request.json()
  const parsed = assetMergeBatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  let merged = 0
  const errors: string[] = []

  for (const merge of parsed.data.merges) {
    try {
      await prisma.$transaction((tx) =>
        mergeAssets(tx, {
          householdId: admin.householdId,
          targetAssetId: merge.targetAssetId,
          sourceAssetIds: merge.sourceAssetIds,
        })
      )
      merged++
    } catch (err) {
      const msg = err instanceof MergeAssetsError ? err.message : "Unbekannter Fehler"
      errors.push(msg)
    }
  }

  return NextResponse.json({ merged, errors })
}
