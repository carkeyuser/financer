"use client"

import {
  PORTFOLIO_CHART_RANGES,
  type PortfolioChartRange,
} from "@/lib/constants/portfolio-chart-range"
import { useI18n } from "@/i18n/context"

interface Props {
  value: PortfolioChartRange
  onChange: (range: PortfolioChartRange) => void
}

const RANGE_LABEL_KEYS = {
  "1W": "chartRange1W",
  "1M": "chartRange1M",
  "3M": "chartRange3M",
  "6M": "chartRange6M",
  "1Y": "chartRange1Y",
  MAX: "chartRangeMax",
} as const satisfies Record<PortfolioChartRange, string>

export function PortfolioChartRangeSelector({ value, onChange }: Props) {
  const { t } = useI18n()

  return (
    <div
      className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1"
      role="group"
      aria-label={t("investments.chartRangeAria")}
    >
      {PORTFOLIO_CHART_RANGES.map((range) => (
        <button
          key={range}
          type="button"
          onClick={() => onChange(range)}
          className={`shrink-0 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${
            value === range
              ? "border-primary bg-primary text-primary-foreground"
              : "border-input bg-background text-muted-foreground hover:bg-accent"
          }`}
        >
          {t(`investments.${RANGE_LABEL_KEYS[range]}`)}
        </button>
      ))}
    </div>
  )
}
