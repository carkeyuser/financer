const YAHOO_TYPE_MAP: Record<string, string> = {
  Equity: "STOCK",
  ETF: "ETF",
  Cryptocurrency: "CRYPTO",
  Bond: "BOND",
}

export interface SecuritySearchResult {
  symbol: string
  name: string
  exchange: string
  typeDisp: string
  assetType: "STOCK" | "ETF" | "CRYPTO" | "BOND" | "OTHER"
}

const POPULAR_CRYPTOS: Array<{ symbol: string; name: string; aliases: string[] }> = [
  { symbol: "BTC-USD", name: "Bitcoin", aliases: ["btc", "bitcoin"] },
  { symbol: "ETH-USD", name: "Ethereum", aliases: ["eth", "ether", "ethereum"] },
  { symbol: "XRP-USD", name: "XRP (Ripple)", aliases: ["xrp", "ripple"] },
  { symbol: "SOL-USD", name: "Solana", aliases: ["sol", "solana"] },
]

function searchPopularCryptos(q: string): SecuritySearchResult[] {
  const lower = q.toLowerCase()
  return POPULAR_CRYPTOS.filter((c) => c.aliases.some((a) => a.includes(lower) || lower.includes(a))).map(
    (c) => ({
      symbol: c.symbol,
      name: c.name,
      exchange: "Crypto",
      typeDisp: "Cryptocurrency",
      assetType: "CRYPTO",
    })
  )
}

async function searchYahoo(q: string): Promise<SecuritySearchResult[]> {
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=10&newsCount=0&enableFuzzyQuery=true&enableNavLinks=false`
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data?.quotes ?? [])
      .filter((quote: Record<string, string>) => quote.symbol && quote.quoteType)
      .map((quote: Record<string, string>) => ({
        symbol: quote.symbol,
        name: quote.shortname || quote.longname || quote.symbol,
        exchange: quote.exchDisp || "",
        typeDisp: quote.quoteType || "",
        assetType: (YAHOO_TYPE_MAP[quote.quoteType] ?? "OTHER") as SecuritySearchResult["assetType"],
      }))
  } catch {
    return []
  }
}

async function searchCoinGecko(q: string): Promise<SecuritySearchResult[]> {
  try {
    const res = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(q)}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) return []
    const data = await res.json()
    return ((data.coins ?? []) as { name: string; symbol: string }[]).slice(0, 5).map((coin) => ({
      symbol: `${coin.symbol.toUpperCase()}-USD`,
      name: coin.name,
      exchange: "Crypto",
      typeDisp: "Cryptocurrency",
      assetType: "CRYPTO" as const,
    }))
  } catch {
    return []
  }
}

export async function searchSecurities(q: string): Promise<SecuritySearchResult[]> {
  const trimmed = q.trim()
  if (trimmed.length < 2) return []

  const mightBeCrypto = !trimmed.includes(".")
  const [yahooResults, geckoResults] = await Promise.all([
    searchYahoo(trimmed),
    mightBeCrypto ? searchCoinGecko(trimmed) : Promise.resolve([]),
  ])
  const popularResults = mightBeCrypto ? searchPopularCryptos(trimmed) : []

  const seen = new Set<string>()
  const results: SecuritySearchResult[] = []
  for (const r of [...popularResults, ...yahooResults, ...geckoResults]) {
    if (!seen.has(r.symbol)) {
      seen.add(r.symbol)
      results.push(r)
    }
  }
  return results
}
