import { z } from "zod"
import type { Locale } from "@/i18n/locales"
import { createTranslator } from "@/i18n/messages"

export function createProfileSchema(locale: Locale) {
  const t = createTranslator(locale)
  return z.object({
    name: z.string().max(100).optional(),
    username: z
      .string()
      .min(2, t("validation.usernameMin2"))
      .max(50, t("validation.usernameMax50"))
      .regex(/^[a-zA-Z0-9_.-]+$/, t("validation.usernameChars50")),
    locale: z.enum(["de", "en"]).optional(),
  })
}

export function createPasswordSchema(locale: Locale) {
  const t = createTranslator(locale)
  return z.object({
    currentPassword: z.string().min(1, t("validation.currentPasswordRequired")),
    newPassword: z.string().min(8, t("validation.newPasswordMin8")),
  })
}

export function createTotpSchema(locale: Locale) {
  const t = createTranslator(locale)
  return z.object({ token: z.string().length(6, t("validation.totpLength")) })
}

export const profileSchema = createProfileSchema("de")
export const passwordSchema = createPasswordSchema("de")

export type ProfileInput = z.infer<ReturnType<typeof createProfileSchema>>
export type PasswordInput = z.infer<ReturnType<typeof createPasswordSchema>>
