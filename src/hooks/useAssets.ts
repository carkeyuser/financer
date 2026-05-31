import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { PRICE_REFRESH_INTERVAL_MS } from "@/lib/constants/query"
import {
  type PortfolioChartRange,
  getRangeStartDate,
  getYahooHistoryInterval,
  maxIsoDate,
} from "@/lib/constants/portfolio-chart-range"
import { mergeHistoricalPrices } from "@/lib/utils/calculations"
import type { CalcAsset, CalcEntry } from "@/lib/utils/calculations"
import type { AssetInput, AssetEntryInput, AssetEntryUpdateInput, AssetEditInput } from "@/lib/validations/asset"

export interface AssetHistoryPrice {
  date: string
  price: number
}

export interface AssetHistory {
  ticker: string
  prices: AssetHistoryPrice[]
  currency: string | null
  eurRate: number | null
}

export type AssetType = "STOCK" | "ETF" | "CRYPTO" | "BOND" | "OTHER"
export type AssetEntryType = "PURCHASE" | "SALE" | "PRICE_UPDATE" | "QUANTITY_UPDATE" | "VWAP_UPDATE"

export interface AssetEntry {
  id: string
  assetId: string
  type: AssetEntryType
  price: string
  quantity: string | null
  date: string
  note: string | null
  createdAt: string
}

export interface Asset {
  id: string
  householdId: string
  userId: string
  ticker: string
  name: string
  type: AssetType
  currency: string
  isin: string | null
  wkn: string | null
  notes: string | null
  account: string
  ownerName: string | null
  quantity: string
  order: number
  eurRate: number
  createdAt: string
  updatedAt: string
  entries: AssetEntry[]
}

async function fetchAssets(): Promise<Asset[]> {
  const res = await fetch("/api/assets")
  if (!res.ok) throw new Error("Assets konnten nicht geladen werden")
  return res.json()
}

export function useAssets() {
  return useQuery({ queryKey: ["assets"], queryFn: fetchAssets })
}

export interface PortfolioPriceRefreshResult {
  updated: number
  failed: string[]
  skipped: string[]
}

export function usePortfolioPriceRefresh() {
  const qc = useQueryClient()
  return useQuery({
    queryKey: ["portfolio-price-refresh"],
    queryFn: async (): Promise<PortfolioPriceRefreshResult> => {
      const res = await fetch("/api/assets/refresh-prices", { method: "POST" })
      if (!res.ok) throw new Error("Kurs-Refresh fehlgeschlagen")
      const result = (await res.json()) as PortfolioPriceRefreshResult
      await qc.invalidateQueries({ queryKey: ["assets"] })
      await qc.invalidateQueries({ queryKey: ["portfolio-history"] })
      return result
    },
    refetchInterval: PRICE_REFRESH_INTERVAL_MS,
    refetchIntervalInBackground: true,
    staleTime: PRICE_REFRESH_INTERVAL_MS,
    retry: 1,
  })
}

export function useAsset(id: string) {
  return useQuery({
    queryKey: ["assets", id],
    queryFn: async () => {
      const res = await fetch(`/api/assets/${id}`)
      if (!res.ok) throw new Error("Asset nicht gefunden")
      return res.json() as Promise<Asset>
    },
    enabled: !!id,
  })
}

export function useCreateAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: AssetInput) => {
      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw err
      }
      return res.json() as Promise<{ asset: Asset; merged: boolean }>
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets"] })
      qc.invalidateQueries({ queryKey: ["market-calendar"] })
    },
  })
}

export function useDeleteAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/assets/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Löschen fehlgeschlagen")
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets"] })
      qc.invalidateQueries({ queryKey: ["market-calendar"] })
    },
  })
}

export function useUpdateAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AssetEditInput }) => {
      const res = await fetch(`/api/assets/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw err
      }
      return res.json() as Promise<Asset>
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets"] })
      qc.invalidateQueries({ queryKey: ["market-calendar"] })
    },
  })
}

export function useReorderAssets() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const res = await fetch("/api/assets/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds }),
      })
      if (!res.ok) throw new Error("Reihenfolge konnte nicht gespeichert werden")
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assets"] }),
  })
}

export function useCreateAssetEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: AssetEntryInput) => {
      const res = await fetch("/api/asset-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw err
      }
      return res.json() as Promise<AssetEntry>
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assets"] }),
  })
}

export function useUpdateAssetEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AssetEntryUpdateInput }) => {
      const res = await fetch(`/api/asset-entries/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw err
      }
      return res.json() as Promise<AssetEntry>
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assets"] }),
  })
}

export function useDeleteAssetEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/asset-entries/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Löschen fehlgeschlagen")
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assets"] }),
  })
}

export function usePortfolioHistory(assets: Asset[], range: PortfolioChartRange) {
  const rangeStart = getRangeStartDate(range)
  const interval = getYahooHistoryInterval(range)

  const assetInfos = assets.map((a) => {
    const earliestPurchase = a.entries
      .filter((e) => e.type === "PURCHASE")
      .map((e) => e.date.split("T")[0])
      .sort()[0] ?? new Date().toISOString().split("T")[0]
    const from =
      rangeStart != null ? maxIsoDate(earliestPurchase, rangeStart) : earliestPurchase
    return { ticker: a.ticker, from }
  })

  const queryKey = [range, ...assetInfos.map((a) => `${a.ticker}:${a.from}`).sort()].join(",")

  return useQuery({
    queryKey: ["portfolio-history", queryKey],
    queryFn: async (): Promise<AssetHistory[]> => {
      const results = await Promise.all(
        assetInfos.map(async ({ ticker, from }) => {
          try {
            const res = await fetch(
              `/api/securities/history?symbol=${encodeURIComponent(ticker)}&from=${from}&interval=${interval}`
            )
            if (!res.ok) return { ticker, prices: [], currency: null, eurRate: null }
            const data = await res.json()
            return {
              ticker,
              prices: (data.prices ?? []) as AssetHistoryPrice[],
              currency: (data.currency ?? null) as string | null,
              eurRate: (data.eurRate ?? null) as number | null,
            }
          } catch {
            return { ticker, prices: [], currency: null, eurRate: null }
          }
        })
      )
      return results
    },
    enabled: assetInfos.length > 0,
    staleTime: PRICE_REFRESH_INTERVAL_MS,
    refetchInterval: PRICE_REFRESH_INTERVAL_MS,
    refetchIntervalInBackground: true,
  })
}

export interface PortfolioHistoryItem {
  asset: CalcAsset
  entries: CalcEntry[]
  eurRate: number
}

export function usePortfolioHistoryItems(
  assets: Asset[],
  range: PortfolioChartRange
): PortfolioHistoryItem[] {
  const { data: historyData } = usePortfolioHistory(assets, range)

  return assets.map((a) => {
    const assetHistory = historyData?.find((h) => h.ticker === a.ticker)
    return {
      asset: a,
      entries: assetHistory
        ? mergeHistoricalPrices(a.entries, assetHistory.prices)
        : a.entries,
      eurRate: assetHistory?.eurRate ?? a.eurRate ?? 1,
    }
  })
}
