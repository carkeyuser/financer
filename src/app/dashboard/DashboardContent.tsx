"use client"

import { Suspense, useState, useEffect, useCallback } from "react"
import { Settings2, TrendingUp, TrendingDown, Minus, BarChart3, Wallet, GripVertical, AlignJustify, X, ArrowUp, ArrowDown } from "lucide-react"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PortfolioValueChart } from "@/components/investments/PortfolioValueChart"
import { PortfolioChartRangeSelector } from "@/components/investments/PortfolioChartRangeSelector"
import {
  DEFAULT_PORTFOLIO_CHART_RANGE,
  type PortfolioChartRange,
} from "@/lib/constants/portfolio-chart-range"
import { PortfolioAllocationChart } from "@/components/investments/PortfolioAllocationChart"
import { ClockWidget } from "@/components/dashboard/ClockWidget"
import { MarketCalendarWidget } from "@/components/dashboard/MarketCalendarWidget"
import { TopFlopWidget } from "@/components/dashboard/TopFlopWidget"
import { HouseholdSummaryWidget } from "@/components/dashboard/HouseholdSummaryWidget"
import { CurrencyExposureWidget } from "@/components/dashboard/CurrencyExposureWidget"
import { NetWorthWidget } from "@/components/dashboard/NetWorthWidget"
import { DividendSummaryWidget } from "@/components/dashboard/DividendSummaryWidget"
import { PortfolioSnapshotWidget } from "@/components/dashboard/PortfolioSnapshotWidget"
import { WidgetManager } from "@/components/dashboard/WidgetManager"
import { useAssets } from "@/hooks/useAssets"
import { useDashboardSummary } from "@/hooks/useHousehold"
import { useWidgets, useSaveWidgets, DEFAULT_LAYOUT, WIDGET_REGISTRY } from "@/hooks/useWidgets"
import { getGainLossPercent, getCurrentValue } from "@/lib/utils/calculations"
import { useI18n } from "@/i18n/context"
import { assetTypeLabel } from "@/i18n/messages"
import { GridLayout, useContainerWidth } from "react-grid-layout"
import type { Layout, LayoutItem } from "react-grid-layout"
import "react-grid-layout/css/styles.css"
import "react-resizable/css/styles.css"

const DASHBOARD_GRID_CONFIG = {
  cols: 12,
  rowHeight: 80,
  margin: [12, 12] as const,
  containerPadding: [0, 0] as const,
}

const DASHBOARD_DRAG_CONFIG = {
  handle: ".drag-handle",
}

// ─── Widget-Inhalte ───────────────────────────────────────────────────────────

