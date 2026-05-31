import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { authenticator } from "@otplib/preset-default"
import { z } from "zod"
import { isLocale } from "@/i18n/locales"

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  totp: z.string().optional(),
})

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  trustHost: true,
  pages: {
    signIn: "/auth/login",
  },
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const user = await prisma.user.findUnique({
          where: { username: parsed.data.username },
          include: {
            householdMemberships: {
              select: { householdId: true },
              orderBy: { joinedAt: "asc" },
              take: 1,
            },
          },
        })

        if (!user?.passwordHash) return null

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash)
        if (!valid) return null

        if (user.twoFactorEnabled && user.twoFactorSecret) {
          if (!parsed.data.totp) return null
          const totpValid = authenticator.verify({
            token: parsed.data.totp,
            secret: user.twoFactorSecret,
          })
          if (!totpValid) return null
        }

        const locale = isLocale(user.locale) ? user.locale : "de"

        return {
          id: user.id,
          email: user.email ?? user.username,
          name: user.name ?? user.username,
          username: user.username,
          householdId: user.householdMemberships[0]?.householdId ?? null,
          locale,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.username = (user as { username?: string }).username ?? ""
        token.householdId = (user as { householdId?: string | null }).householdId ?? null
        token.locale = (user as { locale?: string }).locale ?? "de"
      }
      if (trigger === "update") {
        if (session?.householdId !== undefined) {
          token.householdId = session.householdId as string | null
        }
        if (session?.name !== undefined) {
          token.name = session.name as string | null
        }
        if (session?.username !== undefined) {
          token.username = session.username as string
        }
        if (session?.locale !== undefined && isLocale(session.locale as string)) {
          token.locale = session.locale as string
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.username = token.username
        session.user.householdId = token.householdId
        session.user.locale = isLocale(token.locale as string) ? (token.locale as "de" | "en") : "de"
      }
      return session
    },
  },
})
