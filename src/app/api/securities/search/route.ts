import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { searchSecurities } from "@/lib/services/security-search"
import { parseSecuritySearchQueryParam } from "@/lib/validations/securities"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.householdId) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const parsed = parseSecuritySearchQueryParam(searchParams.get("q"))
  if ("empty" in parsed) {
    return NextResponse.json({ results: [] })
  }
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const results = await searchSecurities(parsed.q)
  return NextResponse.json({ results })
}
