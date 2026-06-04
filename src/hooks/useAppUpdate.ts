"use client"

import { useMutation } from "@tanstack/react-query"
import {
  appUpdateEventSchema,
  appUpdateCompleteEventSchema,
} from "@/lib/validations/app-update"

export type UpdateLogLine = { level: "info" | "error"; message: string }

async function readAppUpdateStream(
  response: Response,
  onLog: (line: UpdateLogLine) => void
): Promise<void> {
  if (!response.ok) {
    const contentType = response.headers.get("Content-Type") ?? ""
    if (contentType.includes("application/json")) {
      const err = (await response.json()) as { error?: string }
      throw new Error(typeof err.error === "string" ? err.error : "Anfrage fehlgeschlagen")
    }
    throw new Error("Anfrage fehlgeschlagen")
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error("Keine Antwort vom Server")

  const decoder = new TextDecoder()
  let buffer = ""
  let completed = false

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() ?? ""

    for (const line of lines) {
      if (!line.trim()) continue
      let parsed: unknown
      try {
        parsed = JSON.parse(line)
      } catch {
        throw new Error("Ungültige Antwort vom Server")
      }
      const eventResult = appUpdateEventSchema.safeParse(parsed)
      if (!eventResult.success) {
        throw new Error("Ungültige Antwort vom Server")
      }
      const event = eventResult.data
      if (event.type === "log") {
        onLog({ level: event.level, message: event.message })
      } else if (event.type === "complete") {
        const dataResult = appUpdateCompleteEventSchema.safeParse(event)
        if (!dataResult.success) throw new Error("Ungültiges Ergebnis vom Server")
        completed = true
      } else if (event.type === "error") {
        throw new Error(event.error)
      }
    }
  }

  if (buffer.trim()) {
    const eventResult = appUpdateEventSchema.safeParse(JSON.parse(buffer))
    if (eventResult.success) {
      const event = eventResult.data
      if (event.type === "log") onLog({ level: event.level, message: event.message })
      else if (event.type === "complete") completed = true
      else if (event.type === "error") throw new Error(event.error)
    }
  }

  if (!completed) throw new Error("Stream ohne Ergebnis beendet")
}

export function useAppUpdate() {
  return useMutation({
    mutationFn: async (handlers: { onLog: (line: UpdateLogLine) => void }) => {
      const res = await fetch("/api/admin/update", { method: "POST" })
      await readAppUpdateStream(res, handlers.onLog)
    },
  })
}
