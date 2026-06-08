"use client"

import { format } from "date-fns"
import {
  CalendarDays,
  DollarSign,
  PiggyBank,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from "lucide-react"
import { Area, AreaChart, ResponsiveContainer } from "recharts"
import type { TodayBriefing } from "@/hooks/useDailyHabit"
import type { useI18n } from "@/i18n/context"
import { deriveMarketMood, type MarketMood } from "@/lib/ambient/market-mood"
import { cn } from "@/lib/utils"

const CHECKLIST_STEPS = ["INCOME", "PAYOUTS", "TRANSFERS_DONE"] as const

type I18n = ReturnType<typeof useI18n>

function MoodIconDisplay({ mood, className }: { mood: MarketMood; className?: string }) {
  if (mood === "bullish") return <TrendingUp className={className} />
  if (mood === "bearish") return <TrendingDown className={className} />
  if (mood === "calm") return <Zap className={className} />
  return <Wallet className={className} />
}

function PanelShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("ambient-panel w-full animate-in fade-in duration-700", className)}>
      {children}
    </div>
  )
}

export function AmbientClockPanel({
  briefing,
  timeStr,
  dateStr,
  t,
  formatNumber,
}: {
  briefing: TodayBriefing | undefined
  timeStr: string
  dateStr: string
  t: I18n["t"]
  formatNumber: I18n["formatNumber"]
}) {
  const moodPositions = briefing
    ? [
        ...briefing.topFlop.top.map((p) => ({ gainLossPct: p.gainLossPct })),
        ...briefing.topFlop.flop.map((p) => ({ gainLossPct: p.gainLossPct })),
      ]
    : []
  const mood = deriveMarketMood(moodPositions)

  return (
    <PanelShell className="max-w-3xl text-center">
      <p className="ambient-clock text-6xl font-mono font-bold tabular-nums tracking-tight sm:text-8xl">
        {timeStr}
      </p>
      <p className="mt-3 text-lg text-muted-foreground sm:text-xl">{dateStr}</p>
      <div className="mt-10 flex flex-col items-center gap-3">
        <MoodIconDisplay
          mood={mood}
          className={cn(
            "h-12 w-12",
            mood === "bullish" && "text-[var(--gain)]",
            mood === "bearish" && "text-[var(--loss)]",
            mood === "calm" && "text-accent",
            mood === "mixed" && "text-primary"
          )}
        />
        <p className="text-2xl font-semibold sm:text-3xl">{t(`ambient.mood.${mood}`)}</p>
        {mood !== "empty" && briefing?.topFlop.top[0] && (
          <p className="max-w-md text-sm text-muted-foreground">
            {briefing.topFlop.top[0].ticker}{" "}
            {briefing.topFlop.top[0].gainLossPct >= 0 ? "+" : ""}
            {formatNumber(briefing.topFlop.top[0].gainLossPct, { maximumFractionDigits: 1 })} %
          </p>
        )}
        {mood === "empty" && (
          <p className="text-sm text-muted-foreground">{t("ambient.moodHint")}</p>
        )}
      </div>
    </PanelShell>
  )
}

