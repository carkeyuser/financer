"use client"

import { useEffect, useState } from "react"
import { Progress, ProgressLabel } from "@/components/ui/progress"
import {
  computeWeightedProgress,
  estimateRemainingSeconds,
  formatImportEta,
  type TrImportPhase,
} from "@/lib/services/tr-import-progress"

export interface ImportProgressState {
  phase: TrImportPhase
  current: number
  total: number
}

export function useImportEta(progress: ImportProgressState | null, locale: "de" | "en") {
  const [startAt, setStartAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!progress) {
      const clearId = window.setTimeout(() => setStartAt(null), 0)
      return () => window.clearTimeout(clearId)
    }
    const startId = window.setTimeout(() => {
      setStartAt((prev) => prev ?? Date.now())
    }, 0)
    return () => window.clearTimeout(startId)
  }, [progress])

  useEffect(() => {
    if (!progress) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [progress])

  if (!progress || startAt === null) {
    return { percent: null as number | null, eta: null as string | null }
  }

  const weighted = computeWeightedProgress(progress.phase, progress.current, progress.total)
  const percent = Math.round(weighted * 100)
  const elapsed = now - startAt
  const remaining = estimateRemainingSeconds(weighted, elapsed)
  const eta = formatImportEta(remaining, locale)

  return { percent, eta }
}

interface TrImportProgressPanelProps {
  progress: ImportProgressState | null
  phaseLabel: (phase: TrImportPhase) => string
  countLabel: (current: number, total: number) => string
  etaCalculatingLabel: string
  etaLabel: (time: string) => string
  locale?: "de" | "en"
}

export function TrImportProgressPanel({
  progress,
  phaseLabel,
  countLabel,
  etaCalculatingLabel,
  etaLabel,
  locale = "de",
}: TrImportProgressPanelProps) {
  const { percent, eta } = useImportEta(progress, locale)

  if (!progress) return null

  const showCount = progress.total > 0
  const displayPercent = percent === null ? null : Math.max(percent, 1)

  return (
    <div className="flex flex-col gap-3 py-8">
      <Progress value={displayPercent}>
        <ProgressLabel>{phaseLabel(progress.phase)}</ProgressLabel>
        {showCount && (
          <span className="ml-auto text-sm text-muted-foreground tabular-nums">
            {countLabel(progress.current, progress.total)}
          </span>
        )}
      </Progress>
      <p className="text-center text-xs text-muted-foreground">
        {eta ? etaLabel(eta) : etaCalculatingLabel}
        {displayPercent !== null && ` · ${displayPercent}%`}
      </p>
    </div>
  )
}
