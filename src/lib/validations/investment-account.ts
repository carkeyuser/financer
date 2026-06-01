import { z } from "zod"
import type { Locale } from "@/i18n/locales"
import { createTranslator } from "@/i18n/messages"

export function createDeleteInvestmentAccountSchema(locale: Locale) {
  const t = createTranslator(locale)
  return z.object({
    account: z.string().trim().min(1, t("validation.accountRequired")).max(100),
    targetUserId: z.string().cuid().optional(),
  })
}

export type DeleteInvestmentAccountInput = z.infer<
  ReturnType<typeof createDeleteInvestmentAccountSchema>
>
