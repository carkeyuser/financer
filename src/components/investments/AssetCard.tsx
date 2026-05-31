"use client"

import Link from "next/link"
import { TrendingUp, TrendingDown, Minus, Landmark, User } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { Asset } from "@/hooks/useAssets"
import {
  getCurrentValue,
  getTotalGainLoss,
  getGainLossPercent,
  getVWAP,
} from "@/lib/utils/calculations"
import { hasMarketPrice, positionGlowCardClass } from "@/lib/utils/position-display"
import { AssetLogo } from "@/components/investments/AssetLogo"
import { useI18n } from "@/i18n/context"

interface AssetCardProps {
  asset: Asset
}

export function AssetCard({ asset }: AssetCardProps) {
  const { t, formatMoney, formatNumber, formatPercent } = useI18n()
  const eurRate = asset.eurRate ?? 1
  const isEur = asset.currency === "EUR"
  const value = getCurrentValue(asset, asset.entries) * eurRate
  const gainLoss = getTotalGainLoss(asset, asset.entries) * eurRate
  const gainLossPct = getGainLossPercent(asset, asset.entries)
  const vwap = getVWAP(asset.entries)
  const qty = parseFloat(asset.quantity)
  const isPositive = gainLoss > 0
  const isNegative = gainLoss < 0
  const hasPrice = hasMarketPrice(asset.entries)

  return (
    <Link href={`/investments/${asset.id}`}>
      <Card
        className={cn(
          "hover:shadow-md transition-shadow cursor-pointer h-full bg-card",
          positionGlowCardClass(gainLoss, hasPrice)
        )}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start gap-3">
            <AssetLogo ticker={asset.ticker} type={asset.type} size="md" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm truncate">{asset.name}</p>
              <p className="text-xs text-muted-foreground">{asset.ticker}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap mt-1">
            {asset.account && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Landmark className="h-3 w-3" />{asset.account}
              </span>
            )}
            {asset.ownerName && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <User className="h-3 w-3" />{asset.ownerName}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="text-2xl font-bold">{formatMoney(value)}</span>
              {!isEur && (
                <p className="text-xs text-muted-foreground">
                  {formatMoney(getCurrentValue(asset, asset.entries), asset.currency)}
                </p>
              )}
            </div>
            <div
              className={`flex items-center gap-1 text-sm font-medium ${
                isPositive ? "text-green-500" : isNegative ? "text-red-500" : "text-muted-foreground"
              }`}
            >
              {isPositive ? (
                <TrendingUp className="h-4 w-4" />
              ) : isNegative ? (
                <TrendingDown className="h-4 w-4" />
              ) : (
                <Minus className="h-4 w-4" />
              )}
              <span>
                {isPositive ? "+" : ""}
                {formatMoney(gainLoss)} ({gainLossPct >= 0 ? "+" : ""}
                {formatPercent(gainLossPct, 2)})
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div>
              <p>{t("common.quantity")}</p>
              <p className="font-medium text-foreground">
                {formatNumber(qty, { maximumFractionDigits: 6 })}
              </p>
            </div>
            <div>
              <p>{t("investments.avgPurchasePrice")}</p>
              <p className="font-medium text-foreground">
                {formatMoney(vwap * eurRate)}{!isEur && ` (${formatMoney(vwap, asset.currency)})`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