function KpiCardsWidget({ assets, summary }: {
  assets: ReturnType<typeof useAssets>["data"]
  summary: ReturnType<typeof useDashboardSummary>["data"]
}) {
  const { t, formatMoney } = useI18n()
  const gainLoss = summary?.portfolioGainLoss ?? 0
  const positionCount = summary?.positionCount ?? 0
  return (
    <div className="grid grid-cols-1 gap-3 p-1 h-full content-start sm:grid-cols-2">
      <Card className="border-0 shadow-none bg-muted/30">
        <CardContent className="pt-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-muted-foreground">{t("dashboard.portfolioValue")}</p>
            <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <p className="text-xl font-bold">{formatMoney(summary?.portfolioTotal ?? 0)}</p>
          <p className="text-xs text-muted-foreground">
            {positionCount} {positionCount !== 1 ? t("common.positions") : t("common.position")}
          </p>
        </CardContent>
      </Card>
      <Card className="border-0 shadow-none bg-muted/30">
        <CardContent className="pt-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-muted-foreground">{t("dashboard.totalGainLoss")}</p>
            {gainLoss >= 0
              ? <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
              : <TrendingDown className="h-3.5 w-3.5 text-muted-foreground" />}
          </div>
          <p className={`text-xl font-bold ${gainLoss > 0 ? "text-green-500" : gainLoss < 0 ? "text-red-500" : ""}`}>
            {gainLoss >= 0 ? "+" : ""}{formatMoney(gainLoss)}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function ValueChartWidget({ assets }: { assets: NonNullable<ReturnType<typeof useAssets>["data"]> }) {
  const [range, setRange] = useState<PortfolioChartRange>(DEFAULT_PORTFOLIO_CHART_RANGE)
  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <PortfolioChartRangeSelector value={range} onChange={setRange} />
      <div className="min-h-0 flex-1">
        <PortfolioValueChart assets={assets} range={range} />
      </div>
    </div>
  )
}

function PositionsTableWidget({ assets }: { assets: NonNullable<ReturnType<typeof useAssets>["data"]> }) {
  const { locale, formatMoney, formatNumber } = useI18n()
  const sorted = [...assets]
    .map((a) => ({
      ...a,
      gainLossPct: getGainLossPercent(a, a.entries),
      value: getCurrentValue(a, a.entries),
    }))
    .sort((a, b) => b.gainLossPct - a.gainLossPct)

  return (
    <div className="overflow-auto h-full">
      <div className="space-y-1 p-1">
        {sorted.map((a) => {
          const isPos = a.gainLossPct > 0
          const isNeg = a.gainLossPct < 0
          return (
            <div key={a.id} className="flex items-center justify-between gap-2 py-1.5 border-b last:border-0">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{a.name}</p>
                <p className="text-xs text-muted-foreground">{a.ticker} · {assetTypeLabel(locale, a.type)}</p>
              </div>
              <div className="text-right shrink-0">
                <div className={`flex items-center gap-1 justify-end text-sm font-medium ${isPos ? "text-green-500" : isNeg ? "text-red-500" : "text-muted-foreground"}`}>
                  {isPos ? <TrendingUp className="h-3.5 w-3.5" /> : isNeg ? <TrendingDown className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                  {isPos ? "+" : ""}{formatNumber(a.gainLossPct, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                </div>
                <p className="text-xs text-muted-foreground">{formatMoney(a.value)}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Widget-Wrapper ───────────────────────────────────────────────────────────

function WidgetShell({ title, children, badge, onRemove, onMoveUp, onMoveDown }: {
  title: string
  children: React.ReactNode
  badge?: string
  onRemove?: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
}) {
  const { t } = useI18n()
  return (
    <Card className="h-full overflow-hidden flex flex-col">
      <div className="py-2 px-3 flex items-center justify-between shrink-0 border-b gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="drag-handle hidden cursor-grab text-muted-foreground hover:text-foreground shrink-0 sm:inline-flex">
            <GripVertical className="h-3.5 w-3.5" />
          </span>
          <CardTitle className="text-sm font-medium truncate">{title}</CardTitle>
          {badge !== undefined && <Badge variant="secondary" className="text-xs shrink-0">{badge}</Badge>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {(onMoveUp || onMoveDown) && (
            <div className="flex items-center gap-1 sm:hidden">
              <button
                type="button"
                onClick={onMoveUp}
                disabled={!onMoveUp}
                className="flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
                aria-label={t("dashboard.moveWidgetUp")}
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onMoveDown}
                disabled={!onMoveDown}
                className="flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
                aria-label={t("dashboard.moveWidgetDown")}
              >
                <ArrowDown className="h-4 w-4" />
              </button>
            </div>
          )}
          {onRemove && (
            <button
              onClick={onRemove}
              className="flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground sm:h-auto sm:w-auto"
              aria-label={t("dashboard.removeWidget")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      <CardContent className="flex-1 overflow-hidden p-2 min-h-0">
        {children}
      </CardContent>
    </Card>
  )
}

function autoSortLayout(layout: LayoutItem[]): LayoutItem[] {
  const sorted = [...layout].sort((a, b) => a.y !== b.y ? a.y - b.y : a.x - b.x)
  const result: LayoutItem[] = []
  let curX = 0, curY = 0, rowH = 0
  for (const item of sorted) {
    if (curX + item.w > 12) { curX = 0; curY += rowH; rowH = 0 }
    result.push({ ...item, x: curX, y: curY })
    curX += item.w
    rowH = Math.max(rowH, item.h)
  }
  return result
}

function sortLayoutForDisplay(layout: LayoutItem[]): LayoutItem[] {
  return [...layout].sort((a, b) => a.y !== b.y ? a.y - b.y : a.x - b.x)
}

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────

export function DashboardContent() {
  const { t } = useI18n()
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary()
  const { data: assets, isLoading: assetsLoading } = useAssets()
  const { data: savedLayout, isLoading: widgetsLoading } = useWidgets()
  const saveWidgets = useSaveWidgets()

  const [layout, setLayout] = useState<LayoutItem[]>(() => savedLayout ?? DEFAULT_LAYOUT)
  const [layoutReady, setLayoutReady] = useState(() => !!savedLayout)
  const [managerOpen, setManagerOpen] = useState(false)
  const {
    width: containerWidth,
    containerRef,
    mounted: widthReady,
  } = useContainerWidth({ measureBeforeMount: true, initialWidth: 1200 })

  // Beide State-Updates im gleichen Batch: kein Flash von DEFAULT_LAYOUT
  useEffect(() => {
    if (savedLayout) {
      setLayout(savedLayout)
      setLayoutReady(true)
    }
  }, [savedLayout])

  // Nur State-Update — kein Speichern hier (feuert auch bei Prop-Änderungen)
  const handleLayoutChange = useCallback((newLayout: Layout) => {
    setLayout([...newLayout] as LayoutItem[])
  }, [])

  // Speichern nur nach abgeschlossenem Drag oder Resize
  const handleDragStop = useCallback((newLayout: Layout) => {
    saveWidgets.mutate([...newLayout] as LayoutItem[])
  }, [saveWidgets])

  const handleResizeStop = useCallback((newLayout: Layout) => {
    saveWidgets.mutate([...newLayout] as LayoutItem[])
  }, [saveWidgets])

  const handleAutoSort = useCallback(() => {
    const sorted = autoSortLayout(layout)
    setLayout(sorted)
    saveWidgets.mutate(sorted)
  }, [layout, saveWidgets])

  const handleToggleWidget = useCallback((widgetId: string) => {
    const exists = layout.some((l) => l.i === widgetId)
    if (exists) {
      const sorted = autoSortLayout(layout.filter((l) => l.i !== widgetId))
      setLayout(sorted)
      fetch("/api/dashboard/widgets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ widgetId }),
      }).catch(() => {})
      saveWidgets.mutate(sorted)
    } else {
      const reg = WIDGET_REGISTRY[widgetId]
      const maxY = layout.reduce((m, l) => Math.max(m, l.y + l.h), 0)
      const next = [...layout, { i: widgetId, x: 0, y: maxY, w: reg?.defaultW ?? 6, h: reg?.defaultH ?? 4 }]
      setLayout(next)
      saveWidgets.mutate(next)
    }
  }, [layout, saveWidgets])

  const handleMoveMobileWidget = useCallback((widgetId: string, direction: "up" | "down") => {
    const ordered = sortLayoutForDisplay(layout)
    const index = ordered.findIndex((item) => item.i === widgetId)
    const targetIndex = direction === "up" ? index - 1 : index + 1
    if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) return

    const current = ordered[index]
    const target = ordered[targetIndex]
    const next = layout.map((item) => {
      if (item.i === current.i) {
        return { ...item, x: target.x, y: target.y, w: target.w, h: target.h }
      }
      if (item.i === target.i) {
        return { ...item, x: current.x, y: current.y, w: current.w, h: current.h }
      }
      return item
    })

    setLayout(next)
    saveWidgets.mutate(next)
  }, [layout, saveWidgets])

  const hasAssets = (assets?.length ?? 0) > 0
  const isLoading = summaryLoading || assetsLoading
  const isMobile = containerWidth < 640
  const displayLayout = sortLayoutForDisplay(layout)

  function widgetTitle(widgetId: string) {
    const key = WIDGET_REGISTRY[widgetId]?.titleKey
    return key ? t(key) : widgetId
  }

  function renderWidget(widgetId: string, mobileControls?: { onMoveUp?: () => void; onMoveDown?: () => void }) {
    const remove = () => handleToggleWidget(widgetId)
    const title = widgetTitle(widgetId)
    const loading = <div className="text-muted-foreground text-sm p-2">{t("common.loading")}</div>
    const shellControls = { onRemove: remove, ...mobileControls }
    switch (widgetId) {
      case "kpi-cards":
        return (
          <WidgetShell key={widgetId} title={title} {...shellControls}>
            {isLoading ? loading : <KpiCardsWidget assets={assets} summary={summary} />}
          </WidgetShell>
        )
      case "value-chart":
        return (
          <WidgetShell key={widgetId} title={title} {...shellControls}>
            {isLoading ? loading
              : hasAssets ? <ValueChartWidget assets={assets!} />
              : <EmptyAssets />}
          </WidgetShell>
        )
      case "allocation-chart":
        return (
          <WidgetShell key={widgetId} title={title} {...shellControls}>
            {isLoading ? loading
              : hasAssets
                ? <Suspense fallback={null}><PortfolioAllocationChart assets={assets!} /></Suspense>
                : <EmptyAssets />}
          </WidgetShell>
        )
      case "positions-table":
        return (
          <WidgetShell key={widgetId} title={title} badge={String(assets?.length ?? 0)} {...shellControls}>
            {isLoading ? loading
              : hasAssets ? <PositionsTableWidget assets={assets!} />
              : <EmptyAssets />}
          </WidgetShell>
        )
      case "clock":
        return <WidgetShell key={widgetId} title={title} {...shellControls}><ClockWidget /></WidgetShell>
      case "market-calendar":
        return <WidgetShell key={widgetId} title={title} {...shellControls}><MarketCalendarWidget /></WidgetShell>
      case "top-flop":
        return (
          <WidgetShell key={widgetId} title={title} {...shellControls}>
            {isLoading ? loading
              : <TopFlopWidget assets={assets ?? []} />}
          </WidgetShell>
        )
      case "household-summary":
        return (
          <WidgetShell key={widgetId} title={title} {...shellControls}>
            <HouseholdSummaryWidget />
          </WidgetShell>
        )
      case "currency-exposure":
        return (
          <WidgetShell key={widgetId} title={title} {...shellControls}>
            {isLoading ? loading
              : hasAssets ? <CurrencyExposureWidget assets={assets!} />
              : <EmptyAssets />}
          </WidgetShell>
        )
      case "net-worth":
        return (
          <WidgetShell key={widgetId} title={title} {...shellControls}>
            <NetWorthWidget portfolioTotal={summary?.portfolioTotal ?? 0} />
          </WidgetShell>
        )
      case "dividend-summary":
        return (
          <WidgetShell key={widgetId} title={title} {...shellControls}>
            <DividendSummaryWidget />
          </WidgetShell>
        )
      case "portfolio-snapshot":
        return (
          <WidgetShell key={widgetId} title={title} {...shellControls}>
            <PortfolioSnapshotWidget />
          </WidgetShell>
        )
      default:
        return <div key={widgetId} />
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t("dashboard.title")}</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleAutoSort} className="hidden sm:inline-flex">
            <AlignJustify className="h-4 w-4 mr-2" />{t("dashboard.sort")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setManagerOpen(true)}>
            <Settings2 className="h-4 w-4 mr-2" />{t("dashboard.widgets")}
          </Button>
        </div>
      </div>

      <div ref={containerRef} className="w-full">
        {widgetsLoading || !layoutReady || !widthReady ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">{t("dashboard.loadingDashboard")}</div>
        ) : isMobile ? (
          <div className="space-y-3">
            {displayLayout.map((l, index) => (
              <div key={l.i}>
                {renderWidget(l.i, {
                  onMoveUp: index > 0 ? () => handleMoveMobileWidget(l.i, "up") : undefined,
                  onMoveDown: index < displayLayout.length - 1 ? () => handleMoveMobileWidget(l.i, "down") : undefined,
                })}
              </div>
            ))}
          </div>
        ) : (
          <GridLayout
            layout={layout}
            width={containerWidth}
            gridConfig={DASHBOARD_GRID_CONFIG}
            dragConfig={DASHBOARD_DRAG_CONFIG}
            onLayoutChange={handleLayoutChange}
            onDragStop={handleDragStop}
            onResizeStop={handleResizeStop}
          >
            {layout.map((l) => (
              <div key={l.i}>
                {renderWidget(l.i)}
              </div>
            ))}
          </GridLayout>
        )}
      </div>

      <WidgetManager
        open={managerOpen}
        onClose={() => setManagerOpen(false)}
        layout={layout}
        onToggle={handleToggleWidget}
      />
    </div>
  )
}

function EmptyAssets() {
  const { t } = useI18n()
  return (
    <div className="flex flex-col items-center justify-center h-full gap-2">
      <BarChart3 className="h-8 w-8 text-muted-foreground" />
      <p className="text-xs text-muted-foreground">{t("dashboard.noInvestments")}</p>
    </div>
  )
}
