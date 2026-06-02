import { z } from "zod"

const yearSchema = z.number().int().min(2000).max(2100)
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

export const personalIncomeYearsQuerySchema = z.object({
  from: yearSchema.optional(),
  to: yearSchema.optional(),
})

export type PersonalIncomeMonthUpsertInput = z.infer<typeof personalIncomeMonthUpsertSchema>
export type PersonalIncomeBonusCreateInput = z.infer<typeof personalIncomeBonusCreateSchema>
