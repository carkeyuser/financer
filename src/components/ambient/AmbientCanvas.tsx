"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import {
  ArrowLeft,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from "lucide-react"
import { Area, AreaChart, ResponsiveContainer } from "recharts"
import { Button } from "@/components/ui/button"
import { useAssets } from "@/hooks/useAssets"
import { useTodayBriefing, usePortfolioSnapshots } from "@/hooks/useDailyHabit"
import { useI18n } from "@/i18n/context"
import { intlLocale } from "@/i18n/locales"
import {
  AMBIENT_PANEL_COUNT,
  AMBIENT_PANEL_ROTATION_MS,
  deriveMarketMood,
  type MarketMood,
} from "@/lib/ambient/market-mood"
import { disableAmbientKioskTheme, enableAmbientKioskTheme } from "@/lib/ambient/kiosk-theme"
import { cn } from "@/lib/utils"
import { AmbientTickerTape } from "./AmbientTickerTape"

const CHECKLIST_STEPS = ["INCOME", "PAYOUTS", "TRANSFERS_DONE"] as const

function MoodIconDisplay({ mood, className }: { mood: MarketMood; className?: string }) {
  if (mood === "bullish") return <TrendingUp className={className} />
  if (mood === "bearish") return <TrendingDown className={className} />
  if (mood === "calm") return <Zap className={className} />
  return <Wallet className={className} />
}

export function AmbientCanvas() {
  const router = useRouter()
  const { t, formatMoney, formatNumber, locale, getDateFnsLocale } = useI18n()
  const [panel, setPanel] = useState(0)
  const [time, setTime] = useState(() => new Date())
  const intl = intlLocale(locale)
  const dateFnsLocale = getDateFnsLocale()

  const { data: briefing, isLoading: briefingLoading } = useTodayBriefing()
  const { data: snapshots } = usePortfolioSnapshots(30)
  const { data: assets = [] } = useAssets()

  useEffect(() => {
    const hadRetrowave = enableAmbientKioskTheme()
    return () => disableAmbientKioskTheme(hadRetrowave)
  }, [])

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const advancePanel = useCallback(() => {
    setPanel((p) => (p + 1) % AMBIENT_PANEL_COUNT)
  }, [])

  useEffect(() => {
    const id = setInterval(advancePanel, AMBIENT_PANEL_ROTATION_MS)
    return () => clearInterval(id)
  }, [advancePanel])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        router.push("/dashboard")
        return
      }
      if (e.key === " " || e.key === "ArrowRight") {
        e.preventDefault()
        advancePanel()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [advancePanel, router])

  const moodPositions = useMemo(() => {
    if (!briefing) return []
    return [
      ...briefing.topFlop.top.map((p) => ({ gainLossPct: p.gainLossPct })),
      ...briefing.topFlop.flop.map((p) => ({ gainLossPct: p.gainLossPct })),
    ]
  }, [briefing])

  const mood = deriveMarketMood(moodPositions)

  const timeStr = time.toLocaleTimeString(intl, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
  const dateStr = time.toLocaleDateString(intl, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  const now = new Date()
  const monthLabel = format(now, "MMMM yyyy", { locale: dateFnsLocale })

  const portfolioDelta =
    briefing && !("error" in briefing.portfolio)
      ? briefing.portfolio.sinceYesterday
      : snapshots?.delta

  const hasDelta =
    portfolioDelta?.deltaEur != null && portfolioDelta?.deltaPercent != null
  const positive = (portfolioDelta?.deltaEur ?? 0) >= 0

  const series = snapshots?.series ?? []

  return (
    <div
      className="ambient-root fixed inset-0 z-20 flex flex-col bg-background retrowave text-foreground"
      onClick={advancePanel}
      role="presentation"
    >
      <div className="absolute left-4 top-4 z-30 flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="bg-card/60 backdrop-blur-sm"
          onClick={(e) => {
            e.stopPropagation()
            router.push("/dashboard")
          }}
        >
          <ArrowLeft className="h-4 w-4" />
          {t("ambient.exit")}
        </Button>
      </div>

      <div className="absolute right-4 top-4 z-30 flex gap-1.5">
        {Array.from({ length: AMBIENT_PANEL_COUNT }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 w-6 rounded-full transition-colors",
              i === panel ? "bg-primary" : "bg-muted-foreground/30"
            )}
          />
        ))}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-4 pt-16">
        {briefingLoading && (
          <p className="text-muted-foreground animate-pulse">{t("ambient.loading")}</p>
        )}

        {!briefingLoading && panel === 0 && (
          <div className="ambient-panel text-center animate-in fade-in duration-700">
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
              {mood !== "empty" && briefing && (
                <p className="max-w-md text-sm text-muted-foreground">
                  {briefing.topFlop.top[0]
                    ? `${briefing.topFlop.top[0].ticker} ${briefing.topFlop.top[0].gainLossPct >= 0 ? "+" : ""}${formatNumber(briefing.topFlop.top[0].gainLossPct, { maximumFractionDigits: 1 })} %`
                    : t("ambient.moodHint")}
                </p>
              )}
            </div>
          </div>
        )}

        {!briefingLoading && panel === 1 && (
          <div className="ambient-panel w-full max-w-2xl text-center animate-in fade-in duration-700">
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
              {t("ambient.portfolioPulse")}
            </p>
            {hasDelta ? (
              <p
                className={cn(
                  "mt-4 flex items-center justify-center gap-2 text-4xl font-bold sm:text-6xl",
                  positive ? "text-[var(--gain)]" : "text-[var(--loss)]"
                )}
              >
                {positive ? <TrendingUp className="h-10 w-10" /> : <TrendingDown className="h-10 w-10" />}
                {positive ? "+" : ""}
                {formatMoney(portfolioDelta!.deltaEur!)}
                <span className="text-2xl font-normal sm:text-3xl">
                  ({positive ? "+" : ""}
                  {formatNumber(portfolioDelta!.deltaPercent!, { maximumFractionDigits: 2 })} %)
                </span>
              </p>
            ) : (
              <p className="mt-6 text-xl text-muted-foreground">{t("today.noComparison")}</p>
            )}
            {portfolioDelta?.current != null && (
              <p className="mt-4 text-2xl text-muted-foreground">
                {formatMoney(portfolioDelta.current)}
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
          </div>
        )}

        {!briefingLoading && panel === 2 && briefing && (
          <div className="ambient-panel w-full max-w-xl animate-in fade-in duration-700">
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
                          title={step}
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
          </div>
        )}
      </div>

      <p className="pointer-events-none pb-2 text-center text-xs text-muted-foreground/60">
        {t("ambient.hint")}
      </p>

      <AmbientTickerTape assets={assets} />
    </div>
  )
}
