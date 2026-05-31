import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { DividendPaymentInput } from "@/lib/validations/dividend"

export type DividendStatus = "EXPECTED" | "RECEIVED"

export interface DividendEvent {
  id: string
  paymentId: string
  assetId: string
  ticker: string
  name: string
  account: string
  ownerName: string | null
  date: string
  amount: number
  grossAmount: number
  taxAmount: number
  amountPerShare: number
  quantity: number
  status: DividendStatus
  note: string | null
}

export interface DividendAssetOption {
  id: string
  ticker: string
  name: string
  type: string
  account: string
  ownerName: string | null
  quantity: string
}

export interface DividendSummary {
  year: number
  kpis: {
    totalYear: number
    currentMonth: number
    futureTotal: number
    paymentCount: number
  }
  monthly: { month: number; amount: number }[]
  events: DividendEvent[]
  assets: DividendAssetOption[]
}

const dividendKeys = {
  summary: (year: number) => ["dividends", "summary", year] as const,
}

async function readJsonError(res: Response) {
  try {
    return await res.json()
  } catch {
    return { error: "Request failed" }
  }
}

export function useDividendSummary(year: number) {
  return useQuery({
    queryKey: dividendKeys.summary(year),
    queryFn: async () => {
      const res = await fetch(`/api/dividends/summary?year=${year}`)
      if (!res.ok) throw await readJsonError(res)
      return res.json() as Promise<DividendSummary>
    },
    staleTime: 60 * 60 * 1000,
  })
}

export function useCreateDividendPayment(year: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: DividendPaymentInput) => {
      const res = await fetch("/api/dividends/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw await readJsonError(res)
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: dividendKeys.summary(year) }),
  })
}

export function useUpdateDividendPayment(year: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: DividendPaymentInput }) => {
      const res = await fetch(`/api/dividends/payments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw await readJsonError(res)
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: dividendKeys.summary(year) }),
  })
}

export function useDeleteDividendPayment(year: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/dividends/payments/${id}`, { method: "DELETE" })
      if (!res.ok) throw await readJsonError(res)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: dividendKeys.summary(year) }),
  })
}
