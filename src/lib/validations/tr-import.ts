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
