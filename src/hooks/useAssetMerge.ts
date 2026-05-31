import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  assetMergeBatchResultSchema,
  assetMergeResultSchema,
  mergeScanProgressEventSchema,
  mergeSuggestionsCompleteSchema,
  type MergeScanProgressEvent,
  type MergeSuggestionsComplete,
} from "@/lib/validations/asset-merge"
import { readNdjsonStream } from "@/lib/utils/ndjson-stream"

export type MergeSuggestionGroup = MergeSuggestionsComplete["groups"][number]

export function useMergeSuggestions(enabled: boolean) {
  return useQuery({
    queryKey: ["merge-suggestions"],
    queryFn: async () => fetchMergeSuggestionsStream(),
    enabled,
    staleTime: 0,
  })
}

export async function fetchMergeSuggestionsStream(
  onProgress?: (event: Extract<MergeScanProgressEvent, { type: "progress" }>) => void,
  options?: { trAccount?: string; userId?: string }
): Promise<MergeSuggestionsComplete> {
  const params = new URLSearchParams({ stream: "1" })
  if (options?.trAccount) params.set("trAccount", options.trAccount)
  if (options?.userId) params.set("userId", options.userId)

  const res = await fetch(`/api/assets/merge-suggestions?${params}`)
  return readNdjsonStream(res, onProgress, {
    resultSchema: mergeSuggestionsCompleteSchema,
    eventSchema: mergeScanProgressEventSchema,
  })
}

export function useMergeAssets() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { targetAssetId: string; sourceAssetIds: string[] }) => {
      const res = await fetch("/api/assets/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(typeof err.error === "string" ? err.error : "Zusammenführung fehlgeschlagen")
      }
      const data = await res.json()
      const parsed = assetMergeResultSchema.safeParse(data)
      if (!parsed.success) throw new Error("Ungültige Antwort vom Server")
      return parsed.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets"] })
      qc.invalidateQueries({ queryKey: ["dividends"] })
    },
  })
}

export function useMergeAssetsBatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { merges: Array<{ targetAssetId: string; sourceAssetIds: string[] }> }) => {
      const res = await fetch("/api/assets/merge/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(typeof err.error === "string" ? err.error : "Zusammenführung fehlgeschlagen")
      }
      const data = await res.json()
      const parsed = assetMergeBatchResultSchema.safeParse(data)
      if (!parsed.success) throw new Error("Ungültige Antwort vom Server")
      return parsed.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets"] })
      qc.invalidateQueries({ queryKey: ["dividends"] })
    },
  })
}
