"use client"

import { useRef } from "react"
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
  const startRef = useRef<number | null>(null)

  if (progress) {
    if (startRef.current === null) startRef.current = Date.now()
  } else {
    startRef.current = null
  }

  if (!progress || startRef.current === null) {
    return { percent: null as number | null, eta: null as string | null }
  }

  const weighted = computeWeightedProgress(progress.phase, progress.current, progress.total)
  const percent = Math.round(weighted * 100)
  const elapsed = Date.now() - startRef.current
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
