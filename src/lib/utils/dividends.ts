export type DividendStatus = "EXPECTED" | "RECEIVED"

export interface DividendAssetOption {
  id: string
  ticker: string
  name: string
  type: string
  account: string
  ownerName: string | null
  quantity: string
}

export interface ManualDividendPayment {
  id: string
  assetId: string
  exDate: Date | string
  payDate: Date | string | null
  amountPerShare: { toString(): string } | string | number
  quantity: { toString(): string } | string | number
  grossAmount: { toString(): string } | string | number
  taxAmount: { toString(): string } | string | number
  netAmount: { toString(): string } | string | number
  status: DividendStatus
  note: string | null
}

export interface ManualDividendEvent {
  id: string
  paymentId: string
  assetId: string
  ticker: string
  name: string
  account: string
  ownerName: string | null
  date: string
  amount: number
  grossAmount: number
  taxAmount: number
  amountPerShare: number
  quantity: number
  status: DividendStatus
  note: string | null
}

export interface DividendMonthlyBucket {
  month: number
  amount: number
}

export interface DividendKpis {
  totalYear: number
  currentMonth: number
  futureTotal: number
  paymentCount: number
}

function toNumber(value: { toString(): string } | string | number): number {
  return typeof value === "number" ? value : parseFloat(value.toString())
}

export function toDateKey(date: Date | string): string {
  return (date instanceof Date ? date.toISOString() : date).split("T")[0]
}

export function todayKey(now: Date = new Date()): string {
  return toDateKey(now)
}

export function statusForDate(date: Date | string, now: Date = new Date()): DividendStatus {
  return toDateKey(date) > todayKey(now) ? "EXPECTED" : "RECEIVED"
}

export function buildManualDividendEvent(
  payment: ManualDividendPayment,
  asset: DividendAssetOption,
  now: Date = new Date()
): ManualDividendEvent {
  const date = toDateKey(payment.payDate ?? payment.exDate)
  return {
    id: payment.id,
    paymentId: payment.id,
    assetId: asset.id,
    ticker: asset.ticker,
    name: asset.name,
    account: asset.account,
    ownerName: asset.ownerName,
    date,
    amount: toNumber(payment.netAmount),
    grossAmount: toNumber(payment.grossAmount),
    taxAmount: toNumber(payment.taxAmount),
    amountPerShare: toNumber(payment.amountPerShare),
    quantity: toNumber(payment.quantity),
    status: statusForDate(date, now),
    note: payment.note,
  }
}

export function buildMonthlyDividendSeries(year: number, events: ManualDividendEvent[]): DividendMonthlyBucket[] {
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1
    const amount = events
      .filter((event) => {
        const date = new Date(`${event.date}T12:00:00.000Z`)
        return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month
      })
      .reduce((sum, event) => sum + event.amount, 0)

    return { month, amount }
  })
}

export function calculateDividendKpis(
  events: ManualDividendEvent[],
  now: Date = new Date()
): DividendKpis {
  const currentDate = toDateKey(now)
  const currentMonth = now.getUTCMonth() + 1
  const currentYear = now.getUTCFullYear()

  return {
    totalYear: events.reduce((sum, event) => sum + event.amount, 0),
    currentMonth: events
      .filter((event) => {
        const date = new Date(`${event.date}T12:00:00.000Z`)
        return date.getUTCFullYear() === currentYear && date.getUTCMonth() + 1 === currentMonth
      })
      .reduce((sum, event) => sum + event.amount, 0),
    futureTotal: events
      .filter((event) => event.date > currentDate)
      .reduce((sum, event) => sum + event.amount, 0),
    paymentCount: events.length,
  }
}
