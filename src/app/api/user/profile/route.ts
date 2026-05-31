import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createProfileSchema } from "@/lib/validations/settings"
import { isLocale } from "@/i18n/locales"

export async function PATCH(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 })
  }

  const body = await request.json()
  const parsed = createProfileSchema(session.user.locale ?? "de").safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({
    where: { username: parsed.data.username },
    select: { id: true },
  })
  if (existing && existing.id !== session.user.id) {
    return NextResponse.json(
      { error: { username: ["Benutzername bereits vergeben"] } },
      { status: 400 }
    )
  }

  const locale = parsed.data.locale && isLocale(parsed.data.locale) ? parsed.data.locale : undefined

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: parsed.data.name || null,
      username: parsed.data.username,
      ...(locale ? { locale } : {}),
    },
    select: { id: true, name: true, username: true, locale: true },
  })

  return NextResponse.json(user)
}
