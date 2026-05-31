"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Progress, ProgressLabel } from "@/components/ui/progress"
import {
  computeWeightedProgress,
  estimateRemainingSeconds,
  formatImportEta,
  readNdjsonStream,
  type TrImportPhase,
  type TrImportProgressEvent,
} from "@/lib/services/tr-import-progress"

export interface ImportProgressState {
  phase: TrImportPhase
  current: number
  total: number
}

export function useImportEta(progress: ImportProgressState | null, locale: "de" | "en") {
  const startRef = useRef<number | null>(null)

  useEffect(() => {
    if (progress) {
      if (startRef.current === null) startRef.current = Date.now()
    } else {
      startRef.current = null
    }
  }, [progress])

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

  return (
    <div className="flex flex-col gap-3 py-8">
      <Progress value={percent ?? null}>
        <ProgressLabel>{phaseLabel(progress.phase)}</ProgressLabel>
        {showCount && (
          <span className="ml-auto text-sm text-muted-foreground tabular-nums">
            {countLabel(progress.current, progress.total)}
          </span>
        )}
      </Progress>
      <p className="text-center text-xs text-muted-foreground">
        {eta ? etaLabel(eta) : etaCalculatingLabel}
        {percent !== null && ` · ${percent}%`}
      </p>
    </div>
  )
}

export function useImportProgressReader() {
  const [progress, setProgress] = useState<ImportProgressState | null>(null)

  const onProgress = useCallback((event: Extract<TrImportProgressEvent, { type: "progress" }>) => {
    setProgress({ phase: event.phase, current: event.current, total: event.total })
  }, [])

  const resetProgress = useCallback(() => setProgress(null), [])

  const readStream = useCallback(
    async <T,>(response: Response): Promise<T> => {
      setProgress(null)
      return readNdjsonStream<T>(response, onProgress)
    },
    [onProgress]
  )

  return { progress, resetProgress, readStream }
}
