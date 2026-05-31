import { readFileSync } from "fs"
import { join } from "path"
import { describe, it, expect } from "vitest"
import { buildPreviewRows, summarizePreviewRows } from "@/lib/services/tr-import-dedup"
import { buildImportRef, parseTradeRepublicCsv } from "@/lib/services/trade-republic-csv"

const fixturePath = join(__dirname, "fixtures", "tr-export-sample.csv")

describe("parseTradeRepublicCsv", () => {
  it("parses semicolon-separated TR export", () => {
    const content = readFileSync(fixturePath, "utf-8")
    const rows = parseTradeRepublicCsv(content)
    expect(rows).toHaveLength(4)
    const purchase = rows.find((r) => r.orderId === "tr-order-001")
    const sale = rows.find((r) => r.orderId === "tr-order-002")
    const dividend = rows.find((r) => r.orderId === "tr-order-003")
    const interest = rows.find((r) => r.orderId === "tr-order-004")
    expect(purchase?.eventType).toBe("purchase")
    expect(purchase?.isin).toBe("IE00BK5BQT8V")
    expect(purchase?.quantity).toBe(5)
    expect(sale?.eventType).toBe("sale")
    expect(dividend?.eventType).toBe("dividend")
    expect(interest?.eventType).toBe("interest")
  })

  it("builds stable importRef from order id", () => {
    const ref = buildImportRef("abc-123", {
      date: "2024-01-01",
      isin: "IE00BK5BQT8V",
      eventType: "purchase",
      quantity: 1,
      price: 10,
      totalEur: 10,
    })
    expect(ref).toBe("tr:abc-123")
  })

  it("throws on empty file", () => {
    expect(() => parseTradeRepublicCsv("")).toThrow("EMPTY_FILE")
  })

  it("parses portfolio-downloader CSV (Instrument column for ISIN)", () => {
    const content = readFileSync(join(__dirname, "fixtures", "tr-export-portfolio-downloader.csv"), "utf-8")
    const rows = parseTradeRepublicCsv(content)
    expect(rows).toHaveLength(2)
    const purchase = rows.find((r) => r.orderId === "abc-001")
    const sale = rows.find((r) => r.orderId === "abc-002")
    expect(purchase?.isin).toBe("IE00BK5BQT8V")
    expect(purchase?.product).toBe("Vanguard FTSE All-World")
    expect(purchase?.eventType).toBe("purchase")
    expect(purchase?.quantity).toBe(5)
    expect(sale?.eventType).toBe("sale")
    expect(sale?.isin).toBe("IE00BK5BQT8V")
  })
})

describe("tr-import dedup", () => {
  it("detects hard duplicate by importRef", () => {
    const parsed = parseTradeRepublicCsv(readFileSync(fixturePath, "utf-8"))
    const preview = buildPreviewRows(parsed, {
      existingImportRefs: new Set(["tr:tr-order-001"]),
      assetEntries: [],
      dividends: [],
      isinResolutions: new Map([["IE00BK5BQT8V", { symbol: "VWCE.DE", name: "Vanguard FTSE", type: "ETF", currency: "EUR" }]]),
    })
    const first = preview.find((r) => r.orderId === "tr-order-001")
    expect(first?.status).toBe("skip_hard")
    expect(summarizePreviewRows(preview).skipHard).toBe(1)
  })

  it("detects soft duplicate against manual entry", () => {
    const parsed = parseTradeRepublicCsv(readFileSync(fixturePath, "utf-8"))
    const purchase = parsed.find((r) => r.orderId === "tr-order-001")!
    const preview = buildPreviewRows(parsed, {
      existingImportRefs: new Set(),
      assetEntries: [
        {
          id: "entry-1",
          assetId: "asset-1",
          type: "PURCHASE",
          price: "85.5",
          quantity: "5",
          date: new Date(`${purchase.date}T12:00:00.000Z`),
          importRef: null,
          asset: {
            id: "asset-1",
            ticker: "VWCE.DE",
            name: "Vanguard FTSE",
            isin: "IE00BK5BQT8V",
            userId: "user-1",
          },
        },
      ],
      dividends: [],
      isinResolutions: new Map([["IE00BK5BQT8V", { symbol: "VWCE.DE", name: "Vanguard FTSE", type: "ETF", currency: "EUR" }]]),
    })
    const row = preview.find((r) => r.orderId === "tr-order-001")
    expect(row?.status).toBe("skip_soft")
    expect(row?.matchedEntry?.id).toBe("entry-1")
  })
})
