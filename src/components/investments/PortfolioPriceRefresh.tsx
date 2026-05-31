"use client"

import { usePortfolioPriceRefresh } from "@/hooks/useAssets"

/** Triggers bulk Yahoo price refresh every 2h while the user is logged in. */
export function PortfolioPriceRefresh() {
  usePortfolioPriceRefresh()
  return null
}
