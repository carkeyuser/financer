import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  assetMergeBatchResultSchema,
  assetMergeResultSchema,
  mergeSuggestionsCompleteSchema,
  type MergeSuggestionsComplete,
} from "@/lib/validations/asset-merge"

export type MergeSuggestionGroup = MergeSuggestionsComplete["groups"][number]

export function useMergeSuggestions(enabled: boolean) {
  return useQuery({
    queryKey: ["merge-suggestions"],
    queryFn: async () => {
      const res = await fetch("/api/assets/merge-suggestions")
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(typeof err.error === "string" ? err.error : "Vorschläge konnten nicht geladen werden")
      }
      const data = await res.json()
      const parsed = mergeSuggestionsCompleteSchema.safeParse(data)
      if (!parsed.success) throw new Error("Ungültige Antwort vom Server")
      return parsed.data
    },
    enabled,
    staleTime: 0,
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
      qc.invalidateQueries({ queryKey: ["merge-suggestions"] })
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
      qc.invalidateQueries({ queryKey: ["merge-suggestions"] })
      qc.invalidateQueries({ queryKey: ["dividends"] })
    },
  })
}
