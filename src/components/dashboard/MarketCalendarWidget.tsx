"use client"

import { format } from "date-fns"
import { CalendarDays, TrendingUp, DollarSign } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useMarketCalendar } from "@/hooks/useWidgets"
import { useI18n } from "@/i18n/context"

export function MarketCalendarWidget() {
  const { t, getDateFnsLocale } = useI18n()
  const { data: events, isLoading } = useMarketCalendar()
  const dateFnsLocale = getDateFnsLocale()

  if (isLoading) {
    return <div className="flex items-center justify-center h-full text-muted-foreground text-sm">{t("investments.loadingCalendar")}</div>
  }

  if (!events || events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
        <CalendarDays className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t("investments.noCalendarEvents")}</p>
      </div>
    )
  }

  return (
    <div className="overflow-auto h-full">
      <div className="space-y-2 p-1">
        {events.map((event, i) => (
          <div key={i} className="flex items-center gap-3 py-1.5 border-b last:border-0">
            <div className={`flex-shrink-0 p-1.5 rounded-md ${event.type === "earnings" ? "bg-blue-500/10 text-blue-500" : "bg-green-500/10 text-green-500"}`}>
              {event.type === "earnings"
                ? <TrendingUp className="h-3.5 w-3.5" />
                : <DollarSign className="h-3.5 w-3.5" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{event.name}</p>
              <p className="text-xs text-muted-foreground">{event.ticker}</p>
            </div>
            <div className="text-right shrink-0">
              <Badge variant="outline" className="text-xs">
                {event.type === "earnings" ? t("investments.earningsReport") : t("investments.exDividend")}
              </Badge>
              <p className="text-xs text-muted-foreground mt-0.5">
                {format(new Date(event.date), "dd. MMM", { locale: dateFnsLocale })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
