import { NextResponse } from "next/server"
import { getVersionInfo } from "@/lib/services/app-update"
import { requireSession } from "@/lib/household-auth"

export async function GET() {
  const ctx = await requireSession()
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  }

  return NextResponse.json(getVersionInfo())
}
