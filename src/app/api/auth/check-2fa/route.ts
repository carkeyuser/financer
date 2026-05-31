import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

type TwoFactorState = "off" | "pending_setup" | "active"

// Public route: checks credentials and returns whether TOTP is required.
// Does not create a session — only used to drive the two-step login UI.
export async function POST(request: Request) {
  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ valid: false, twoFactorRequired: false, twoFactorState: "off" satisfies TwoFactorState })
  }

  const user = await prisma.user.findUnique({
    where: { username: parsed.data.username },
    select: { passwordHash: true, twoFactorEnabled: true, twoFactorSecret: true },
  })

  if (!user?.passwordHash) {
    return NextResponse.json({ valid: false, twoFactorRequired: false, twoFactorState: "off" satisfies TwoFactorState })
  }

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash)
  if (!valid) {
    return NextResponse.json({ valid: false, twoFactorRequired: false, twoFactorState: "off" satisfies TwoFactorState })
  }

  const twoFactorState: TwoFactorState = user.twoFactorEnabled
    ? user.twoFactorSecret
      ? "active"
      : "pending_setup"
    : "off"

  return NextResponse.json({
    valid: true,
    twoFactorRequired: twoFactorState === "active",
    twoFactorState,
  })
}
