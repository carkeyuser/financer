"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"

export interface SecurityResult {
  symbol: string
  name: string
  exchange: string
  typeDisp: string
  assetType: "STOCK" | "ETF" | "CRYPTO" | "BOND" | "OTHER"
}

async function searchSecurities(q: string): Promise<SecurityResult[]> {
  const res = await fetch(`/api/securities/search?q=${encodeURIComponent(q)}`)
  if (!res.ok) throw new Error("Suche fehlgeschlagen")
  const data = await res.json()
  return data.results ?? []
}

export function useSecuritySearch(input: string) {
  const [debouncedQuery, setDebouncedQuery] = useState("")

  useEffect(() => {
    const delay = input.length >= 2 ? 300 : 0
    const timer = setTimeout(() => {
      setDebouncedQuery(input.length >= 2 ? input : "")
    }, delay)
    return () => clearTimeout(timer)
  }, [input])

  return useQuery({
    queryKey: ["securities", "search", debouncedQuery],
    queryFn: () => searchSecurities(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
    staleTime: 60_000,
  })
}

export async function fetchSecurityPrice(symbol: string) {
  const res = await fetch(`/api/securities/price?symbol=${encodeURIComponent(symbol)}`)
  if (!res.ok) return null
  return res.json() as Promise<{
    price: number | null
    currency: string | null
    priceEur: number | null
    eurRate: number | null
    name: string | null
  }>
}
