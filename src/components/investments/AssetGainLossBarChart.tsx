"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ReferenceLine, ResponsiveContainer } from "recharts"
import type { Asset } from "@/hooks/useAssets"
import { getTotalGainLoss } from "@/lib/utils/calculations"
import { useI18n } from "@/i18n/context"
import { CHART_GAIN, CHART_LOSS, CHART_REFERENCE } from "@/lib/utils/chart-colors"

interface Props {
  assets: Asset[]
}

export function AssetGainLossBarChart({ assets }: Props) {
  const { t, formatMoney } = useI18n()
  const data = assets
    .map((a) => ({
      name: a.ticker,
      fullName: a.name,
      gainLoss: getTotalGainLoss(a, a.entries) * (a.eurRate ?? 1),
    }))
    .sort((a, b) => b.gainLoss - a.gainLoss)

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        {t("investments.noPositionsGainLoss")}
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis
          tickFormatter={(v) => formatMoney(v, "EUR")}
          tick={{ fontSize: 11 }}
          width={70}
        />
        <Tooltip
          formatter={(value) => formatMoney(value as number)}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          labelFormatter={(_label, payload: any) => payload?.[0]?.payload?.fullName ?? _label}
        />
        <ReferenceLine y={0} stroke={CHART_REFERENCE} strokeDasharray="4 4" />
        <Bar dataKey="gainLoss" name={t("investments.gainLossSeries")} radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.gainLoss >= 0 ? CHART_GAIN : CHART_LOSS} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
