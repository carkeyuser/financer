import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getMembership } from "@/lib/household-auth"
import { switchHouseholdSchema } from "@/lib/validations/household"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 })
  }

  const body = await request.json()
  const parsed = switchHouseholdSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const membership = await getMembership(session.user.id, parsed.data.householdId)
  if (!membership) {
    return NextResponse.json({ error: "Kein Zugriff auf diesen Haushalt" }, { status: 403 })
  }

  return NextResponse.json({ householdId: parsed.data.householdId })
}
