"use client"

import { Check, LayoutGrid, Clock, TrendingUp, PieChart, List, CalendarDays, DollarSign } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { WIDGET_REGISTRY } from "@/hooks/useWidgets"
import { useI18n } from "@/i18n/context"
import type { MessageKey } from "@/i18n/messages"
import type { LayoutItem } from "react-grid-layout"

const WIDGET_ICONS: Record<string, React.ElementType> = {
  "kpi-cards":        LayoutGrid,
  "value-chart":      TrendingUp,
  "allocation-chart": PieChart,
  "positions-table":  List,
  "clock":            Clock,
  "market-calendar":  CalendarDays,
  "dividend-summary": DollarSign,
  "portfolio-snapshot": TrendingUp,
}

const WIDGET_TITLE_KEYS: Record<string, MessageKey> = {
  "kpi-cards": "widgets.kpiCards",
  "value-chart": "widgets.valueChart",
  "allocation-chart": "widgets.allocationChart",
  "positions-table": "widgets.positionsTable",
  "clock": "widgets.clock",
  "market-calendar": "widgets.marketCalendar",
  "top-flop": "widgets.topFlop",
  "household-summary": "widgets.householdSummary",
  "currency-exposure": "widgets.currencyExposure",
  "net-worth": "widgets.netWorth",
  "dividend-summary": "widgets.dividendSummary",
  "portfolio-snapshot": "widgets.portfolioSnapshot",
}

interface Props {
  open: boolean
  onClose: () => void
  layout: LayoutItem[]
  onToggle: (widgetId: string) => void
}

export function WidgetManager({ open, onClose, layout, onToggle }: Props) {
  const { t } = useI18n()
  const activeIds = new Set(layout.map((l) => l.i))

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("dashboard.widgetManagerTitle")}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2">{t("dashboard.widgetManagerDescription")}</p>
        <div className="grid grid-cols-2 gap-2 pt-1">
          {Object.entries(WIDGET_REGISTRY).map(([id]) => {
            const Icon = WIDGET_ICONS[id] ?? LayoutGrid
            const isActive = activeIds.has(id)
            const titleKey = WIDGET_TITLE_KEYS[id]
            return (
              <button
                key={id}
                onClick={() => onToggle(id)}
                className={cn(
                  "flex flex-col items-start gap-1.5 p-3 rounded-lg border text-left transition-colors",
                  isActive
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <Icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
                  {isActive && <Check className="h-3.5 w-3.5 text-primary" />}
                </div>
                <span className={cn("text-sm font-medium", !isActive && "text-muted-foreground")}>
                  {titleKey ? t(titleKey) : id}
                </span>
              </button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
