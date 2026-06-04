import { describe, it, expect } from "vitest"
import { formatMoney, formatDate, formatPercent, getDateFnsLocale } from "@/i18n/format"
import { mapApiError, translateApiError } from "@/i18n/api-errors"
import { deMessages } from "@/i18n/messages/de"
import { enMessages } from "@/i18n/messages/en"
import { collectMessageKeys } from "@/i18n/message-keys"
import { createSimulationSchema } from "@/lib/validations/household-finance-simulation"
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

  it("translates FX load error", () => {
    expect(mapApiError("Wechselkurse konnten nicht geladen werden", "en")).toBe(
      "Exchange rates could not be loaded"
    )
  })

  it("translates personal income error codes", () => {
    expect(mapApiError("YEAR_NOT_PAST", "en")).toBe("Only past calendar years can be added")
    expect(mapApiError("NO_NET_SALARY", "en")).toBe("Net salary missing — enter net amount first")
  })

  it("translates nested zod flatten errors", () => {
    expect(
      translateApiError(
        { error: { fieldErrors: { year: ["YEAR_NOT_PAST"] }, formErrors: [] } },
        "en"
      )
    ).toBe("Only past calendar years can be added")
  })
})

describe("message key parity", () => {
  it("en has every de message key", () => {
    const deKeys = new Set(collectMessageKeys(deMessages as unknown as Record<string, unknown>))
    const enKeys = new Set(collectMessageKeys(enMessages as unknown as Record<string, unknown>))
    const missingInEn = [...deKeys].filter((k) => !enKeys.has(k)).sort()
    expect(missingInEn).toEqual([])
  })

  it("de has every en message key", () => {
    const deKeys = new Set(collectMessageKeys(deMessages as unknown as Record<string, unknown>))
    const enKeys = new Set(collectMessageKeys(enMessages as unknown as Record<string, unknown>))
    const missingInDe = [...enKeys].filter((k) => !deKeys.has(k)).sort()
    expect(missingInDe).toEqual([])
  })
})

describe("locale-aware simulation validation", () => {
  it("returns English message for invalid range", () => {
    const result = createSimulationSchema("en").safeParse({
      name: "Test",
      startYear: 2026,
      startMonth: 10,
      endYear: 2026,
      endMonth: 9,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message)
      expect(messages).toContain("End must be after start")
    }
  })
})
