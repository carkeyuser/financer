"use client"

import { useMemo, useState } from "react"
import { PieChart, TrendingUp, Activity, BarChart2, Info } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { PortfolioAllocationChart } from "./PortfolioAllocationChart"
import { PortfolioValueChart } from "./PortfolioValueChart"
import { PortfolioGainLossChart } from "./PortfolioGainLossChart"
import { AssetGainLossBarChart } from "./AssetGainLossBarChart"
import type { Asset } from "@/hooks/useAssets"
import { useI18n } from "@/i18n/context"
import { PortfolioChartRangeSelector } from "./PortfolioChartRangeSelector"
import {
  DEFAULT_PORTFOLIO_CHART_RANGE,
  type PortfolioChartRange,
} from "@/lib/constants/portfolio-chart-range"

type ChartType = "allocation" | "value" | "gainloss" | "bars"

interface Props {
  assets: Asset[]
}

export function PortfolioChartPanel({ assets }: Props) {
  const { t } = useI18n()
  const [active, setChart] = useState<ChartType>("allocation")
  const [range, setRange] = useState<PortfolioChartRange>(DEFAULT_PORTFOLIO_CHART_RANGE)
  const showRangeSelector = active === "value" || active === "gainloss"

  const charts = useMemo(
    () => [
      {
        type: "allocation" as ChartType,
        label: t("investments.tabAllocation"),
        icon: PieChart,
        description: t("investments.tabAllocationHint"),
      },
      {
        type: "value" as ChartType,
        label: t("investments.tabValueHistory"),
        icon: TrendingUp,
        description: t("investments.tabValueHint"),
      },
      {
        type: "gainloss" as ChartType,
        label: t("investments.tabGainLossHistory"),
        icon: Activity,
        description: t("investments.tabGainLossHint"),
      },
      {
        type: "bars" as ChartType,
        label: t("investments.tabGainLossByPosition"),
        icon: BarChart2,
        description: t("investments.tabGainLossByPositionHint"),
      },
    ],
    [t]
  )

  return (
    <TooltipProvider delay={300}>
      <Card>
        <CardContent className="pt-4 space-y-4">
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
            {charts.map(({ type, label, icon: Icon, description }) => (
              <div key={type} className="flex shrink-0 items-center gap-0.5">
                <button
                  onClick={() => setChart(type)}
                  className={`flex min-h-10 items-center gap-1.5 rounded-md border px-3 py-2 text-sm transition-colors sm:min-h-0 sm:py-1.5 ${
                    active === type
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-input hover:bg-accent text-muted-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
                <Tooltip>
                  <TooltipTrigger
                    className="flex h-10 w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground sm:h-auto sm:w-auto sm:p-1"
                    aria-label={t("investments.infoAria", { label })}
                    render={<button type="button" />}
                  >
                    <Info className="h-3.5 w-3.5" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-60 text-xs">
                    {description}
                  </TooltipContent>
                </Tooltip>
              </div>
            ))}
          </div>

          {showRangeSelector && (
            <PortfolioChartRangeSelector value={range} onChange={setRange} />
          )}

          {active === "allocation" && <PortfolioAllocationChart assets={assets} />}
          {active === "value" && <PortfolioValueChart assets={assets} range={range} />}
          {active === "gainloss" && <PortfolioGainLossChart assets={assets} range={range} />}
          {active === "bars" && <AssetGainLossBarChart assets={assets} />}
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
