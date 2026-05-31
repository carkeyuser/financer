import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/household-auth"
import { applyTradeRepublicImport } from "@/lib/services/tr-import-apply"
import { createNdjsonResponse } from "@/lib/services/tr-import-progress"
import { deletePreview, getPreview } from "@/lib/services/tr-import-preview-cache"
import { trImportApplySchema } from "@/lib/validations/tr-import"

const applyTimestamps = new Map<string, number>()

export async function POST(request: Request) {
  const ctx = await requireSession()
  if ("error" in ctx) return Response.json({ error: ctx.error }, { status: ctx.status })

  const lastApply = applyTimestamps.get(ctx.userId) ?? 0
  if (Date.now() - lastApply < 60_000) {
    return Response.json({ error: "Bitte einen Moment warten und erneut versuchen" }, { status: 429 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Ungültiger Request" }, { status: 400 })
  }

  const parsed = trImportApplySchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const preview = getPreview(parsed.data.previewId, ctx.householdId, ctx.userId)
  if (!preview) {
    return Response.json({ error: "Vorschau abgelaufen — bitte CSV erneut hochladen" }, { status: 410 })
  }

  return createNdjsonResponse(async (emit) => {
    const total = preview.parsedRows.length
    emit({ type: "progress", phase: "import", current: 0, total })

    const result = await prisma.$transaction((tx) =>
      applyTradeRepublicImport(
        tx,
        {
          preview,
          resolutions: parsed.data.resolutions,
          tickerOverrides: parsed.data.tickerOverrides,
        },
        (current, rowTotal) => emit({ type: "progress", phase: "import", current, total: rowTotal })
      )
    )

    applyTimestamps.set(ctx.userId, Date.now())
    deletePreview(parsed.data.previewId)

    emit({ type: "complete", data: result })
  })
}
