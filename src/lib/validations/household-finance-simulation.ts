import { z } from "zod"
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
  ctx: z.RefinementCtx
) {
  const months = rangeLength(data.startYear, data.startMonth, data.endYear, data.endMonth)
  if (months < 1) {
    ctx.addIssue({
      code: "custom",
      path: ["endMonth"],
      message: "Ende muss nach dem Start liegen",
    })
  }
  if (months > MAX_SIMULATION_MONTHS) {
    ctx.addIssue({
      code: "custom",
      path: ["endMonth"],
      message: `Zeitraum darf maximal ${MAX_SIMULATION_MONTHS} Monate umfassen`,
    })
  }
}

const simulationRangeSchema = z
  .object({
    startYear: yearSchema,
    startMonth: monthSchema,
    endYear: yearSchema,
    endMonth: monthSchema,
  })
  .superRefine(validateRange)

const simulationAmountListSchema = z
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
          message: "User darf pro Monat nur einmal vorkommen",
        })
      }
      seen.add(item.userId)
    }
  })

export const createSimulationSchema = simulationRangeSchema.extend({
  name: z.string().trim().min(1).max(80),
})

export const updateSimulationSchema = simulationRangeSchema.extend({
  name: z.string().trim().min(1).max(80),
})

export const updateSimulationMonthSchema = z.object({
  year: yearSchema,
  month: monthSchema,
  fixedCosts: amountSchema,
  incomes: simulationAmountListSchema,
  payouts: simulationAmountListSchema,
  applyToFuture: z
    .object({
      fixedCosts: z.boolean().optional(),
      incomes: z.boolean().optional(),
      payouts: z.boolean().optional(),
    })
    .optional(),
})

export type CreateSimulationInput = z.infer<typeof createSimulationSchema>
export type UpdateSimulationInput = z.infer<typeof updateSimulationSchema>
export type UpdateSimulationMonthInput = z.infer<typeof updateSimulationMonthSchema>
