export type TrImportPhase = "parse" | "tickers" | "database" | "dedup" | "import"

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
    return total > 0 ? current / total : 0
  }

  let base = 0
  for (const p of PREVIEW_PHASE_ORDER) {
    if (p === phase) {
      const fraction = total > 0 ? current / total : phase === "parse" || phase === "database" || phase === "dedup" ? 1 : 0
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
): Response {
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      const emit = (event: TrImportProgressEvent) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
      }
      try {
        await handler(emit)
      } catch (err) {
        emit({
          type: "error",
          error: err instanceof Error ? err.message : "Unbekannter Fehler",
        })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
    },
  })
}

export async function readNdjsonStream<T>(
  response: Response,
  onProgress?: (event: Extract<TrImportProgressEvent, { type: "progress" }>) => void
): Promise<T> {
  if (!response.ok) {
    const contentType = response.headers.get("Content-Type") ?? ""
    if (contentType.includes("application/json")) {
      const err = await response.json()
      throw new Error(typeof err.error === "string" ? err.error : "Anfrage fehlgeschlagen")
    }
    throw new Error("Anfrage fehlgeschlagen")
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error("Keine Antwort vom Server")

  const decoder = new TextDecoder()
  let buffer = ""
  let result: T | undefined

  const handleLine = (line: string) => {
    if (!line.trim()) return
    const event = JSON.parse(line) as TrImportProgressEvent
    if (event.type === "progress") onProgress?.(event)
    else if (event.type === "complete") result = event.data as T
    else if (event.type === "error") throw new Error(event.error)
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() ?? ""
    for (const line of lines) handleLine(line)
  }

  if (buffer.trim()) handleLine(buffer)
  if (result === undefined) throw new Error("Stream ohne Ergebnis beendet")
  return result
}
