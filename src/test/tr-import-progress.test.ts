import { describe, it, expect } from "vitest"
import {
  computeWeightedProgress,
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
