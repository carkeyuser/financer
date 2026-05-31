import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { TrImportPreviewRow, TrImportResolution, TrImportSummary, TrTickerOverride } from "@/lib/services/tr-import-types"
import type { TrTickerMapping } from "@/lib/services/tr-import-ticker-mapping"

export interface TrImportPreviewResponse {
  previewId: string
  account: string
  targetUserId: string
  summary: TrImportSummary
  tickerMappings: TrTickerMapping[]
  rows: TrImportPreviewRow[]
}

export interface TrImportApplyResponse {
  created: number
  linked: number
  skipped: number
  errors: string[]
}

export function useTradeRepublicPreview() {
  return useMutation({
    mutationFn: async (input: { file: File; account: string; targetUserId?: string }) => {
      const form = new FormData()
      form.append("file", input.file)
      form.append("account", input.account)
      if (input.targetUserId) form.append("targetUserId", input.targetUserId)

      const res = await fetch("/api/investments/import/trade-republic/preview", {
        method: "POST",
        body: form,
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(typeof err.error === "string" ? err.error : "Vorschau fehlgeschlagen")
      }
      return res.json() as Promise<TrImportPreviewResponse>
    },
  })
}

export function useTradeRepublicApply() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      previewId: string
      resolutions: Record<string, TrImportResolution>
      tickerOverrides: Record<string, TrTickerOverride>
    }) => {
      const res = await fetch("/api/investments/import/trade-republic/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(typeof err.error === "string" ? err.error : "Import fehlgeschlagen")
      }
      return res.json() as Promise<TrImportApplyResponse>
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets"] })
      qc.invalidateQueries({ queryKey: ["dividends"] })
    },
  })
}
