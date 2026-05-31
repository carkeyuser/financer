import { readFileSync } from "fs"
import { join } from "path"
import { describe, it, expect } from "vitest"
import { buildPreviewRows, summarizePreviewRows } from "@/lib/services/tr-import-dedup"
import { buildImportRef, formatInvalidTradeError, parseTradeRepublicCsv } from "@/lib/services/trade-republic-csv"

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

  it("parses full portfolio-downloader sample without invalid trade qty/price", () => {
    const content = readFileSync(join(__dirname, "fixtures", "tr-export-portfolio-downloader-full.csv"), "utf-8")
    const rows = parseTradeRepublicCsv(content)
    const badTrades = rows.filter((r) => {
      if (r.eventType !== "purchase" && r.eventType !== "sale") return false
      const qty = r.quantity ?? 0
      const price = r.price ?? (r.totalEur && qty ? r.totalEur / qty : 0)
      return qty <= 0 || price <= 0
    })
    expect(badTrades).toEqual([])
  })

  it("derives price from Amount column when Rate is missing", () => {
    const csv = [
      "Timestamp,Type,Name,Instrument,Shares,Amount",
      "15 Jan 24 10:30 +0000,Purchase,Vanguard FTSE,IE00BK5BQT8V,5,427.50",
    ].join("\n")
    const rows = parseTradeRepublicCsv(csv)
    expect(rows).toHaveLength(1)
    expect(rows[0].eventType).toBe("purchase")
    expect(rows[0].quantity).toBe(5)
    expect(rows[0].totalEur).toBe(427.5)
    expect(rows[0].price).toBeCloseTo(85.5)
  })

  it("derives quantity from Amount and Rate when Shares is missing", () => {
    const csv = [
      "Date;Type;Name;ISIN;Kurs;Betrag",
      "2024-01-15;Kauf;Vanguard;IE00BK5BQT8V;85,50;427,50",
    ].join("\n")
    const rows = parseTradeRepublicCsv(csv)
    expect(rows).toHaveLength(1)
    expect(rows[0].quantity).toBeCloseTo(5)
    expect(rows[0].price).toBeCloseTo(85.5)
  })

  it("skips non-executed rows", () => {
    const csv = [
      "ID,Status,Timestamp,Type,Name,Instrument,Shares,Rate,Debit,Credit",
      "abc-1,cancelled,15 Jan 24 10:30 +0000,Purchase,Vanguard,IE00BK5BQT8V,5,85.5,427.50,0",
      "abc-2,executed,16 Jan 24 10:30 +0000,Purchase,Vanguard,IE00BK5BQT8V,5,85.5,427.50,0",
    ].join("\n")
    const rows = parseTradeRepublicCsv(csv)
    expect(rows).toHaveLength(1)
    expect(rows[0].orderId).toBe("abc-2")
  })

  it("uses max of debit and credit when both are present", () => {
    const csv = [
      "ID,Status,Timestamp,Type,Name,Instrument,Shares,Rate,Commission,Debit,Credit",
      "abc-1,executed,15 Jan 24 10:30 +0000,Sale,Vanguard,IE00BK5BQT8V,-5,85.5,1,1,427.50",
    ].join("\n")
    const rows = parseTradeRepublicCsv(csv)
    expect(rows).toHaveLength(1)
    expect(rows[0].totalEur).toBe(427.5)
  })

  it("formats invalid trade errors with row context", () => {
    const msg = formatInvalidTradeError({
      rawType: "purchase",
      product: "Amazon.com",
      isin: "US0231351067",
      quantity: 0,
      price: null,
      totalEur: null,
    })
    expect(msg).toContain("Amazon.com")
    expect(msg).toContain("US0231351067")
    expect(msg).toContain("Menge 0")
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
