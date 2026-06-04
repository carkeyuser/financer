import { z } from "zod"
import type { Locale } from "@/i18n/locales"
import { createTranslator } from "@/i18n/messages"

export const PERSONAL_INCOME_MAX_YEARS_SPAN = 30

function yearField(locale: Locale) {
  const t = createTranslator(locale)
  return z
    .number({ error: t("validation.yearInvalid") })
    .int(t("validation.yearInvalid"))
    .min(2000, t("validation.yearMin"))
    .max(2100, t("validation.yearMax"))
}

function monthField(locale: Locale) {
  const t = createTranslator(locale)
  return z
    .number({ error: t("validation.monthInvalid") })
    .int(t("validation.monthInvalid"))
    .min(1, t("validation.monthInvalid"))
    .max(12, t("validation.monthInvalid"))
}

const optionalAmount = z
  .number()
  .nonnegative()
  .nullable()
  .optional()
  .transform((v) => (v === undefined ? undefined : v))

export function createPersonalIncomeMonthUpsertSchema(locale: Locale) {
  return z.object({
    year: yearField(locale),
    month: monthField(locale),
    grossSalary: optionalAmount,
    netSalary: optionalAmount,
    monthBonus: optionalAmount,
    note: z.string().max(2000).nullable().optional(),
  })
}

export function createPersonalIncomeBonusCreateSchema(locale: Locale) {
  const t = createTranslator(locale)
  return z.object({
    date: z.string().min(1, t("validation.dateRequired")),
    amount: z.number().positive(t("validation.amountPositive")),
    label: z.string().min(1, t("validation.labelRequired")).max(200),
    note: z.string().max(2000).nullable().optional(),
  })
}

export function createPersonalIncomeSyncHouseholdSchema(locale: Locale) {
  return z.object({
    year: yearField(locale),
    month: monthField(locale),
  })
}

export function createPersonalIncomeYearsQuerySchema(locale: Locale) {
  const t = createTranslator(locale)
  return z
    .object({
      from: yearField(locale).optional(),
      to: yearField(locale).optional(),
    })
    .superRefine((data, ctx) => {
      const currentYear = new Date().getFullYear()
      const toYear = data.to ?? currentYear
      const fromYear = data.from ?? toYear - 4
      if (fromYear > toYear) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t("validation.personalIncomeFromAfterTo"),
        })
      }
      if (toYear - fromYear + 1 > PERSONAL_INCOME_MAX_YEARS_SPAN) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t("validation.personalIncomeYearsSpanTooLarge", {
            max: PERSONAL_INCOME_MAX_YEARS_SPAN,
          }),
        })
      }
    })
}

export function createPersonalIncomeYearsListQuerySchema(locale: Locale) {
  const t = createTranslator(locale)
  return z.object({
    years: z
      .string()
      .min(1)
      .transform((s) =>
        s
          .split(",")
          .map((y) => parseInt(y.trim(), 10))
          .filter((y) => !Number.isNaN(y))
      )
      .pipe(
        z
          .array(yearField(locale))
          .min(1, t("validation.personalIncomeYearsRequired"))
          .max(
            PERSONAL_INCOME_MAX_YEARS_SPAN,
            t("validation.personalIncomeYearsSpanTooLarge", {
              max: PERSONAL_INCOME_MAX_YEARS_SPAN,
            })
          )
      ),
  })
}

export function createPersonalIncomeSummaryQuerySchema(locale: Locale) {
  return z.object({
    year: yearField(locale),
  })
}

export function createPersonalIncomeTrackYearSchema(locale: Locale) {
  const t = createTranslator(locale)
  return z
    .object({
      year: yearField(locale),
    })
    .superRefine((data, ctx) => {
      const currentYear = new Date().getFullYear()
      if (data.year >= currentYear) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t("validation.personalIncomeYearNotPast"),
          path: ["year"],
        })
      }
    })
}

/** @deprecated Use createPersonalIncomeMonthUpsertSchema(locale) in API routes */
export const personalIncomeMonthUpsertSchema = createPersonalIncomeMonthUpsertSchema("de")
export const personalIncomeBonusCreateSchema = createPersonalIncomeBonusCreateSchema("de")
export const personalIncomeSyncHouseholdSchema = createPersonalIncomeSyncHouseholdSchema("de")
export const personalIncomeYearsQuerySchema = createPersonalIncomeYearsQuerySchema("de")
export const personalIncomeYearsListQuerySchema = createPersonalIncomeYearsListQuerySchema("de")
export const personalIncomeSummaryQuerySchema = createPersonalIncomeSummaryQuerySchema("de")
export const personalIncomeTrackYearSchema = createPersonalIncomeTrackYearSchema("de")

export type PersonalIncomeMonthUpsertInput = z.infer<
  ReturnType<typeof createPersonalIncomeMonthUpsertSchema>
>
export type PersonalIncomeBonusCreateInput = z.infer<
  ReturnType<typeof createPersonalIncomeBonusCreateSchema>
>