export function AmbientPortfolioPanel({
  briefing,
  series,
  t,
  formatMoney,
  formatNumber,
}: {
  briefing: TodayBriefing | undefined
  series: { date: string; totalEur: number }[]
  t: I18n["t"]
  formatMoney: I18n["formatMoney"]
  formatNumber: I18n["formatNumber"]
}) {
  const portfolio = briefing && !("error" in briefing.portfolio) ? briefing.portfolio : null
  const delta = portfolio?.sinceYesterday
  const hasDelta = delta?.deltaEur != null && delta?.deltaPercent != null
  const positive = (delta?.deltaEur ?? 0) >= 0

  return (
    <PanelShell className="max-w-2xl text-center">
      <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
        {t("ambient.portfolioPulse")}
      </p>
      {hasDelta ? (
        <p
          className={cn(
            "mt-4 flex flex-wrap items-center justify-center gap-2 text-4xl font-bold sm:text-6xl",
            positive ? "text-[var(--gain)]" : "text-[var(--loss)]"
          )}
        >
          {positive ? <TrendingUp className="h-10 w-10" /> : <TrendingDown className="h-10 w-10" />}
          {positive ? "+" : ""}
          {formatMoney(delta!.deltaEur!)}
          <span className="text-2xl font-normal sm:text-3xl">
            ({positive ? "+" : ""}
            {formatNumber(delta!.deltaPercent!, { maximumFractionDigits: 2 })} %)
          </span>
        </p>
      ) : (
        <p className="mt-6 text-xl text-muted-foreground">{t("today.noComparison")}</p>
      )}
      {delta?.current != null && (
        <p className="mt-4 text-2xl text-muted-foreground">{formatMoney(delta.current)}</p>
      )}
      {portfolio && (
        <p className="mt-2 text-sm text-muted-foreground">
          {t("dashboard.totalGainLoss")}:{" "}
          <span className={portfolio.portfolioGainLoss >= 0 ? "text-[var(--gain)]" : "text-[var(--loss)]"}>
            {portfolio.portfolioGainLoss >= 0 ? "+" : ""}
            {formatMoney(portfolio.portfolioGainLoss)} (
            {formatNumber(portfolio.portfolioGainLossPercent, { maximumFractionDigits: 2 })} %)
          </span>
        </p>
      )}
      {series.length > 1 && (
        <div className="mt-8 h-32 w-full sm:h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series}>
              <Area
                type="monotone"
                dataKey="totalEur"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.2}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </PanelShell>
  )
}

export function AmbientTopFlopPanel({
  briefing,
  t,
  formatNumber,
  formatMoney,
}: {
  briefing: TodayBriefing
  t: I18n["t"]
  formatNumber: I18n["formatNumber"]
  formatMoney: I18n["formatMoney"]
}) {
  return (
    <PanelShell className="max-w-2xl">
      <p className="text-center text-sm uppercase tracking-[0.2em] text-muted-foreground">
        {t("today.topFlop")}
      </p>
      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <div className="rounded-lg border border-[var(--gain)]/30 bg-card/40 p-4 backdrop-blur-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--gain)]">
            {t("investments.topN", { n: 3 })}
          </p>
          {briefing.topFlop.top.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("common.noData")}</p>
          ) : (
            <ul className="space-y-3">
              {briefing.topFlop.top.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.ticker}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.name}</p>
                  </div>
                  <span className="shrink-0 text-right text-[var(--gain)]">
                    +{formatNumber(item.gainLossPct, { maximumFractionDigits: 2 })} %
                    <span className="block text-xs text-muted-foreground">
                      {formatMoney(item.gainLossEur)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-lg border border-[var(--loss)]/30 bg-card/40 p-4 backdrop-blur-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--loss)]">
            {t("investments.flopN", { n: 3 })}
          </p>
          {briefing.topFlop.flop.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("common.noData")}</p>
          ) : (
            <ul className="space-y-3">
              {briefing.topFlop.flop.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.ticker}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.name}</p>
                  </div>
                  <span className="shrink-0 text-right text-[var(--loss)]">
                    {formatNumber(item.gainLossPct, { maximumFractionDigits: 2 })} %
                    <span className="block text-xs text-muted-foreground">
                      {formatMoney(item.gainLossEur)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </PanelShell>
  )
}

