"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts"
import { format } from "date-fns"
import type { Asset } from "@/hooks/useAssets"
import { usePortfolioHistoryItems } from "@/hooks/useAssets"
import { getGainLossHistory } from "@/lib/utils/calculations"
import {
  type PortfolioChartRange,
  getRangeStartDate,
  getHistoryFillGranularity,
} from "@/lib/constants/portfolio-chart-range"
import { useI18n } from "@/i18n/context"
import { CHART_PRIMARY, CHART_REFERENCE } from "@/lib/utils/chart-colors"

interface Props {
  assets: Asset[]
  range: PortfolioChartRange
}

export function PortfolioGainLossChart({ assets, range }: Props) {
  const { t, formatMoney, formatNumber, getDateFnsLocale } = useI18n()
  const dateFnsLocale = getDateFnsLocale()
  const items = usePortfolioHistoryItems(assets, range)
  const minDate = getRangeStartDate(range) ?? undefined
  const history = getGainLossHistory(items, {
    minDate,
    fillGranularity: getHistoryFillGranularity(range),
  })
  const gainLossEurLabel = t("investments.gainLossEur")
  const gainLossPctLabel = t("investments.gainLossPercent")

  if (history.length < 2) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        {t("investments.noChartData")}
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={history} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="date"
          tickFormatter={(d) => format(new Date(d), "dd.MM.yy", { locale: dateFnsLocale })}
          tick={{ fontSize: 11 }}
        />
        <YAxis
          tickFormatter={(v) => `${v >= 0 ? "+" : ""}${(v / 1000).toFixed(0)}k`}
          tick={{ fontSize: 11 }}
          width={55}
        />
        <Tooltip
          formatter={(value, name) => {
            const v = value as number
            if (name === gainLossPctLabel) {
              return [`${v >= 0 ? "+" : ""}${formatNumber(v, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`, name]
            }
            return [formatMoney(v), name]
          }}
          labelFormatter={(d) => format(new Date(d as string), "dd.MM.yyyy", { locale: dateFnsLocale })}
        />
        <ReferenceLine y={0} stroke={CHART_REFERENCE} strokeDasharray="4 4" />
        <Line
          type="monotone"
          dataKey="gainLoss"
          name={gainLossEurLabel}
          stroke={CHART_PRIMARY}
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
