"use client"

import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from "recharts"
import { TrendingDown, TrendingUp } from "lucide-react"
import { usePortfolioSnapshots } from "@/hooks/useDailyHabit"
import { useI18n } from "@/i18n/context"

export function PortfolioSnapshotWidget() {
  const { t, formatMoney, formatNumber } = useI18n()
  const { data, isLoading } = usePortfolioSnapshots(90)

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        {t("common.loading")}
      </div>
    )
  }

  const delta = data?.delta
  const series = data?.series ?? []
  const hasDelta = delta?.deltaEur != null && delta.deltaPercent != null
  const positive = (delta?.deltaEur ?? 0) >= 0

  return (
    <div className="flex h-full flex-col gap-2 p-1">
      <div>
        <p className="text-xs text-muted-foreground">{t("today.sinceYesterday")}</p>
        {hasDelta ? (
          <p
            className={`text-lg font-bold flex items-center gap-1 ${positive ? "text-green-500" : "text-red-500"}`}
          >
            {positive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            {positive ? "+" : ""}
            {formatMoney(delta!.deltaEur!)}
            <span className="text-sm font-normal">
              ({positive ? "+" : ""}
              {formatNumber(delta!.deltaPercent!, { maximumFractionDigits: 2 })} %)
            </span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">{t("today.noComparison")}</p>
        )}
        {delta?.current != null && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatMoney(delta.current)}
          </p>
        )}
      </div>
      {series.length > 1 && (
        <div className="flex-1 min-h-[80px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series}>
              <YAxis hide domain={["dataMin", "dataMax"]} />
              <Tooltip
                formatter={(v) => formatMoney(Number(v ?? 0))}
                labelFormatter={(l) => l}
              />
              <Area
                type="monotone"
                dataKey="totalEur"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.15}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
