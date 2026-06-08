"use client"

import { PortfolioPriceRefresh } from "@/components/investments/PortfolioPriceRefresh"
import { AuthenticatedDialogs } from "@/components/layout/AuthenticatedDialogs"

export function AmbientShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuthenticatedDialogs />
      <PortfolioPriceRefresh />
      {children}
    </>
  )
}
