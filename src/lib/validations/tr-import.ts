import { z } from "zod"

export const trImportResolutionSchema = z.enum(["skip", "import", "link", "replace"])

export const trImportEventTypeSchema = z.enum(["purchase", "sale", "dividend", "interest", "ignored"])

export const trImportRowStatusSchema = z.enum([
  "import_new",
  "skip_hard",
  "skip_soft",
  "conflict",
  "needs_ticker",
  "ignored",
])

export const trAssetTypeSchema = z.enum(["STOCK", "ETF", "CRYPTO", "BOND", "OTHER"])

export const trTickerOverrideSchema = z.object({
  symbol: z.string().min(1),
  name: z.string().min(1),
  type: trAssetTypeSchema,
  currency: z.string().min(1),
})

export const trTickerMappingSourceSchema = z.enum(["portfolio", "yahoo", "unresolved"])

export const trTickerMappingSchema = z.object({
  isin: z.string(),
  productName: z.string(),
  transactionCount: z.number(),
  source: trTickerMappingSourceSchema,
  suggestedTicker: trTickerOverrideSchema.nullable(),
  portfolioTicker: trTickerOverrideSchema.nullable(),
  yahooTicker: trTickerOverrideSchema.nullable(),
  requiresManual: z.boolean(),
  hasTickerConflict: z.boolean(),
})

export const trMatchedEntrySchema = z.object({
  id: z.string(),
  kind: z.enum(["asset_entry", "dividend"]),
  date: z.string(),
  assetName: z.string(),
  ticker: z.string(),
  quantity: z.number().nullable(),
  price: z.number().nullable(),
  amountEur: z.number().nullable(),
  type: z.string(),
})

export const trImportPreviewRowSchema = z.object({
  rowId: z.string(),
  lineNumber: z.number(),
  status: trImportRowStatusSchema,
  eventType: trImportEventTypeSchema,
  date: z.string(),
  product: z.string(),
  isin: z.string().nullable(),
  quantity: z.number().nullable(),
  price: z.number().nullable(),
  totalEur: z.number().nullable(),
  taxEur: z.number().nullable(),
  orderId: z.string().nullable(),
  importRef: z.string(),
  suggestedTicker: trTickerOverrideSchema.nullable(),
  matchedEntry: trMatchedEntrySchema.nullable(),
  defaultResolution: trImportResolutionSchema,
})

export const trImportSummarySchema = z.object({
  importNew: z.number(),
  skipHard: z.number(),
  skipSoft: z.number(),
  conflict: z.number(),
  needsTicker: z.number(),
  ignored: z.number(),
  tickersToReview: z.number(),
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
  summary: trImportSummarySchema,
  tickerMappings: z.array(trTickerMappingSchema),
  rows: z.array(trImportPreviewRowSchema),
})

export type TrImportPreviewComplete = z.infer<typeof trImportPreviewCompleteSchema>
