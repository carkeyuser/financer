import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { searchSecurities } from "@/lib/services/security-search"

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

  const results = await searchSecurities(q)
  return NextResponse.json({ results })
}
