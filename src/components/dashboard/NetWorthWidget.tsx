"use client"

import { Wallet } from "lucide-react"
import { useI18n } from "@/i18n/context"

interface Props {
  portfolioTotal: number
}

export function NetWorthWidget({ portfolioTotal }: Props) {
  const { t, formatMoney } = useI18n()

  return (
    <div className="p-2 h-full flex items-center">
      <div className="flex items-center justify-between w-full">
        <div>
          <p className="text-xs text-muted-foreground">{t("widgets.netWorth")}</p>
          <p className="text-2xl font-bold">{formatMoney(portfolioTotal)}</p>
        </div>
        <Wallet className="h-6 w-6 text-muted-foreground" />
      </div>
    </div>
  )
}
