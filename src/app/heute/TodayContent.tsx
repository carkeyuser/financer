"use client"

import Link from "next/link"
import { useEffect, useMemo } from "react"
import { format } from "date-fns"
import { CalendarDays, PiggyBank, TrendingDown, TrendingUp, Wallet } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MonthChecklistSection } from "@/components/household-finance/MonthChecklistSection"
import { useTodayBriefing } from "@/hooks/useDailyHabit"
import { useI18n } from "@/i18n/context"
import { useSession } from "next-auth/react"

const VISIT_KEY = "financer:lastTodayVisit"

export function TodayContent() {
  const { t, formatMoney, formatNumber, formatDate, getDateFnsLocale } = useI18n()
  const { data: session } = useSession()
  const { data, isLoading, isError } = useTodayBriefing()
  const dateFnsLocale = getDateFnsLocale()

  const lastVisitDelta = useMemo(() => {
    if (!data || "error" in data.portfolio) return null
    const stored = typeof window !== "undefined" ? localStorage.getItem(VISIT_KEY) : null
    if (!stored) return null
    try {
      const prev = JSON.parse(stored) as { total: number; at: string }
      const diff = data.portfolio.portfolioTotal - prev.total
      const pct = prev.total === 0 ? 0 : (diff / prev.total) * 100
      return { diff, pct, at: prev.at }
    } catch {
      return null
    }
  }, [data])

  useEffect(() => {
    if (!data || "error" in data.portfolio) return
    localStorage.setItem(
      VISIT_KEY,
      JSON.stringify({ total: data.portfolio.portfolioTotal, at: new Date().toISOString() })
    )
  }, [data])

  if (isLoading) {
    return <p className="text-muted-foreground">{t("today.loading")}</p>
  }

  if (isError || !data) {
    return <p className="text-destructive">{t("common.error")}</p>
  }

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const statusLabel =
    data.household.status === "fertig"
      ? t("householdFinance.legendDone")
      : data.household.status === "vorkalkuliert"
        ? t("householdFinance.legendEstimated")
        : t("householdFinance.legendEmpty")

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t("today.title")}</h1>
        <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/dashboard" />}>
          {t("today.viewDashboard")}
        </Button>
      </div>

      {/* Portfolio */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            {t("today.portfolio")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {"error" in data.portfolio ? (
            <p className="text-sm text-muted-foreground">{t("today.fxError")}</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-6">
                <div>
                  <p className="text-xs text-muted-foreground">{t("dashboard.portfolioValue")}</p>
                  <p className="text-2xl font-bold">{formatMoney(data.portfolio.portfolioTotal)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("dashboard.totalGainLoss")}</p>
                  <p
                    className={`text-xl font-semibold ${data.portfolio.portfolioGainLoss >= 0 ? "text-green-500" : "text-red-500"}`}
                  >
                    {data.portfolio.portfolioGainLoss >= 0 ? "+" : ""}
                    {formatMoney(data.portfolio.portfolioGainLoss)}
                    <span className="text-sm font-normal ml-1">
                      ({formatNumber(data.portfolio.portfolioGainLossPercent, { maximumFractionDigits: 2 })} %)
                    </span>
                  </p>
                </div>
              </div>
              {data.portfolio.sinceYesterday.deltaEur != null && (
                <p className="text-sm text-muted-foreground">
                  {t("today.sinceYesterday")}:{" "}
                  <span
                    className={
                      data.portfolio.sinceYesterday.deltaEur >= 0 ? "text-green-500" : "text-red-500"
                    }
                  >
                    {data.portfolio.sinceYesterday.deltaEur >= 0 ? "+" : ""}
                    {formatMoney(data.portfolio.sinceYesterday.deltaEur)} (
                    {formatNumber(data.portfolio.sinceYesterday.deltaPercent ?? 0, {
                      maximumFractionDigits: 2,
                    })}{" "}
                    %)
                  </span>
                </p>
              )}
              {lastVisitDelta && (
                <p className="text-sm text-muted-foreground">
                  {t("today.sinceLastVisit")}:{" "}
                  <span className={lastVisitDelta.diff >= 0 ? "text-green-500" : "text-red-500"}>
                    {lastVisitDelta.diff >= 0 ? "+" : ""}
                    {formatMoney(lastVisitDelta.diff)}
                  </span>
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Top / Flop */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("today.topFlop")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-green-500 mb-2">{t("investments.topN", { n: 3 })}</p>
              {data.topFlop.top.map((item) => (
                <Link
                  key={item.id}
                  href={`/investments/${item.id}`}
                  className="flex justify-between py-1 border-b last:border-0 text-sm hover:bg-muted/50 -mx-1 px-1 rounded"
                >
                  <span className="truncate">{item.name}</span>
                  <span className="text-green-500 shrink-0 ml-2">
                    +{formatNumber(item.gainLossPct, { maximumFractionDigits: 2 })}%
                  </span>
                </Link>
              ))}
            </div>
            <div>
              <p className="text-xs font-semibold text-red-500 mb-2">{t("investments.flopN", { n: 3 })}</p>
              {data.topFlop.flop.map((item) => (
                <Link
                  key={item.id}
                  href={`/investments/${item.id}`}
                  className="flex justify-between py-1 border-b last:border-0 text-sm hover:bg-muted/50 -mx-1 px-1 rounded"
                >
                  <span className="truncate">{item.name}</span>
                  <span className="text-red-500 shrink-0 ml-2">
                    {formatNumber(item.gainLossPct, { maximumFractionDigits: 2 })}%
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            {t("today.calendar")}
          </CardTitle>
          <p className="text-xs text-muted-foreground">{t("today.calendarPortfolioHint")}</p>
        </CardHeader>
        <CardContent>
          {data.calendar.events.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("today.calendarEmpty")}</p>
          ) : (
            <ul className="space-y-2">
              {data.calendar.events.map((event, i) => (
                <li key={i} className="flex items-center justify-between gap-2 text-sm border-b pb-2 last:border-0">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{event.name}</p>
                    <p className="text-xs text-muted-foreground">{event.ticker}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant="outline" className="text-xs">
                      {event.type === "earnings"
                        ? t("investments.earningsReport")
                        : t("investments.exDividend")}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(event.date), "dd. MMM", { locale: dateFnsLocale })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Household */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <PiggyBank className="h-4 w-4" />
            {t("today.household")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm">
            {t("today.householdStatus", { month: String(month), status: statusLabel })}
          </p>
          {data.household.transfers.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t("today.transfersDue")}</p>
              <ul className="text-sm space-y-1">
                {data.household.transfers.map((tr) => (
                  <li key={tr.userId} className="flex justify-between">
                    <span>{tr.userName}</span>
                    <span>{formatMoney(tr.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Link href="/haushaltskasse" className="text-sm text-primary hover:underline">
            {t("nav.householdFinance")}
          </Link>
        </CardContent>
      </Card>

      {/* Dividends */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("today.dividends")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm">
            {t("today.monthTotal")}: {formatMoney(data.dividends.kpis.currentMonth)}
          </p>
          {data.dividends.upcoming.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t("today.upcomingDividends")}</p>
              <ul className="text-sm space-y-1">
                {data.dividends.upcoming.map((d) => (
                  <li key={d.id} className="flex justify-between gap-2">
                    <span className="truncate">{d.name}</span>
                    <span className="shrink-0 text-muted-foreground">
                      {formatDate(d.date)} · {formatMoney(d.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <MonthChecklistSection
        year={year}
        month={month}
        currentUserId={session?.user?.id}
      />
    </div>
  )
}
