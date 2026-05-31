import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getEurRate } from "@/lib/utils/currency"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.householdId) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get("symbol")?.trim()
  const from = searchParams.get("from")?.trim() // YYYY-MM-DD
  const intervalParam = searchParams.get("interval")?.trim() ?? "1mo"
  const allowedIntervals = ["1d", "1wk", "1mo"] as const

  if (!symbol || !from) {
    return NextResponse.json({ error: "symbol und from sind erforderlich" }, { status: 400 })
  }

  if (!allowedIntervals.includes(intervalParam as (typeof allowedIntervals)[number])) {
    return NextResponse.json({ error: "interval muss 1d, 1wk oder 1mo sein" }, { status: 400 })
  }

  const interval = intervalParam as (typeof allowedIntervals)[number]

  try {
    const fromDate = new Date(from)
    const period1 = Math.floor(fromDate.getTime() / 1000)
    const period2 = Math.floor(Date.now() / 1000)

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&period1=${period1}&period2=${period2}`
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
        "Referer": "https://finance.yahoo.com",
      },
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    })

    if (!res.ok) {
      return NextResponse.json({ prices: [], currency: null, eurRate: null })
    }

    const data = await res.json()
    const result = data?.chart?.result?.[0]
    if (!result) {
      return NextResponse.json({ prices: [], currency: null, eurRate: null })
    }

    const timestamps: number[] = result.timestamp ?? []
    const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? []
    const currency: string = result.meta?.currency ?? "USD"
    let eurRate: number
    try {
      eurRate = await getEurRate(currency)
    } catch {
      return NextResponse.json({ error: "Wechselkurs konnte nicht geladen werden" }, { status: 503 })
    }

    const prices = timestamps
      .map((ts, i) => ({
        date: new Date(ts * 1000).toISOString().split("T")[0],
        price: closes[i],
      }))
      .filter((p): p is { date: string; price: number } => p.price !== null && p.price > 0)

    return NextResponse.json({ prices, currency, eurRate })
  } catch {
    return NextResponse.json({ prices: [], currency: null, eurRate: null })
  }
}
