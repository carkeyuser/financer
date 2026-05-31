"use client"

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts"
import type { Asset } from "@/hooks/useAssets"
import { getCurrentValue } from "@/lib/utils/calculations"
import { useI18n } from "@/i18n/context"

interface Props {
  assets: Asset[]
}

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316"]

export function CurrencyExposureWidget({ assets }: Props) {
  const { t, formatMoney, formatNumber } = useI18n()

  if (assets.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
        {t("investments.noPositions")}
      </div>
    )
  }

  const byCurrency: Record<string, number> = {}
  for (const asset of assets) {
    const value = getCurrentValue(asset, asset.entries) * (asset.eurRate ?? 1)
    const currency = asset.currency
    byCurrency[currency] = (byCurrency[currency] ?? 0) + value
  }

  const total = Object.values(byCurrency).reduce((s, v) => s + v, 0)
  const data = Object.entries(byCurrency)
    .map(([name, value]) => ({ name, value, pct: total > 0 ? (value / total) * 100 : 0 }))
    .sort((a, b) => b.value - a.value)

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius="70%"
          innerRadius="40%"
          paddingAngle={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name, props) => [
            `${formatNumber((props.payload.pct as number), { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%  (${formatMoney(value as number)})`,
            name,
          ]}
        />
        <Legend
          formatter={(value, entry) => {
            const pct = (entry.payload as { pct: number }).pct
            return `${value} ${formatNumber(pct, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
          }}
          iconSize={8}
          wrapperStyle={{ fontSize: "11px" }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
