"use client"

import { CalendarDays, HandCoins } from "lucide-react"
import { useDividendSummary } from "@/hooks/useDividends"
import { useI18n } from "@/i18n/context"

export function DividendSummaryWidget() {
  const { t, formatDate, formatMoney } = useI18n()
  const year = new Date().getFullYear()
  const { data, isLoading } = useDividendSummary(year)
  const nextEvent = data?.events
    .filter((event) => event.status === "EXPECTED")
    .sort((a, b) => a.date.localeCompare(b.date))[0]
  const latestEvent = data?.events[0]
  const focusEvent = nextEvent ?? latestEvent

  if (isLoading) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">{t("common.loading")}</div>
  }

  if (!data) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">{t("common.noData")}</div>
  }

  return (
    <div className="flex h-full flex-col justify-between gap-3 p-1">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">{t("dividends.totalYear")}</p>
          <p className="mt-1 text-lg font-bold text-green-500">{formatMoney(data.kpis.totalYear)}</p>
        </div>
        <div className="rounded-md bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">{t("dividends.currentMonth")}</p>
          <p className="mt-1 text-lg font-bold">{formatMoney(data.kpis.currentMonth)}</p>
        </div>
      </div>
      <div className="rounded-md border p-3">
        {focusEvent ? (
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-green-500/10 p-2 text-green-500">
              <CalendarDays className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{focusEvent.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatDate(focusEvent.date)} · {formatMoney(focusEvent.amount)}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <HandCoins className="h-4 w-4" />
            {t("dividends.noEvents")}
          </div>
        )}
      </div>
    </div>
  )
}
