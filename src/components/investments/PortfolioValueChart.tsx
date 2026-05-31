"use client"

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { format } from "date-fns"
import type { Asset } from "@/hooks/useAssets"
import { usePortfolioHistoryItems } from "@/hooks/useAssets"
import { getPortfolioValueHistory } from "@/lib/utils/calculations"
import {
  type PortfolioChartRange,
  getRangeStartDate,
  getHistoryFillGranularity,
} from "@/lib/constants/portfolio-chart-range"
import { useI18n } from "@/i18n/context"

interface Props {
  assets: Asset[]
  range: PortfolioChartRange
}

export function PortfolioValueChart({ assets, range }: Props) {
  const { t, formatMoney, getDateFnsLocale } = useI18n()
  const dateFnsLocale = getDateFnsLocale()
  const items = usePortfolioHistoryItems(assets, range)
  const minDate = getRangeStartDate(range) ?? undefined
  const history = getPortfolioValueHistory(items, {
    minDate,
    fillGranularity: getHistoryFillGranularity(range),
  })

  if (history.length < 2) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        {t("investments.noChartData")}
      </div>
    )
  }

  const startValue = history[0].totalValue
  const color = history[history.length - 1].totalValue >= startValue ? "#22c55e" : "#ef4444"

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={history} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="date"
          tickFormatter={(d) => format(new Date(d), "dd.MM.yy", { locale: dateFnsLocale })}
          tick={{ fontSize: 11 }}
        />
        <YAxis
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
          tick={{ fontSize: 11 }}
          width={50}
        />
        <Tooltip
          formatter={(value) => formatMoney(value as number)}
          labelFormatter={(d) => format(new Date(d as string), "dd.MM.yyyy", { locale: dateFnsLocale })}
        />
        <Area
          type="monotone"
          dataKey="totalValue"
          name={t("investments.portfolioValueSeries")}
          stroke={color}
          fill="url(#valueGradient)"
          strokeWidth={2}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
