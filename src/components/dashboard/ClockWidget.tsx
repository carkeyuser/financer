"use client"

import { useState, useEffect } from "react"
import { useI18n } from "@/i18n/context"
import { intlLocale } from "@/i18n/locales"

export function ClockWidget() {
  const { locale } = useI18n()
  const [time, setTime] = useState<Date | null>(null)

  useEffect(() => {
    setTime(new Date())
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  if (!time) return null

  const intl = intlLocale(locale)
  const timeStr = time.toLocaleTimeString(intl, { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  const dateStr = time.toLocaleDateString(intl, { weekday: "long", day: "numeric", month: "long", year: "numeric" })

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <p className="text-4xl font-mono font-bold tabular-nums">{timeStr}</p>
      <p className="text-sm text-muted-foreground mt-1">{dateStr}</p>
    </div>
  )
}
