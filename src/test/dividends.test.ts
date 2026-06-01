import { describe, expect, it } from "vitest"
import {
  buildManualDividendEvent,
  buildMonthlyDividendSeries,
  calculateDividendKpis,
  statusForDate,
  type DividendAssetOption,
  type ManualDividendPayment,
} from "@/lib/utils/dividends"
import { createDividendPaymentSchema } from "@/lib/validations/dividend"

const dividendPaymentSchema = createDividendPaymentSchema("de")

const asset: DividendAssetOption = {
  id: "a1",
  ticker: "AAPL",
  name: "Apple",
  type: "STOCK",
  account: "Depot",
  ownerName: "Max",
  quantity: "20",
}

const payment: ManualDividendPayment = {
  id: "p1",
  assetId: "a1",
  exDate: "2026-05-10",
  payDate: "2026-05-10",
  amountPerShare: "0.5",
  quantity: "20",
  grossAmount: "12",
  taxAmount: "2",
  netAmount: "10",
  status: "RECEIVED",
  note: "Broker booking",
}

describe("manual dividend events", () => {
  it("builds a manual dividend event from a stored payment and asset", () => {
    const event = buildManualDividendEvent(payment, asset, new Date("2026-05-20T00:00:00.000Z"))

    expect(event).toMatchObject({
      id: "p1",
      paymentId: "p1",
      assetId: "a1",
      ticker: "AAPL",
      amount: 10,
      grossAmount: 12,
      taxAmount: 2,
      amountPerShare: 0.5,
      quantity: 20,
      status: "RECEIVED",
      note: "Broker booking",
    })
  })

  it("marks future dated manual payments as expected", () => {
    expect(statusForDate("2026-06-01", new Date("2026-05-20T00:00:00.000Z"))).toBe("EXPECTED")
    expect(statusForDate("2026-05-20", new Date("2026-05-20T00:00:00.000Z"))).toBe("RECEIVED")
  })
})

describe("manual dividend summaries", () => {
  it("groups payments by month and calculates simple KPIs", () => {
    const events = [
      buildManualDividendEvent({ ...payment, id: "jan", payDate: "2026-01-15", netAmount: "10" }, asset, new Date("2026-05-20T00:00:00.000Z")),
      buildManualDividendEvent({ ...payment, id: "may", payDate: "2026-05-10", netAmount: "20" }, asset, new Date("2026-05-20T00:00:00.000Z")),
      buildManualDividendEvent({ ...payment, id: "future", payDate: "2026-12-10", netAmount: "30" }, asset, new Date("2026-05-20T00:00:00.000Z")),
    ]

    expect(buildMonthlyDividendSeries(2026, events)[0].amount).toBe(10)
    expect(buildMonthlyDividendSeries(2026, events)[4].amount).toBe(20)
    expect(calculateDividendKpis(events, new Date("2026-05-20T00:00:00.000Z"))).toEqual({
      totalYear: 60,
      currentMonth: 20,
      futureTotal: 30,
      paymentCount: 3,
    })
  })
})

describe("dividendPaymentSchema", () => {
  it("accepts a minimal manual dividend payment", () => {
    expect(dividendPaymentSchema.safeParse({
      assetId: "a1",
      amount: 25.5,
    }).success).toBe(true)
  })

  it("accepts optional manual details", () => {
    expect(dividendPaymentSchema.safeParse({
      assetId: "a1",
      date: "2026-05-10",
      amount: 25.5,
      grossAmount: 30,
      taxAmount: 4.5,
      amountPerShare: 1.2,
      quantity: 20,
      note: "Broker booking",
    }).success).toBe(true)
  })

  it("rejects negative dividend amounts", () => {
    expect(dividendPaymentSchema.safeParse({
      assetId: "a1",
      amount: -1,
    }).success).toBe(false)
  })
})
