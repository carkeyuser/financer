import { z } from "zod"

export const assetMergeSchema = z.object({
  targetAssetId: z.string().min(1),
  sourceAssetIds: z.array(z.string().min(1)).min(1).max(10),
})

export const assetMergeBatchSchema = z.object({
  merges: z.array(assetMergeSchema).min(1).max(20),
})

export const mergeScanPhaseSchema = z.enum(["load_assets", "load_rates", "analyze"])

export const mergeScanProgressEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("progress"),
    phase: mergeScanPhaseSchema,
    current: z.number(),
    total: z.number(),
  }),
  z.object({ type: z.literal("complete"), data: z.unknown() }),
  z.object({ type: z.literal("error"), error: z.string() }),
])

export type MergeScanProgressEvent = z.infer<typeof mergeScanProgressEventSchema>
export type MergeScanPhase = z.infer<typeof mergeScanPhaseSchema>

export const mergeSuggestionsCompleteSchema = z.object({
  groups: z.array(
    z.object({
      id: z.string(),
      confidence: z.enum(["high", "medium", "low"]),
      score: z.number(),
      reasonKey: z.string(),
      suggestedTargetId: z.string(),
      trImportRelevant: z.boolean(),
      assets: z.array(
        z.object({
          id: z.string(),
          ticker: z.string(),
          name: z.string(),
          isin: z.string().nullable(),
          account: z.string(),
          type: z.enum(["STOCK", "ETF", "CRYPTO", "BOND", "OTHER"]),
          entryCount: z.number(),
          quantity: z.string(),
          valueEur: z.number(),
          ownerName: z.string(),
          userId: z.string(),
        })
      ),
    })
  ),
  assetCount: z.number(),
})

export type MergeSuggestionsComplete = z.infer<typeof mergeSuggestionsCompleteSchema>

export const assetMergeResultSchema = z.object({
  targetAssetId: z.string(),
})

export const assetMergeBatchResultSchema = z.object({
  merged: z.number(),
  errors: z.array(z.string()),
})
