import { z } from "zod"
import type { Locale } from "@/i18n/locales"
import { createTranslator } from "@/i18n/messages"

export function createRegisterSchema(locale: Locale) {
  const t = createTranslator(locale)
  return z
    .object({
      name: z.string().min(2, t("validation.nameMin2")),
      username: z
        .string()
        .min(3, t("validation.usernameMin3"))
        .max(32, t("validation.usernameMax32"))
        .regex(/^[a-zA-Z0-9_.-]+$/, t("validation.usernameChars32")),
      password: z.string().min(8, t("validation.passwordMin8")),
      householdName: z.string().optional(),
      inviteToken: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      if (!data.inviteToken && (!data.householdName || data.householdName.length < 2)) {
        ctx.addIssue({
          code: "custom",
          message: t("validation.householdNameMin2"),
          path: ["householdName"],
        })
      }
    })
}

export function createLoginSchema(locale: Locale) {
  const t = createTranslator(locale)
  return z.object({
    username: z.string().min(1, t("validation.usernameRequired")),
    password: z.string().min(1, t("validation.passwordRequired")),
  })
}

export const registerSchema = createRegisterSchema("de")
export const loginSchema = createLoginSchema("de")

export type RegisterInput = z.infer<ReturnType<typeof createRegisterSchema>>
export type LoginInput = z.infer<ReturnType<typeof createLoginSchema>>
