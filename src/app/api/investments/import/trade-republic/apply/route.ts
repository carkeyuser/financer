import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/household-auth"
import { applyTradeRepublicImport } from "@/lib/services/tr-import-apply"
import { deletePreview, getPreview } from "@/lib/services/tr-import-preview-cache"
import { trImportApplySchema } from "@/lib/validations/tr-import"

const applyTimestamps = new Map<string, number>()

export async function POST(request: Request) {
  const ctx = await requireSession()
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const lastApply = applyTimestamps.get(ctx.userId) ?? 0
  if (Date.now() - lastApply < 60_000) {
    return NextResponse.json({ error: "Bitte einen Moment warten und erneut versuchen" }, { status: 429 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Ungültiger Request" }, { status: 400 })
  }

  const parsed = trImportApplySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const preview = getPreview(parsed.data.previewId, ctx.householdId, ctx.userId)
  if (!preview) {
    return NextResponse.json({ error: "Vorschau abgelaufen — bitte CSV erneut hochladen" }, { status: 410 })
  }

  try {
    const result = await prisma.$transaction((tx) =>
      applyTradeRepublicImport(tx, {
        preview,
        resolutions: parsed.data.resolutions,
        tickerOverrides: parsed.data.tickerOverrides,
      })
    )

    applyTimestamps.set(ctx.userId, Date.now())
    deletePreview(parsed.data.previewId)

    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Import fehlgeschlagen" },
      { status: 500 }
    )
  }
}
