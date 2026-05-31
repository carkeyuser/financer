import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRef } from "react"
import { readNdjsonStream, type TrImportProgressEvent } from "@/lib/services/tr-import-progress"
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

type ProgressHandler = (event: Extract<TrImportProgressEvent, { type: "progress" }>) => void

export function useTradeRepublicPreview(onProgress?: ProgressHandler) {
  const onProgressRef = useRef(onProgress)
  onProgressRef.current = onProgress

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
      return readNdjsonStream<TrImportPreviewResponse>(res, (e) => onProgressRef.current?.(e))
    },
  })
}

export function useTradeRepublicApply(onProgress?: ProgressHandler) {
  const onProgressRef = useRef(onProgress)
  onProgressRef.current = onProgress
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
      return readNdjsonStream<TrImportApplyResponse>(res, (e) => onProgressRef.current?.(e))
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets"] })
      qc.invalidateQueries({ queryKey: ["dividends"] })
    },
  })
}
