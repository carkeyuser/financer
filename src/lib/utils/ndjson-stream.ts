import { z } from "zod"

export const ndjsonProgressEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("progress"),
    phase: z.string(),
    current: z.number(),
    total: z.number(),
  }),
  z.object({ type: z.literal("complete"), data: z.unknown() }),
  z.object({ type: z.literal("error"), error: z.string() }),
])

export type NdjsonProgressEvent = z.infer<typeof ndjsonProgressEventSchema>

export function createNdjsonResponse<T extends NdjsonProgressEvent>(
  handler: (emit: (event: T) => void) => Promise<void>
): Promise<Response> {
  return new Promise((resolve) => {
    let settled = false
    const streamRef: { controller: ReadableStreamDefaultController<Uint8Array> | null } = {
      controller: null,
    }
    const encoder = new TextEncoder()
    let streamStarted = false

    const settle = (response: Response) => {
      if (settled) return
      settled = true
      resolve(response)
    }

    const emit = (event: T) => {
      const line = encoder.encode(`${JSON.stringify(event)}\n`)
      if (!streamStarted) {
        if (event.type === "error") {
          settle(Response.json({ error: event.error }, { status: 500 }))
          return
        }
        streamStarted = true
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            streamRef.controller = controller
            controller.enqueue(line)
          },
        })
        settle(
          new Response(stream, {
            headers: {
              "Content-Type": "application/x-ndjson",
              "Cache-Control": "no-cache",
            },
          })
        )
        return
      }
      streamRef.controller?.enqueue(line)
    }

    void (async () => {
      try {
        await handler(emit)
        if (!streamStarted) {
          settle(Response.json({ error: "Stream ohne Ergebnis" }, { status: 500 }))
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unbekannter Fehler"
        if (!streamStarted) {
          settle(Response.json({ error: message }, { status: 500 }))
        } else {
          emit({ type: "error", error: message } as T)
        }
      } finally {
        streamRef.controller?.close()
      }
    })()
  })
}

export async function readNdjsonStream<T, TEvent extends NdjsonProgressEvent = NdjsonProgressEvent>(
  response: Response,
  onProgress?: (event: Extract<TEvent, { type: "progress" }>) => void,
  options?: {
    resultSchema?: z.ZodType<T>
    eventSchema?: z.ZodType<TEvent>
  }
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

  const eventSchema = options?.eventSchema ?? ndjsonProgressEventSchema
  const decoder = new TextDecoder()
  let buffer = ""
  let result: T | undefined

  const handleLine = (line: string) => {
    if (!line.trim()) return
    let parsed: unknown
    try {
      parsed = JSON.parse(line)
    } catch {
      throw new Error("Ungültige Antwort vom Server")
    }
    const eventResult = eventSchema.safeParse(parsed)
    if (!eventResult.success) {
      throw new Error("Ungültige Antwort vom Server")
    }
    const event = eventResult.data
    if (event.type === "progress") onProgress?.(event as Extract<TEvent, { type: "progress" }>)
    else if (event.type === "complete") {
      if (options?.resultSchema) {
        const dataResult = options.resultSchema.safeParse(event.data)
        if (!dataResult.success) {
          throw new Error("Ungültiges Ergebnis vom Server")
        }
        result = dataResult.data
      } else {
        result = event.data as T
      }
    } else if (event.type === "error") throw new Error(event.error)
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
