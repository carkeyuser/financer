import { z } from "zod"

export const PERSONAL_INCOME_MAX_YEARS_SPAN = 30

export const yearSchema = z.number().int().min(2000).max(2100)
const monthSchema = z.number().int().min(1).max(12)

const optionalAmount = z
  .number()
  .nonnegative()
  .nullable()
  .optional()
  .transform((v) => (v === undefined ? undefined : v))

export const personalIncomeMonthUpsertSchema = z.object({
  year: yearSchema,
  month: monthSchema,
  grossSalary: optionalAmount,
  netSalary: optionalAmount,
  monthBonus: optionalAmount,
  note: z.string().max(2000).nullable().optional(),
})

export const personalIncomeBonusCreateSchema = z.object({
  date: z.string().min(1),
  amount: z.number().positive(),
  label: z.string().min(1).max(200),
  note: z.string().max(2000).nullable().optional(),
})

export const personalIncomeSyncHouseholdSchema = z.object({
  year: yearSchema,
  month: monthSchema,
})

export const personalIncomeYearsQuerySchema = z
  .object({
    from: yearSchema.optional(),
    to: yearSchema.optional(),
  })
  .superRefine((data, ctx) => {
    const currentYear = new Date().getFullYear()
    const toYear = data.to ?? currentYear
    const fromYear = data.from ?? toYear - 4
    if (fromYear > toYear) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "FROM_AFTER_TO" })
    }
    if (toYear - fromYear + 1 > PERSONAL_INCOME_MAX_YEARS_SPAN) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "YEARS_SPAN_TOO_LARGE" })
    }
  })

export const personalIncomeYearsListQuerySchema = z.object({
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
        .array(yearSchema)
        .min(1)
        .max(PERSONAL_INCOME_MAX_YEARS_SPAN, { message: "YEARS_SPAN_TOO_LARGE" })
    ),
})

export const personalIncomeSummaryQuerySchema = z.object({
  year: yearSchema,
})

export const personalIncomeTrackYearSchema = z
  .object({
    year: yearSchema,
  })
  .superRefine((data, ctx) => {
    const currentYear = new Date().getFullYear()
    if (data.year >= currentYear) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "YEAR_NOT_PAST",
        path: ["year"],
      })
    }
  })

export type PersonalIncomeMonthUpsertInput = z.infer<typeof personalIncomeMonthUpsertSchema>
export type PersonalIncomeBonusCreateInput = z.infer<typeof personalIncomeBonusCreateSchema>
