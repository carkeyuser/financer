"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  type PieLabelRenderProps,
  type TooltipContentProps,
} from "recharts"
import { Button } from "@/components/ui/button"
import type { Asset } from "@/hooks/useAssets"
import {
  getCurrentValue,
  getTotalGainLoss,
  getGainLossPercent,
} from "@/lib/utils/calculations"
import { useI18n } from "@/i18n/context"
import { assetTypeLabel, assetTypePluralLabel } from "@/i18n/messages"

const LABEL_MIN_PERCENT = 0.1
const OUTER_LABEL_MIN_PERCENT = 0.25

function truncateName(name: string, maxLen = 14) {
  return name.length > maxLen ? `${name.slice(0, maxLen)}…` : name
}

function renderCustomLabel(props: PieLabelRenderProps) {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent, name } = props
  const pct = percent ?? 0
  if (
    pct < LABEL_MIN_PERCENT ||
    cx == null ||
    cy == null ||
    midAngle == null ||
    outerRadius == null
  ) {
    return null
  }

  const RADIAN = Math.PI / 180
  const cxN = Number(cx)
  const cyN = Number(cy)
  const label = `${truncateName(String(name ?? ""))} ${(pct * 100).toFixed(1)}%`

  if (pct >= OUTER_LABEL_MIN_PERCENT) {
    const radius = Number(outerRadius) + 14
    const x = cxN + radius * Math.cos(-midAngle * RADIAN)
    const y = cyN + radius * Math.sin(-midAngle * RADIAN)
    const textAnchor = x > cxN ? "start" : "end"
    return (
      <text
        x={x}
        y={y}
        className="fill-foreground text-xs"
        textAnchor={textAnchor}
        dominantBaseline="central"
      >
        {label}
      </text>
    )
  }

  const ir = Number(innerRadius ?? 0)
  const or = Number(outerRadius)
  const radius = ir + (or - ir) * 0.55
  const x = cxN + radius * Math.cos(-midAngle * RADIAN)
  const y = cyN + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text
      x={x}
      y={y}
      className="fill-background text-xs font-medium"
      stroke="hsl(var(--foreground))"
      strokeWidth={2}
      paintOrder="stroke"
      textAnchor="middle"
      dominantBaseline="central"
    >
      {(pct * 100).toFixed(0)}%
    </text>
  )
}

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"]

type PositionSlice = {
  name: string
  ticker: string
  value: number
  assetId: string
  account: string
  ownerName: string | null
  typeLabel: string
  gainLoss: number
  gainLossPct: number
}

type TypeSlice = {
  name: string
  value: number
  positionCount: number
}

type ChartSlice = PositionSlice | TypeSlice

function isPositionSlice(slice: ChartSlice): slice is PositionSlice {
  return "assetId" in slice
}

type AllocationTooltipProps = Pick<TooltipContentProps, "active" | "payload"> & {
  total: number
  groupBy: "type" | "position"
}

function AllocationTooltip({
  active,
  payload,
  total,
  groupBy,
}: AllocationTooltipProps) {
  const { t, formatMoney, formatPercent } = useI18n()

  if (!active || !payload?.length) return null
  const slice = payload[0]?.payload as ChartSlice | undefined
  if (!slice) return null
  const pct = total > 0 ? ((slice.value / total) * 100).toFixed(1) : "0"

  if (groupBy === "position" && isPositionSlice(slice)) {
    const glSign = slice.gainLoss >= 0 ? "+" : ""
    return (
      <div className="rounded-lg border bg-popover px-3 py-2 text-popover-foreground shadow-md text-xs space-y-1 min-w-[180px]">
        <p className="font-semibold text-sm leading-tight">{slice.name}</p>
        <p className="text-muted-foreground">{slice.ticker}</p>
        <div className="border-t pt-1 space-y-0.5">
          <p>
            <span className="text-muted-foreground">{t("investments.tooltipValue")} </span>
            {formatMoney(slice.value)} ({pct} %)
          </p>
          <p>
            <span className="text-muted-foreground">{t("investments.tooltipGainLoss")} </span>
            <span
              className={
                slice.gainLoss > 0
                  ? "text-green-600 dark:text-green-400"
                  : slice.gainLoss < 0
                    ? "text-red-600 dark:text-red-400"
                    : ""
              }
            >
              {glSign}
              {formatMoney(slice.gainLoss)} ({slice.gainLossPct >= 0 ? "+" : ""}
              {formatPercent(slice.gainLossPct, 1)})
            </span>
          </p>
          {slice.account ? (
            <p>
              <span className="text-muted-foreground">{t("investments.tooltipAccount")} </span>
              {slice.account}
            </p>
          ) : null}
          {slice.ownerName ? (
            <p>
              <span className="text-muted-foreground">{t("investments.tooltipOwner")} </span>
              {slice.ownerName}
            </p>
          ) : null}
          <p>
            <span className="text-muted-foreground">{t("investments.tooltipType")} </span>
            {slice.typeLabel}
          </p>
        </div>
        <p className="text-muted-foreground text-[10px] pt-0.5">{t("investments.tooltipClickOpen")}</p>
      </div>
    )
  }

  const typeSlice = slice as TypeSlice
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-popover-foreground shadow-md text-xs space-y-1">
      <p className="font-semibold text-sm">{typeSlice.name}</p>
      <p>
        <span className="text-muted-foreground">{t("investments.tooltipValue")} </span>
        {formatMoney(typeSlice.value)} ({pct} %)
      </p>
      <p>
        <span className="text-muted-foreground">{t("investments.tooltipPositions")} </span>
        {typeSlice.positionCount}
      </p>
    </div>
  )
}

