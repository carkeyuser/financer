import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { LayoutItem } from "react-grid-layout"
import type { CalendarEvent } from "@/lib/services/nasdaq-calendar"

export interface WidgetLayoutItem {
  id: string
  userId: string
  widgetId: string
  x: number
  y: number
  w: number
  h: number
}

export const WIDGET_REGISTRY: Record<string, { titleKey: string; defaultW: number; defaultH: number }> = {
  "kpi-cards":           { titleKey: "widgets.kpiCards",       defaultW: 12, defaultH: 2 },
  "value-chart":         { titleKey: "widgets.valueChart",     defaultW: 12, defaultH: 5 },
  "allocation-chart":    { titleKey: "widgets.allocationChart", defaultW: 6,  defaultH: 5 },
  "positions-table":     { titleKey: "widgets.positionsTable", defaultW: 6,  defaultH: 5 },
  "clock":               { titleKey: "widgets.clock",          defaultW: 4,  defaultH: 2 },
  "market-calendar":     { titleKey: "widgets.marketCalendar", defaultW: 8,  defaultH: 5 },
  "top-flop":            { titleKey: "widgets.topFlop",        defaultW: 6,  defaultH: 4 },
  "household-summary":   { titleKey: "widgets.householdSummary", defaultW: 6,  defaultH: 4 },
  "currency-exposure":   { titleKey: "widgets.currencyExposure", defaultW: 5,  defaultH: 5 },
  "net-worth":           { titleKey: "widgets.netWorth",       defaultW: 4,  defaultH: 3 },
  "dividend-summary":    { titleKey: "widgets.dividendSummary", defaultW: 5,  defaultH: 3 },
}

export const DEFAULT_LAYOUT: LayoutItem[] = [
  { i: "kpi-cards",        x: 0, y: 0, w: 12, h: 2 },
  { i: "value-chart",      x: 0, y: 2, w: 12, h: 5 },
  { i: "allocation-chart", x: 0, y: 7, w: 6,  h: 5 },
  { i: "positions-table",  x: 6, y: 7, w: 6,  h: 5 },
]

export function useWidgets() {
  return useQuery({
    queryKey: ["dashboard-widgets"],
    staleTime: Infinity,
    queryFn: async (): Promise<LayoutItem[]> => {
      const res = await fetch("/api/dashboard/widgets")
      if (!res.ok) return DEFAULT_LAYOUT
      const data: WidgetLayoutItem[] = await res.json()
      if (data.length === 0) return DEFAULT_LAYOUT
      return data.map((d) => ({ i: d.widgetId, x: d.x, y: d.y, w: d.w, h: d.h }) as LayoutItem)
    },
  })
}

export function useSaveWidgets() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (layout: LayoutItem[]) => {
      const body = layout.map((l) => ({ widgetId: l.i, x: l.x, y: l.y, w: l.w, h: l.h }))
      await fetch("/api/dashboard/widgets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    },
    onSuccess: (_, layout) => {
      queryClient.setQueryData<LayoutItem[]>(["dashboard-widgets"], layout)
    },
  })
}

export function useMarketCalendar() {
  return useQuery({
    queryKey: ["market-calendar"],
    queryFn: async (): Promise<CalendarEvent[]> => {
      const res = await fetch("/api/dashboard/market-calendar")
      if (!res.ok) return []
      return res.json()
    },
    staleTime: 60 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  })
}
