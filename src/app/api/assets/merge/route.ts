import { NextResponse } from "next/server"
import { requireHouseholdAdmin } from "@/lib/household-auth"
import { prisma } from "@/lib/prisma"
import { MergeAssetsError, mergeAssets } from "@/lib/services/asset-merge-apply"
import { assetMergeSchema } from "@/lib/validations/asset-merge"

export async function POST(request: Request) {
  const admin = await requireHouseholdAdmin()
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status })
  }

  const body = await request.json()
  const parsed = assetMergeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { targetAssetId, sourceAssetIds } = parsed.data

  try {
    const result = await prisma.$transaction((tx) =>
      mergeAssets(tx, {
        householdId: admin.householdId,
        targetAssetId,
        sourceAssetIds,
      })
    )
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof MergeAssetsError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    throw err
  }
}
