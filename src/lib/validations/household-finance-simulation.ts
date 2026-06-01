import { z } from "zod"
import type { Locale } from "@/i18n/locales"
import { createTranslator } from "@/i18n/messages"
import { monthIndex } from "@/lib/utils/household-finance"

export const MAX_SIMULATION_MONTHS = 36

const yearSchema = z.number().int().min(2000).max(2100)
const monthSchema = z.number().int().min(1).max(12)
const amountSchema = z.number().nonnegative()

function rangeLength(startYear: number, startMonth: number, endYear: number, endMonth: number) {
  return monthIndex(endYear, endMonth) - monthIndex(startYear, startMonth) + 1
}

function validateRange(
  data: { startYear: number; startMonth: number; endYear: number; endMonth: number },
  ctx: z.RefinementCtx,
  t: ReturnType<typeof createTranslator>
) {
  const months = rangeLength(data.startYear, data.startMonth, data.endYear, data.endMonth)
  if (months < 1) {
    ctx.addIssue({
      code: "custom",
      path: ["endMonth"],
      message: t("validation.simulationEndBeforeStart"),
    })
  }
  if (months > MAX_SIMULATION_MONTHS) {
    ctx.addIssue({
      code: "custom",
      path: ["endMonth"],
      message: t("validation.simulationMaxMonths", { max: MAX_SIMULATION_MONTHS }),
    })
  }
}

function simulationRangeSchema(locale: Locale) {
  const t = createTranslator(locale)
  return z
    .object({
      startYear: yearSchema,
      startMonth: monthSchema,
      endYear: yearSchema,
      endMonth: monthSchema,
    })
    .superRefine((data, ctx) => validateRange(data, ctx, t))
}

function simulationAmountListSchema(locale: Locale) {
  const t = createTranslator(locale)
  return z
    .array(
      z.object({
        userId: z.string().min(1),
        amount: amountSchema,
      })
    )
    .superRefine((items, ctx) => {
      const seen = new Set<string>()
      for (const [index, item] of items.entries()) {
        if (seen.has(item.userId)) {
          ctx.addIssue({
            code: "custom",
            path: [index, "userId"],
            message: t("validation.simulationDuplicateUserPerMonth"),
          })
        }
        seen.add(item.userId)
      }
    })
}

export function createSimulationSchema(locale: Locale) {
  return simulationRangeSchema(locale).extend({
    name: z.string().trim().min(1).max(80),
  })
}

export function updateSimulationSchema(locale: Locale) {
  return simulationRangeSchema(locale).extend({
    name: z.string().trim().min(1).max(80),
  })
}

export function updateSimulationMonthSchema(locale: Locale) {
  return z.object({
    year: yearSchema,
    month: monthSchema,
    fixedCosts: amountSchema,
    incomes: simulationAmountListSchema(locale),
    payouts: simulationAmountListSchema(locale),
    applyToFuture: z
      .object({
        fixedCosts: z.boolean().optional(),
        incomes: z.boolean().optional(),
        payouts: z.boolean().optional(),
      })
      .optional(),
  })
}

export type CreateSimulationInput = z.infer<ReturnType<typeof createSimulationSchema>>
export type UpdateSimulationInput = z.infer<ReturnType<typeof updateSimulationSchema>>
export type UpdateSimulationMonthInput = z.infer<ReturnType<typeof updateSimulationMonthSchema>>
