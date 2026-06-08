"use client"

import { useMemo } from "react"
import { getGainLossPercent } from "@/lib/utils/calculations"
import type { Asset } from "@/hooks/useAssets"
import { useI18n } from "@/i18n/context"
import { cn } from "@/lib/utils"

interface Props {
  assets: Asset[]
}

export function AmbientTickerTape({ assets }: Props) {
  const { formatNumber } = useI18n()

  const items = useMemo(() => {
    return assets
      .filter((a) => parseFloat(a.quantity) > 0)
      .map((a) => {
        const calcAsset = { id: a.id, quantity: a.quantity }
        const pct = getGainLossPercent(calcAsset, a.entries)
        return {
          id: a.id,
          ticker: a.ticker,
          name: a.name,
          pct,
          positive: pct >= 0,
        }
      })
  }, [assets])

  if (items.length === 0) return null

  const doubled = [...items, ...items]

  return (
    <div
      className="ambient-ticker border-t border-primary/30 bg-card/40 backdrop-blur-md"
      aria-hidden
    >
      <div className="ambient-ticker-track flex w-max gap-8 px-4 py-2.5 text-sm font-mono">
        {doubled.map((item, i) => (
          <span key={`${item.id}-${i}`} className="flex shrink-0 items-center gap-2 whitespace-nowrap">
            <span className="font-semibold text-primary">{item.ticker}</span>
            <span className="text-muted-foreground max-w-[8rem] truncate">{item.name}</span>
            <span
              className={cn(
                "tabular-nums",
                item.positive ? "text-[var(--gain)]" : "text-[var(--loss)]"
              )}
            >
              {item.positive ? "+" : ""}
              {formatNumber(item.pct, { maximumFractionDigits: 2 })} %
            </span>
            <span className="text-muted-foreground/50">|</span>
          </span>
        ))}
      </div>
    </div>
  )
}
