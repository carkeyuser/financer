import { z } from "zod"

export const trImportResolutionSchema = z.enum(["skip", "import", "link", "replace"])

export const trTickerOverrideSchema = z.object({
  symbol: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(["STOCK", "ETF", "CRYPTO", "BOND", "OTHER"]),
  currency: z.string().min(1),
})

export const trImportApplySchema = z.object({
  previewId: z.string().min(1),
  resolutions: z.record(z.string(), trImportResolutionSchema).default({}),
  tickerOverrides: z.record(z.string(), trTickerOverrideSchema).default({}),
})

export type TrImportApplyInput = z.infer<typeof trImportApplySchema>

export const trImportApplyResultSchema = z.object({
  created: z.number(),
  linked: z.number(),
  skipped: z.number(),
  errors: z.array(z.string()),
})

export const trImportPreviewCompleteSchema = z.object({
  previewId: z.string().min(1),
  account: z.string(),
  targetUserId: z.string().min(1),
  summary: z.object({
    importNew: z.number(),
    skipHard: z.number(),
    skipSoft: z.number(),
    conflict: z.number(),
    needsTicker: z.number(),
    ignored: z.number(),
    tickersToReview: z.number(),
  }),
  tickerMappings: z.array(z.record(z.string(), z.unknown())),
  rows: z.array(z.record(z.string(), z.unknown())),
})
