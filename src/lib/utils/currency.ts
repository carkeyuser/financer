export function formatCurrency(amount: number | string, currency = "EUR", locale: "de" | "en" = "de"): string {
  const value = typeof amount === "string" ? parseFloat(amount) : amount
  const intlLocale = locale === "en" ? "en-US" : "de-DE"
  return new Intl.NumberFormat(intlLocale, { style: "currency", currency }).format(value)
}

const rateCache = new Map<string, { rate: number; expiresAt: number }>()

export class ExchangeRateError extends Error {
  constructor(
    public readonly currency: string,
    cause?: unknown
  ) {
    super(`EUR-Wechselkurs fuer ${currency} konnte nicht geladen werden`, { cause })
    this.name = "ExchangeRateError"
  }
}

export async function getEurRate(currency: string): Promise<number> {
  const trimmedCurrency = currency.trim()
  if (trimmedCurrency === "GBX" || trimmedCurrency === "GBp") return (await getEurRate("GBP")) / 100

  const normalizedCurrency = trimmedCurrency.toUpperCase()
  if (!normalizedCurrency || normalizedCurrency === "EUR") return 1.0

  const now = Date.now()
  const cached = rateCache.get(normalizedCurrency)
  if (cached && cached.expiresAt > now) return cached.rate

  const symbol = `EUR${normalizedCurrency}=X`
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
        Referer: "https://finance.yahoo.com",
      },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) throw new Error("rate fetch failed")
    const data = await res.json()
    const forexRate = data?.chart?.result?.[0]?.meta?.regularMarketPrice as number | undefined
    if (!forexRate || forexRate === 0) throw new Error("no rate")

    const eurRate = 1 / forexRate
    rateCache.set(normalizedCurrency, { rate: eurRate, expiresAt: now + 60_000 })
    return eurRate
  } catch (error) {
    if (cached) return cached.rate
    throw new ExchangeRateError(normalizedCurrency, error)
  }
}