interface Props {
  assets: Asset[]
}

export function PortfolioAllocationChart({ assets }: Props) {
  const router = useRouter()
  const { locale, t } = useI18n()
  const [groupBy, setGroupBy] = useState<"type" | "position">("position")

  const { data, total } = useMemo(() => {
    if (groupBy === "type") {
      const byType = assets.reduce<Record<string, { value: number; count: number }>>((acc, asset) => {
        const val = getCurrentValue(asset, asset.entries) * (asset.eurRate ?? 1)
        if (val <= 0) return acc
        const key = asset.type
        if (!acc[key]) acc[key] = { value: 0, count: 0 }
        acc[key].value += val
        acc[key].count += 1
        return acc
      }, {})
      const slices: TypeSlice[] = Object.entries(byType).map(([type, { value, count }]) => ({
        name: assetTypePluralLabel(locale, type),
        value,
        positionCount: count,
      }))
      const sum = slices.reduce((s, d) => s + d.value, 0)
      return { data: slices, total: sum }
    }

    const slices: PositionSlice[] = assets
      .map((a) => {
        const eurRate = a.eurRate ?? 1
        return {
          name: a.name,
          ticker: a.ticker,
          value: getCurrentValue(a, a.entries) * eurRate,
          assetId: a.id,
          account: a.account,
          ownerName: a.ownerName,
          typeLabel: assetTypeLabel(locale, a.type),
          gainLoss: getTotalGainLoss(a, a.entries) * eurRate,
          gainLossPct: getGainLossPercent(a, a.entries),
        }
      })
      .filter((d) => d.value > 0)

    const sum = slices.reduce((s, d) => s + d.value, 0)
    return { data: slices, total: sum }
  }, [assets, groupBy, locale])

  const handleSliceClick = (slice: ChartSlice) => {
    if (groupBy === "position" && isPositionSlice(slice)) {
      router.push(`/investments/${slice.assetId}`)
    }
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        {t("common.noData")}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={groupBy === "type" ? "default" : "outline"}
          onClick={() => setGroupBy("type")}
        >
          {t("investments.byType")}
        </Button>
        <Button
          size="sm"
          variant={groupBy === "position" ? "default" : "outline"}
          onClick={() => setGroupBy("position")}
        >
          {t("investments.byPosition")}
        </Button>
        {groupBy === "position" ? (
          <span className="text-xs text-muted-foreground">{t("investments.segmentHint")}</span>
        ) : null}
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart margin={{ top: 12, right: 28, bottom: 12, left: 28 }}>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={95}
            dataKey="value"
            label={renderCustomLabel}
            labelLine={false}
            className={groupBy === "position" ? "cursor-pointer" : undefined}
            onClick={(slice) => handleSliceClick(slice as unknown as ChartSlice)}
          >
            {data.map((_, i) => (
              <Cell
                key={i}
                fill={COLORS[i % COLORS.length]}
                className={groupBy === "position" ? "cursor-pointer hover:opacity-80" : undefined}
              />
            ))}
          </Pie>
          <Tooltip
            content={(props) => (
              <AllocationTooltip
                active={props.active}
                payload={props.payload}
                total={total}
                groupBy={groupBy}
              />
            )}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
