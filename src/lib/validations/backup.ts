import { z } from "zod"

export const backupAssetEntryTypes = ["PURCHASE", "SALE", "PRICE_UPDATE", "QUANTITY_UPDATE", "VWAP_UPDATE"] as const
export const backupDividendStatuses = ["EXPECTED", "RECEIVED"] as const
export const backupDividendSources = ["YAHOO", "MANUAL"] as const
export const backupSimulationEntryTypes = ["INCOME", "PAYOUT"] as const

const entrySchema = z.object({
  type: z.enum(backupAssetEntryTypes),
  price: z.string(),
  quantity: z.string().nullable(),
  date: z.string(),
  note: z.string().nullable().optional(),
  importRef: z.string().nullable().optional(),
})

const dividendSchema = z.object({
  username: z.string(),
  year: z.number(),
  exDate: z.string(),
  payDate: z.string().nullable(),
  amountPerShare: z.string(),
  quantity: z.string(),
  grossAmount: z.string(),
  taxAmount: z.string(),
  netAmount: z.string(),
  currency: z.string(),
  eurRate: z.string(),
  status: z.enum(backupDividendStatuses),
  source: z.enum(backupDividendSources),
  note: z.string().nullable().optional(),
  importRef: z.string().nullable().optional(),
})

const simulationSchema = z.object({
  createdByUsername: z.string().nullable().optional(),
  name: z.string(),
  startYear: z.number(),
  startMonth: z.number(),
  endYear: z.number(),
  endMonth: z.number(),
  months: z.array(
    z.object({
      year: z.number(),
      month: z.number(),
      fixedCosts: z.string(),
      entries: z.array(
        z.object({
          username: z.string(),
          type: z.enum(backupSimulationEntryTypes),
          amount: z.string(),
        })
      ),
    })
  ),
})

export const backupSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string(),
  household: z.object({
    name: z.string(),
    currency: z.string(),
  }),
  members: z.array(
    z.object({
      username: z.string(),
      name: z.string().nullable().optional(),
      role: z.enum(["OWNER", "ADMIN", "MEMBER"]),
    })
  ),
  fixedCosts: z.array(
    z.object({
      name: z.string(),
      amount: z.string(),
      order: z.number(),
    })
  ),
  monthlyIncomes: z.array(
    z.object({
      username: z.string(),
      year: z.number(),
      month: z.number(),
      amount: z.string(),
    })
  ),
  monthlyPayouts: z.array(
    z.object({
      username: z.string(),
      year: z.number(),
      month: z.number(),
      amount: z.string(),
    })
  ),
  fixedCostSnapshots: z.array(
    z.object({
      year: z.number(),
      month: z.number(),
      fixedCosts: z.string(),
    })
  ),
  assets: z.array(
    z.object({
      username: z.string(),
      ticker: z.string(),
      name: z.string(),
      type: z.enum(["STOCK", "ETF", "CRYPTO", "BOND", "OTHER"]),
      currency: z.string(),
      isin: z.string().nullable().optional(),
      wkn: z.string().nullable().optional(),
      notes: z.string().nullable().optional(),
      account: z.string().optional(),
      quantity: z.string(),
      order: z.number(),
      entries: z.array(entrySchema),
      dividends: z.array(dividendSchema).optional().default([]),
    })
  ),
  simulations: z.array(simulationSchema).optional().default([]),
  personalIncomeMonths: z
    .array(
      z.object({
        year: z.number(),
        month: z.number(),
        grossSalary: z.string().nullable().optional(),
        netSalary: z.string().nullable().optional(),
        monthBonus: z.string().nullable().optional(),
        note: z.string().nullable().optional(),
        syncedToHouseholdAt: z.string().nullable().optional(),
      })
    )
    .optional()
    .default([]),
  personalIncomeBonuses: z
    .array(
      z.object({
        date: z.string(),
        amount: z.string(),
        label: z.string(),
        note: z.string().nullable().optional(),
      })
    )
    .optional()
    .default([]),
})

export type BackupInput = z.infer<typeof backupSchema>
