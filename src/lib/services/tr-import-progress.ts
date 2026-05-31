import { z } from "zod"
import {
  createNdjsonResponse as createNdjsonResponseBase,
  readNdjsonStream as readNdjsonStreamBase,
} from "@/lib/utils/ndjson-stream"

export type TrImportPhase = "parse" | "tickers" | "database" | "dedup" | "import"

const trImportProgressEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("progress"),
    phase: z.enum(["parse", "tickers", "database", "dedup", "import"]),
    current: z.number(),
    total: z.number(),
  }),
  z.object({ type: z.literal("complete"), data: z.unknown() }),
  z.object({ type: z.literal("error"), error: z.string() }),
])

export type TrImportProgressEvent =
  | { type: "progress"; phase: TrImportPhase; current: number; total: number }
  | { type: "complete"; data: unknown }
  | { type: "error"; error: string }

export const PREVIEW_PHASE_WEIGHTS: Record<Exclude<TrImportPhase, "import">, number> = {
  parse: 0.05,
  tickers: 0.7,
  database: 0.15,
  dedup: 0.1,
}

const PREVIEW_PHASE_ORDER: Exclude<TrImportPhase, "import">[] = ["parse", "tickers", "database", "dedup"]

export function computeWeightedProgress(phase: TrImportPhase, current: number, total: number): number {
  if (phase === "import") {
    if (total <= 0) return 0
    return current === 0 ? 0.02 : current / total
  }

  let base = 0
  for (const p of PREVIEW_PHASE_ORDER) {
    if (p === phase) {
      const fraction =
        total > 0
          ? current === 0
            ? 0.05
            : current / total
          : phase === "parse" || phase === "database" || phase === "dedup"
            ? 1
            : 0
      return Math.min(1, base + PREVIEW_PHASE_WEIGHTS[p] * fraction)
    }
    base += PREVIEW_PHASE_WEIGHTS[p]
  }
  return 1
}

export function estimateRemainingSeconds(progress: number, elapsedMs: number): number | null {
  if (progress < 0.05 || elapsedMs <= 0) return null
  return Math.max(1, Math.ceil((elapsedMs / 1000 / progress) * (1 - progress)))
}

export function formatImportEta(seconds: number | null, locale: "de" | "en" = "de"): string | null {
  if (seconds === null) return null
  if (seconds < 60) {
    return locale === "de" ? `${seconds} Sek.` : `${seconds} sec`
  }
  const mins = Math.ceil(seconds / 60)
  return locale === "de" ? `${mins} Min.` : `${mins} min`
}

export function createNdjsonResponse(
  handler: (emit: (event: TrImportProgressEvent) => void) => Promise<void>
): Promise<Response> {
  return createNdjsonResponseBase(handler)
}

export async function readNdjsonStream<T>(
  response: Response,
  onProgress?: (event: Extract<TrImportProgressEvent, { type: "progress" }>) => void,
  resultSchema?: z.ZodType<T>
): Promise<T> {
  return readNdjsonStreamBase(response, onProgress, {
    resultSchema,
    eventSchema: trImportProgressEventSchema,
  })
}
