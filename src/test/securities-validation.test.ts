import { describe, it, expect } from "vitest"
import {
  parseSecuritySearchQueryParam,
  parseSecuritySymbolParam,
  securitySymbolSchema,
} from "@/lib/validations/securities"

describe("securities validation", () => {
  it("accepts common Yahoo tickers", () => {
    expect(securitySymbolSchema.safeParse("EUNL.DE").success).toBe(true)
    expect(securitySymbolSchema.safeParse("BTC-USD").success).toBe(true)
  })

  it("rejects injection-like symbols", () => {
    expect(parseSecuritySymbolParam("../evil").error).toBe("Ungültiges Symbol")
    expect(parseSecuritySymbolParam("A".repeat(40)).error).toBe("Ungültiges Symbol")
  })

  it("search query rejects control characters", () => {
    expect(parseSecuritySearchQueryParam("MSCI World").q).toBe("MSCI World")
    expect("empty" in parseSecuritySearchQueryParam("a")).toBe(true)
    expect("error" in parseSecuritySearchQueryParam("foo\nbar")).toBe(true)
  })
})
