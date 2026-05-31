import { describe, it, expect } from "vitest"
import {
  computeWeightedProgress,
  createNdjsonResponse,
  estimateRemainingSeconds,
  formatImportEta,
  readNdjsonStream,
} from "@/lib/services/tr-import-progress"

describe("computeWeightedProgress", () => {
  it("weights ticker phase heavily in preview", () => {
    expect(computeWeightedProgress("parse", 1, 1)).toBeCloseTo(0.05)
    expect(computeWeightedProgress("tickers", 5, 10)).toBeCloseTo(0.05 + 0.7 * 0.5)
    expect(computeWeightedProgress("import", 3, 10)).toBeCloseTo(0.3)
  })
})

describe("estimateRemainingSeconds", () => {
  it("returns null for low progress", () => {
    expect(estimateRemainingSeconds(0.02, 5000)).toBeNull()
  })

  it("estimates remaining time from elapsed", () => {
    expect(estimateRemainingSeconds(0.5, 10_000)).toBe(10)
  })
})

describe("formatImportEta", () => {
  it("formats seconds and minutes in de", () => {
    expect(formatImportEta(45, "de")).toBe("45 Sek.")
    expect(formatImportEta(90, "de")).toBe("2 Min.")
  })
})

describe("createNdjsonResponse", () => {
  it("returns 500 JSON when handler fails before any progress", async () => {
    const response = await createNdjsonResponse(async () => {
      throw new Error("preview failed")
    })
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toBe("preview failed")
  })

  it("returns NDJSON stream when progress is emitted", async () => {
    const response = await createNdjsonResponse(async (emit) => {
      emit({ type: "progress", phase: "parse", current: 1, total: 1 })
      emit({ type: "complete", data: { ok: true } })
    })
    expect(response.status).toBe(200)
    expect(response.headers.get("Content-Type")).toContain("ndjson")
    const result = await readNdjsonStream<{ ok: boolean }>(response)
    expect(result).toEqual({ ok: true })
  })
})

describe("readNdjsonStream", () => {
  it("parses progress and complete events", async () => {
    const body = [
      JSON.stringify({ type: "progress", phase: "parse", current: 1, total: 1 }),
      JSON.stringify({ type: "complete", data: { ok: true } }),
    ].join("\n")

    const progress: number[] = []
    const result = await readNdjsonStream<{ ok: boolean }>(
      new Response(body, { status: 200, headers: { "Content-Type": "application/x-ndjson" } }),
      (e) => progress.push(e.current)
    )

    expect(result).toEqual({ ok: true })
    expect(progress).toEqual([1])
  })

  it("throws on error event", async () => {
    const body = JSON.stringify({ type: "error", error: "fail" })
    await expect(
      readNdjsonStream(new Response(body, { status: 200 }))
    ).rejects.toThrow("fail")
  })
})