export function AmbientCalendarPanel({
  briefing,
  t,
  dateFnsLocale,
}: {
  briefing: TodayBriefing
  t: I18n["t"]
  dateFnsLocale: ReturnType<I18n["getDateFnsLocale"]>
}) {
  const events = briefing.calendar.events.slice(0, 6)

  return (
    <PanelShell className="max-w-xl">
      <div className="flex items-center justify-center gap-2 text-muted-foreground">
        <CalendarDays className="h-5 w-5" />
        <p className="text-sm uppercase tracking-[0.2em]">{t("today.calendar")}</p>
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        {t("today.calendarPortfolioHint")}
      </p>
      {events.length === 0 ? (
        <p className="mt-10 text-center text-muted-foreground">{t("today.calendarEmpty")}</p>
      ) : (
        <ul className="mt-8 space-y-3">
          {events.map((event, i) => (
            <li
              key={`${event.ticker}-${event.date}-${i}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-card/40 px-4 py-3 backdrop-blur-sm"
            >
              <div className="min-w-0">
                <p className="font-medium truncate">{event.name}</p>
                <p className="text-sm text-primary">{event.ticker}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs font-medium text-accent">
                  {event.type === "earnings"
                    ? t("investments.earningsReport")
                    : t("investments.exDividend")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(event.date), "dd. MMM", { locale: dateFnsLocale })}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </PanelShell>
  )
}

export function AmbientDividendsPanel({
  briefing,
  t,
  formatMoney,
  formatDate,
}: {
  briefing: TodayBriefing
  t: I18n["t"]
  formatMoney: I18n["formatMoney"]
  formatDate: I18n["formatDate"]
}) {
  const { kpis, upcoming } = briefing.dividends

  return (
    <PanelShell className="max-w-xl">
      <div className="flex items-center justify-center gap-2 text-muted-foreground">
        <DollarSign className="h-5 w-5" />
        <p className="text-sm uppercase tracking-[0.2em]">{t("today.dividends")}</p>
      </div>
      <div className="mt-8 grid grid-cols-2 gap-4 text-center">
        <div className="rounded-lg border border-primary/25 bg-card/40 p-4 backdrop-blur-sm">
          <p className="text-xs text-muted-foreground">{t("today.monthTotal")}</p>
          <p className="mt-1 text-2xl font-bold text-primary">{formatMoney(kpis.currentMonth)}</p>
        </div>
        <div className="rounded-lg border border-primary/25 bg-card/40 p-4 backdrop-blur-sm">
          <p className="text-xs text-muted-foreground">{t("ambient.dividendsYear")}</p>
          <p className="mt-1 text-2xl font-bold">{formatMoney(kpis.totalYear)}</p>
        </div>
      </div>
      {upcoming.length > 0 ? (
        <ul className="mt-6 space-y-2">
          <p className="text-xs text-muted-foreground">{t("today.upcomingDividends")}</p>
          {upcoming.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between gap-2 rounded-md border border-primary/15 bg-card/30 px-3 py-2 text-sm"
            >
              <span className="truncate font-medium">{d.ticker}</span>
              <span className="shrink-0 text-muted-foreground">
                {formatDate(d.date)} · {formatMoney(d.amount)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          {t("ambient.dividendsNoneUpcoming")}
        </p>
      )}
    </PanelShell>
  )
}

export function AmbientChecklistPanel({
  briefing,
  monthLabel,
  t,
}: {
  briefing: TodayBriefing
  monthLabel: string
  t: I18n["t"]
}) {
  return (
    <PanelShell className="max-w-xl">
      <div className="flex items-center justify-center gap-2 text-muted-foreground">
        <Users className="h-5 w-5" />
        <p className="text-sm uppercase tracking-[0.2em]">{t("ambient.householdRitual")}</p>
      </div>
      <p className="mt-2 text-center text-2xl font-semibold">{monthLabel}</p>
      <p className="mt-1 text-center text-sm text-muted-foreground">
        {briefing.household.status === "fertig"
          ? t("householdFinance.legendDone")
          : briefing.household.status === "vorkalkuliert"
            ? t("householdFinance.legendEstimated")
            : t("householdFinance.legendEmpty")}
      </p>
      <div className="mt-8 space-y-4">
        {briefing.checklist.members.map((member) => {
          const done = new Set(member.completedSteps)
          const allDone = CHECKLIST_STEPS.every((s) => done.has(s))
          const progress = CHECKLIST_STEPS.filter((s) => done.has(s)).length
          return (
            <div
              key={member.userId}
              className="rounded-lg border border-primary/25 bg-card/50 px-5 py-4 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-lg font-medium">{member.name}</p>
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium",
                    allDone
                      ? "bg-[var(--gain)]/15 text-[var(--gain)]"
                      : "bg-amber-500/15 text-amber-400"
                  )}
                >
                  {allDone
                    ? t("householdFinance.checklistPartnerDone")
                    : t("householdFinance.checklistPartnerOpen")}
                </span>
              </div>
              <div className="mt-3 flex gap-2">
                {CHECKLIST_STEPS.map((step) => (
                  <span
                    key={step}
                    className={cn(
                      "h-2 flex-1 rounded-full transition-colors",
                      done.has(step) ? "bg-primary" : "bg-muted"
                    )}
                  />
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {progress}/{CHECKLIST_STEPS.length} {t("ambient.stepsDone")}
              </p>
            </div>
          )
        })}
      </div>
    </PanelShell>
  )
}

export function AmbientHouseholdFinancePanel({
  briefing,
  monthLabel,
  t,
  formatMoney,
}: {
  briefing: TodayBriefing
  monthLabel: string
  t: I18n["t"]
  formatMoney: I18n["formatMoney"]
}) {
  const { household } = briefing
  const statusLabel =
    household.status === "fertig"
      ? t("householdFinance.legendDone")
      : household.status === "vorkalkuliert"
        ? t("householdFinance.legendEstimated")
        : t("householdFinance.legendEmpty")

  return (
    <PanelShell className="max-w-xl text-center">
      <div className="flex items-center justify-center gap-2 text-muted-foreground">
        <PiggyBank className="h-5 w-5" />
        <p className="text-sm uppercase tracking-[0.2em]">{t("today.household")}</p>
      </div>
      <p className="mt-2 text-2xl font-semibold">{monthLabel}</p>
      <p className="mt-1 text-sm text-accent">{statusLabel}</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-primary/25 bg-card/40 p-5 backdrop-blur-sm">
          <p className="text-xs text-muted-foreground">{t("ambient.householdIncome")}</p>
          <p className="mt-2 text-3xl font-bold">{formatMoney(household.combinedIncome)}</p>
        </div>
        <div className="rounded-lg border border-primary/25 bg-card/40 p-5 backdrop-blur-sm">
          <p className="text-xs text-muted-foreground">{t("ambient.householdRemainder")}</p>
          <p
            className={cn(
              "mt-2 text-3xl font-bold",
              household.remainder >= 0 ? "text-[var(--gain)]" : "text-[var(--loss)]"
            )}
          >
            {formatMoney(household.remainder)}
          </p>
        </div>
      </div>
      {household.transfers.length > 0 && (
        <div className="mt-6 rounded-lg border border-accent/30 bg-card/30 p-4 text-left">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("today.transfersDue")}
          </p>
          <ul className="mt-3 space-y-2">
            {household.transfers.map((tr) => (
              <li key={tr.userId} className="flex justify-between text-sm">
                <span>{tr.userName ?? t("common.dash")}</span>
                <span className="font-medium text-primary">{formatMoney(tr.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </PanelShell>
  )
}
