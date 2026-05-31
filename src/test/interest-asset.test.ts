import { describe, expect, it } from "vitest"
import {
  INTEREST_ASSET_TICKER,
  isInterestAsset,
} from "@/lib/constants/interest-asset"
import {
  buildManualDividendEvent,
  type DividendAssetOption,
  type ManualDividendPayment,
} from "@/lib/utils/dividends"

const interestAsset: DividendAssetOption = {
  id: "interest-1",
  ticker: INTEREST_ASSET_TICKER,
  name: "Interest",
  type: "OTHER",
  account: "",
  ownerName: "Max",
  quantity: "0",
}

const interestPayment: ManualDividendPayment = {
  id: "p-interest",
  assetId: "interest-1",
  exDate: "2026-05-15",
  payDate: "2026-05-15",
  amountPerShare: "0",
  quantity: "0",
  grossAmount: "12.50",
  taxAmount: "2.50",
  netAmount: "10",
  status: "RECEIVED",
  note: "Tagesgeld Q1",
}

describe("interest asset", () => {
  it("identifies the reserved Interest ticker", () => {
    expect(isInterestAsset({ ticker: INTEREST_ASSET_TICKER })).toBe(true)
    expect(isInterestAsset({ ticker: "AAPL" })).toBe(false)
  })

  it("builds dividend events for bank interest payments", () => {
    const event = buildManualDividendEvent(
      interestPayment,
      interestAsset,
      new Date("2026-05-20T00:00:00.000Z")
    )

    expect(event).toMatchObject({
      ticker: INTEREST_ASSET_TICKER,
      amount: 10,
      grossAmount: 12.5,
      taxAmount: 2.5,
      quantity: 0,
      amountPerShare: 0,
      note: "Tagesgeld Q1",
    })
  })
})
