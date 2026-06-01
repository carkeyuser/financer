import { z } from "zod"
import type { Locale } from "@/i18n/locales"
import { createTranslator } from "@/i18n/messages"

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export function createDividendPaymentSchema(locale: Locale) {
  const t = createTranslator(locale)
  return z.object({
    assetId: z.string().min(1, t("validation.positionRequired")),
    date: isoDateSchema.optional().or(z.literal("")),
    amount: z.number().positive(t("validation.dividendAmountPositive")),
    grossAmount: z.number().nonnegative().optional(),
    taxAmount: z.number().nonnegative().optional(),
    amountPerShare: z.number().nonnegative().optional(),
    quantity: z.number().nonnegative().optional(),
    note: z.string().optional(),
  })
}

export type DividendPaymentInput = z.infer<ReturnType<typeof createDividendPaymentSchema>>
