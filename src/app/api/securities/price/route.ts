import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { fetchSecurityPriceFromYahoo } from "@/lib/services/security-price"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.householdId) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get("symbol")?.trim()
  if (!symbol) {
    return NextResponse.json({ error: "Symbol fehlt" }, { status: 400 })
  }

  const quote = await fetchSecurityPriceFromYahoo(symbol)
  return NextResponse.json(quote)
}
