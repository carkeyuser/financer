import { z } from "zod"
import type { Locale } from "@/i18n/locales"
import { createTranslator } from "@/i18n/messages"

export const inviteSchema = z.object({})

export function createAcceptInviteSchema(locale: Locale) {
  const t = createTranslator(locale)
  return z.object({
    token: z.string().min(1, t("validation.tokenMissing")),
  })
}

export const switchHouseholdSchema = z.object({
  householdId: z.string().min(1),
})

export const updateMemberRoleSchema = z.object({
  role: z.enum(["ADMIN", "MEMBER"]),
})

export function buildCreateUserSchema(locale: Locale) {
  const t = createTranslator(locale)
  return z
    .object({
      name: z.string().min(1, t("validation.nameRequiredField")).max(50),
      username: z
        .string()
        .min(3, t("validation.min3Chars"))
        .max(30, t("validation.max30Chars"))
        .regex(/^[a-zA-Z0-9_-]+$/, t("validation.usernameChars30")),
      password: z.string().min(8, t("validation.min8Chars")),
      tenancy: z.enum(["household", "tenant"]),
      householdName: z.string().min(1, t("validation.nameRequiredField")).max(50).optional(),
    })
    .superRefine((data, ctx) => {
      if (data.tenancy === "tenant" && data.householdName?.trim() === "") {
        ctx.addIssue({
          code: "custom",
          message: t("validation.nameRequiredField"),
          path: ["householdName"],
        })
      }
    })
}

export function buildEditUserSchema(locale: Locale) {
  const t = createTranslator(locale)
  return z.object({
    name: z.string().min(1, t("validation.nameRequiredField")).max(50).optional(),
    username: z
      .string()
      .min(3, t("validation.min3Chars"))
      .max(30, t("validation.max30Chars"))
      .regex(/^[a-zA-Z0-9_-]+$/, t("validation.usernameChars30"))
      .optional(),
    password: z.string().min(8, t("validation.min8Chars")).optional(),
  })
}

export function buildUpdateHouseholdNameSchema(locale: Locale) {
  const t = createTranslator(locale)
  return z.object({
    name: z.string().min(1, t("validation.nameRequiredField")).max(50, t("validation.max50Chars")),
  })
}

export const acceptInviteSchema = createAcceptInviteSchema("de")
export const createUserSchema = buildCreateUserSchema("de")
export const editUserSchema = buildEditUserSchema("de")
export const updateHouseholdNameSchema = buildUpdateHouseholdNameSchema("de")

export type InviteInput = z.infer<typeof inviteSchema>
export type AcceptInviteInput = z.infer<ReturnType<typeof createAcceptInviteSchema>>
export type CreateUserInput = z.infer<ReturnType<typeof buildCreateUserSchema>>
export type EditUserInput = z.infer<ReturnType<typeof buildEditUserSchema>>
export type UpdateHouseholdNameInput = z.infer<ReturnType<typeof buildUpdateHouseholdNameSchema>>
