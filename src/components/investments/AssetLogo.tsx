"use client"

import { useState } from "react"
import { TrendingUp, Layers, Coins, Landmark, CircleDot } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { getAssetLogoUrl } from "@/lib/utils/position-display"
import type { AssetType } from "@/hooks/useAssets"
import { useI18n } from "@/i18n/context"
import { assetTypeLabel } from "@/i18n/messages"

const TYPE_ICONS: Record<AssetType, typeof TrendingUp> = {
  STOCK: TrendingUp,
  ETF: Layers,
  CRYPTO: Coins,
  BOND: Landmark,
  OTHER: CircleDot,
}

interface AssetLogoProps {
  ticker: string
  type: AssetType
  size?: "sm" | "md"
  className?: string
}

const SIZE = { sm: "h-8 w-8", md: "h-10 w-10" } as const
const ICON_SIZE = { sm: "h-3.5 w-3.5", md: "h-4 w-4" } as const

export function AssetLogo({ ticker, type, size = "md", className }: AssetLogoProps) {
  const { locale } = useI18n()
  const [failed, setFailed] = useState(false)
  const Icon = TYPE_ICONS[type]
  const box = SIZE[size]

  if (failed) {
    return (
      <Badge
        variant="secondary"
        className={cn(box, "shrink-0 p-0 flex items-center justify-center gap-0.5 rounded-md", className)}
        title={assetTypeLabel(locale, type)}
      >
        <Icon className={ICON_SIZE[size]} aria-hidden />
        <span className="sr-only">{assetTypeLabel(locale, type)}</span>
      </Badge>
    )
  }

  return (
    <img
      src={getAssetLogoUrl(ticker)}
      alt=""
      className={cn(box, "shrink-0 rounded-md object-contain bg-muted/40", className)}
      onError={() => setFailed(true)}
    />
  )
}
