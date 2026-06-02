import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { fetchSecurityPriceFromYahoo } from "@/lib/services/security-price"
import { parseSecuritySymbolParam } from "@/lib/validations/securities"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.householdId) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const parsed = parseSecuritySymbolParam(searchParams.get("symbol"))
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const quote = await fetchSecurityPriceFromYahoo(parsed.symbol)
  return NextResponse.json(quote)
}
