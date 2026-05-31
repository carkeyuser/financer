import "next-auth"
import type { Locale } from "@/i18n/locales"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      username: string
      householdId: string | null
      locale: Locale
    } & DefaultSession["user"]
  }

  interface User {
    username?: string
    householdId?: string | null
    locale?: Locale
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    username: string
    householdId: string | null
    locale: string
  }
}

declare module "next-auth/react" {
  interface Session {
    locale?: Locale
  }
}
