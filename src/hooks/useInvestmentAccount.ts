import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { DeleteInvestmentAccountInput } from "@/lib/validations/investment-account"

export interface DeleteInvestmentAccountResult {
  deletedAssets: number
}

export function useDeleteInvestmentAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: DeleteInvestmentAccountInput): Promise<DeleteInvestmentAccountResult> => {
      const res = await fetch("/api/investments/accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Löschen fehlgeschlagen" }))
        throw err
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets"] })
      qc.invalidateQueries({ queryKey: ["dividends"] })
      qc.invalidateQueries({ queryKey: ["market-calendar"] })
      qc.invalidateQueries({ queryKey: ["portfolio-history"] })
    },
  })
}
