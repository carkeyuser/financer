import { describe, it, expect } from "vitest"
import { formatMoney, formatDate, formatPercent, getDateFnsLocale } from "@/i18n/format"
import { mapApiError, translateApiError } from "@/i18n/api-errors"
import { de } from "date-fns/locale"
import { enUS } from "date-fns/locale"

describe("formatMoney", () => {
  it("formats EUR in de-DE", () => {
    const result = formatMoney(1234.5, "de", "EUR")
    expect(result).toContain("1.234")
    expect(result).toContain("€")
  })

  it("formats EUR in en-US", () => {
    const result = formatMoney(1234.5, "en", "EUR")
    expect(result).toContain("1,234")
    expect(result).toContain("€")
  })
})

describe("formatDate", () => {
  it("formats date in de locale", () => {
    expect(formatDate("2024-03-15", "de")).toMatch(/15/)
  })

  it("formats date in en locale", () => {
    expect(formatDate("2024-03-15", "en")).toMatch(/15/)
  })
})

describe("formatPercent", () => {
  it("formats percent", () => {
    expect(formatPercent(12.3, "de")).toContain("12")
  })
})

describe("getDateFnsLocale", () => {
  it("returns de for de locale", () => {
    expect(getDateFnsLocale("de")).toBe(de)
  })

  it("returns enUS for en locale", () => {
    expect(getDateFnsLocale("en")).toBe(enUS)
  })
})

describe("mapApiError", () => {
  it("maps known German error to English", () => {
    expect(mapApiError("Nicht autorisiert", "en")).toBe("Unauthorized")
  })

  it("keeps German for de locale", () => {
    expect(mapApiError("Nicht autorisiert", "de")).toBe("Nicht autorisiert")
  })

  it("returns unknown strings unchanged", () => {
    expect(mapApiError("Custom error", "en")).toBe("Custom error")
  })
})

describe("translateApiError", () => {
  it("translates string error", () => {
    expect(translateApiError({ error: "Nicht gefunden" }, "en")).toBe("Not found")
  })

  it("returns generic for unknown shape", () => {
    expect(translateApiError(null, "en")).toBe("An error occurred")
  })
})
