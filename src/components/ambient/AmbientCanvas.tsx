"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAssets } from "@/hooks/useAssets"
import { useTodayBriefing, usePortfolioSnapshots } from "@/hooks/useDailyHabit"
import { useI18n } from "@/i18n/context"
import { intlLocale } from "@/i18n/locales"
import { AMBIENT_PANEL_COUNT, AMBIENT_PANEL_ROTATION_MS } from "@/lib/ambient/market-mood"
import { disableAmbientKioskTheme, enableAmbientKioskTheme } from "@/lib/ambient/kiosk-theme"
import { cn } from "@/lib/utils"
import {
  AmbientCalendarPanel,
  AmbientChecklistPanel,
  AmbientClockPanel,
  AmbientDividendsPanel,
  AmbientHouseholdFinancePanel,
  AmbientPortfolioPanel,
  AmbientTopFlopPanel,
} from "./AmbientPanels"
import { AmbientTickerTape } from "./AmbientTickerTape"

export function AmbientCanvas() {
  const router = useRouter()
  const { t, formatMoney, formatNumber, formatDate, locale, getDateFnsLocale } = useI18n()
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
      if (e.key === "ArrowLeft") {
        e.preventDefault()
        setPanel((p) => (p - 1 + AMBIENT_PANEL_COUNT) % AMBIENT_PANEL_COUNT)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [advancePanel, router])

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

  const monthLabel = format(new Date(), "MMMM yyyy", { locale: dateFnsLocale })
  const series = snapshots?.series ?? []

  const renderPanel = () => {
    if (briefingLoading) {
      return <p className="text-muted-foreground animate-pulse">{t("ambient.loading")}</p>
    }
    if (!briefing) {
      return <p className="text-destructive">{t("common.error")}</p>
    }

    switch (panel) {
      case 0:
        return (
          <AmbientClockPanel
            briefing={briefing}
            timeStr={timeStr}
            dateStr={dateStr}
            t={t}
            formatNumber={formatNumber}
          />
        )
      case 1:
        return (
          <AmbientPortfolioPanel
            briefing={briefing}
            series={series}
            t={t}
            formatMoney={formatMoney}
            formatNumber={formatNumber}
          />
        )
      case 2:
        return (
          <AmbientTopFlopPanel
            briefing={briefing}
            t={t}
            formatNumber={formatNumber}
            formatMoney={formatMoney}
          />
        )
      case 3:
        return (
          <AmbientCalendarPanel briefing={briefing} t={t} dateFnsLocale={dateFnsLocale} />
        )
      case 4:
        return (
          <AmbientDividendsPanel
            briefing={briefing}
            t={t}
            formatMoney={formatMoney}
            formatDate={formatDate}
          />
        )
      case 5:
        return (
          <AmbientChecklistPanel briefing={briefing} monthLabel={monthLabel} t={t} />
        )
      case 6:
        return (
          <AmbientHouseholdFinancePanel
            briefing={briefing}
            monthLabel={monthLabel}
            t={t}
            formatMoney={formatMoney}
          />
        )
      default:
        return null
    }
  }

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

      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-4 pt-16 overflow-y-auto">
        {renderPanel()}
      </div>

      <p className="pointer-events-none pb-2 text-center text-xs text-muted-foreground/60">
        {t("ambient.hint")}
      </p>

      <AmbientTickerTape assets={assets} />
    </div>
  )
}
