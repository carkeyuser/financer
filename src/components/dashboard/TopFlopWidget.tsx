"use client"

import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import type { Asset } from "@/hooks/useAssets"
import { getGainLossPercent, getTotalGainLoss } from "@/lib/utils/calculations"
import { useI18n } from "@/i18n/context"

interface Props {
  assets: Asset[]
}

export function TopFlopWidget({ assets }: Props) {
  const { t, formatMoney, formatNumber } = useI18n()

  if (assets.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
        {t("investments.noPositions")}
      </div>
    )
  }

  const enriched = assets
    .map((a) => ({
      id: a.id,
      name: a.name,
      ticker: a.ticker,
      gainLossPct: getGainLossPercent(a, a.entries),
      gainLoss: getTotalGainLoss(a, a.entries) * (a.eurRate ?? 1),
    }))
    .sort((a, b) => b.gainLossPct - a.gainLossPct)

  const top = enriched.slice(0, 3)
  const flop = enriched.slice(-3).reverse()

  function Row({ item }: { item: (typeof enriched)[0] }) {
    const isPos = item.gainLossPct > 0
    const isNeg = item.gainLossPct < 0
    return (
      <div className="flex items-center justify-between gap-2 py-1 border-b last:border-0">
        <div className="min-w-0">
          <p className="text-xs font-medium truncate">{item.name}</p>
          <p className="text-xs text-muted-foreground">{item.ticker}</p>
        </div>
        <div className={`text-right shrink-0 ${isPos ? "text-green-500" : isNeg ? "text-red-500" : "text-muted-foreground"}`}>
          <div className="flex items-center gap-0.5 justify-end text-xs font-medium">
            {isPos ? <TrendingUp className="h-3 w-3" /> : isNeg ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
            {isPos ? "+" : ""}{formatNumber(item.gainLossPct, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
          </div>
          <p className="text-xs">{isPos ? "+" : ""}{formatMoney(item.gainLoss)}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 h-full p-1 overflow-auto">
      <div>
        <p className="text-xs font-semibold text-green-500 mb-1.5">{t("investments.topN", { n: top.length })}</p>
        {top.map((item) => <Row key={item.id} item={item} />)}
      </div>
      <div>
        <p className="text-xs font-semibold text-red-500 mb-1.5">{t("investments.flopN", { n: flop.length })}</p>
        {flop.map((item) => <Row key={item.id} item={item} />)}
      </div>
    </div>
  )
}
