import type { AssetType } from "@/generated/prisma"

export type TrImportEventType = "purchase" | "sale" | "dividend" | "interest" | "ignored"

export type TrImportRowStatus =
  | "import_new"
  | "skip_hard"
  | "skip_soft"
  | "conflict"
  | "needs_ticker"
  | "ignored"

export type TrImportResolution = "skip" | "import" | "link" | "replace"

export interface TrParsedRow {
  rowId: string
  lineNumber: number
  date: string
  product: string
  isin: string | null
  quantity: number | null
  price: number | null
  totalEur: number | null
  taxEur: number | null
  orderId: string | null
  importRef: string
  eventType: TrImportEventType
  rawType: string
}

export interface TrTickerOverride {
  symbol: string
  name: string
  type: AssetType
  currency: string
}

export interface TrMatchedEntry {
  id: string
  kind: "asset_entry" | "dividend"
  date: string
  assetName: string
  ticker: string
  quantity: number | null
  price: number | null
  amountEur: number | null
  type: string
}

export interface TrImportPreviewRow {
  rowId: string
  lineNumber: number
  status: TrImportRowStatus
  eventType: TrImportEventType
  date: string
  product: string
  isin: string | null
  quantity: number | null
  price: number | null
  totalEur: number | null
  taxEur: number | null
  orderId: string | null
  importRef: string
  suggestedTicker: TrTickerOverride | null
  matchedEntry: TrMatchedEntry | null
  defaultResolution: TrImportResolution
}

export interface TrImportSummary {
  importNew: number
  skipHard: number
  skipSoft: number
  conflict: number
  needsTicker: number
  ignored: number
  tickersToReview: number
}
