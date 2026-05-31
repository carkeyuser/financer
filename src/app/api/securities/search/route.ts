import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

const YAHOO_TYPE_MAP: Record<string, string> = {
  Equity: "STOCK",
  ETF: "ETF",
  Cryptocurrency: "CRYPTO",
  Bond: "BOND",
}

interface SecurityResult {
  symbol: string
  name: string
  exchange: string
  typeDisp: string
  assetType: string
}

const POPULAR_CRYPTOS: Array<{ symbol: string; name: string; aliases: string[] }> = [
  { symbol: "BTC-USD",  name: "Bitcoin",         aliases: ["btc", "bitcoin"] },
  { symbol: "ETH-USD",  name: "Ethereum",         aliases: ["eth", "ether", "ethereum"] },
  { symbol: "XRP-USD",  name: "XRP (Ripple)",     aliases: ["xrp", "ripple"] },
  { symbol: "SOL-USD",  name: "Solana",           aliases: ["sol", "solana"] },
  { symbol: "BNB-USD",  name: "BNB",              aliases: ["bnb", "binance coin"] },
  { symbol: "ADA-USD",  name: "Cardano",          aliases: ["ada", "cardano"] },
  { symbol: "DOGE-USD", name: "Dogecoin",         aliases: ["doge", "dogecoin"] },
  { symbol: "AVAX-USD", name: "Avalanche",        aliases: ["avax", "avalanche"] },
  { symbol: "DOT-USD",  name: "Polkadot",         aliases: ["dot", "polkadot"] },
  { symbol: "LINK-USD", name: "Chainlink",        aliases: ["link", "chainlink"] },
  { symbol: "LTC-USD",  name: "Litecoin",         aliases: ["ltc", "litecoin"] },
  { symbol: "MATIC-USD",name: "Polygon (MATIC)",  aliases: ["matic", "polygon"] },
  { symbol: "XLM-USD",  name: "Stellar",          aliases: ["xlm", "stellar"] },
  { symbol: "TRX-USD",  name: "TRON",             aliases: ["trx", "tron"] },
  { symbol: "TON-USD",  name: "Toncoin",          aliases: ["ton", "toncoin"] },
  { symbol: "SHIB-USD", name: "Shiba Inu",        aliases: ["shib", "shiba inu", "shiba"] },
  { symbol: "SUI-USD",  name: "Sui",              aliases: ["sui"] },
  { symbol: "PEPE-USD", name: "Pepe",             aliases: ["pepe"] },
]

function searchPopularCryptos(q: string): SecurityResult[] {
  const lower = q.toLowerCase()
  return POPULAR_CRYPTOS
    .filter((c) => c.aliases.some((a) => a.includes(lower) || lower.includes(a)))
    .map((c) => ({
      symbol: c.symbol,
      name: c.name,
      exchange: "Crypto",
      typeDisp: "Cryptocurrency",
      assetType: "CRYPTO",
    }))
}

async function searchYahoo(q: string): Promise<SecurityResult[]> {
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=10&newsCount=0&enableFuzzyQuery=true&enableNavLinks=false`
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data?.quotes ?? [])
      .filter((q: Record<string, string>) => q.symbol && q.quoteType)
      .map((q: Record<string, string>) => ({
        symbol: q.symbol,
        name: q.shortname || q.longname || q.symbol,
        exchange: q.exchDisp || "",
        typeDisp: q.quoteType || "",
        assetType: YAHOO_TYPE_MAP[q.quoteType] ?? "OTHER",
      }))
  } catch {
    return []
  }
}

async function searchCoinGecko(q: string): Promise<SecurityResult[]> {
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(q)}`,
      {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(3000),
      }
    )
    if (!res.ok) return []
    const data = await res.json()
    return ((data.coins ?? []) as { name: string; symbol: string }[])
      .slice(0, 5)
      .map((coin) => ({
        symbol: `${coin.symbol.toUpperCase()}-USD`,
        name: coin.name,
        exchange: "Crypto",
        typeDisp: "Cryptocurrency",
        assetType: "CRYPTO",
      }))
  } catch {
    return []
  }
}

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.householdId) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")?.trim()
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const mightBeCrypto = !q.includes(".")

  const [yahooResults, geckoResults] = await Promise.all([
    searchYahoo(q),
    mightBeCrypto ? searchCoinGecko(q) : Promise.resolve([]),
  ])

  const popularResults = mightBeCrypto ? searchPopularCryptos(q) : []

  // Popular crypto list first, then Yahoo, then CoinGecko — dedup by symbol
  const seen = new Set<string>()
  const results: SecurityResult[] = []
  for (const r of [...popularResults, ...yahooResults, ...geckoResults]) {
    if (!seen.has(r.symbol)) {
      seen.add(r.symbol)
      results.push(r)
    }
  }

  return NextResponse.json({ results })
}
