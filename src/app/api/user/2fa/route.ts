import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { authenticator } from "@otplib/preset-default"
import QRCode from "qrcode"
import { z } from "zod"

// GET — returns current 2FA status for the logged-in user
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { twoFactorEnabled: true, twoFactorSecret: true },
  })

  return NextResponse.json({
    enabled: user?.twoFactorEnabled ?? false,
    configured: !!(user?.twoFactorEnabled && user?.twoFactorSecret),
  })
}

// POST /api/user/2fa — generate a new TOTP secret and return the QR code data URL.
// The secret is stored only after confirmation so admin-forced setup stays pending.
export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { username: true, twoFactorEnabled: true, twoFactorSecret: true },
  })
  if (!user) return NextResponse.json({ error: "Benutzer nicht gefunden" }, { status: 404 })
  if (user.twoFactorEnabled && user.twoFactorSecret) {
    return NextResponse.json({ error: "2FA ist bereits aktiv" }, { status: 400 })
  }

  const secret = authenticator.generateSecret()
  const otpAuthUrl = authenticator.keyuri(user.username, "Financer", secret)
  const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl)

  if (!user.twoFactorEnabled && user.twoFactorSecret) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { twoFactorSecret: null },
    })
  }

  return NextResponse.json({ qrCodeDataUrl, secret })
}

// PATCH — confirm setup: validate TOTP code and set twoFactorEnabled = true
export async function PATCH(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 })
  }

  const body = await request.json()
  const parsed = z.object({
    token: z.string().length(6),
    secret: z.string().min(1).optional(),
  }).safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültiger Code" }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { twoFactorSecret: true },
  })

  const secret = parsed.data.secret ?? user?.twoFactorSecret
  if (!secret) {
    return NextResponse.json({ error: "Kein Secret vorhanden — zuerst Setup aufrufen" }, { status: 400 })
  }

  const isValid = authenticator.verify({ token: parsed.data.token, secret })
  if (!isValid) {
    return NextResponse.json({ error: "Code ungültig oder abgelaufen" }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { twoFactorEnabled: true, twoFactorSecret: secret },
  })

  return NextResponse.json({ success: true })
}

// DELETE — disable 2FA; requires a valid TOTP token to confirm
export async function DELETE(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 })
  }

  const body = await request.json()
  const parsed = z.object({ token: z.string().length(6) }).safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültiger Code" }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { twoFactorSecret: true, twoFactorEnabled: true },
  })

  if (!user?.twoFactorEnabled || !user?.twoFactorSecret) {
    return NextResponse.json({ error: "2FA ist nicht aktiv" }, { status: 400 })
  }

  const isValid = authenticator.verify({ token: parsed.data.token, secret: user.twoFactorSecret })
  if (!isValid) {
    return NextResponse.json({ error: "Code ungültig oder abgelaufen" }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { twoFactorEnabled: false, twoFactorSecret: null },
  })

  return NextResponse.json({ success: true })
}
