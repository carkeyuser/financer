import { z } from "zod"

export const deleteInvestmentAccountSchema = z.object({
  account: z.string().trim().min(1).max(100),
  targetUserId: z.string().cuid().optional(),
})

export type DeleteInvestmentAccountInput = z.infer<typeof deleteInvestmentAccountSchema>
