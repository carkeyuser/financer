import type { Metadata } from "next"
import { Geist } from "next/font/google"
import { ThemeProvider } from "next-themes"
import { Toaster } from "@/components/ui/sonner"
import { QueryProvider } from "@/components/providers/QueryProvider"
import { AppProviders } from "@/components/providers/AppProviders"
import { auth } from "@/lib/auth"
import { sessionLocale } from "@/lib/session-locale"
import "./globals.css"

const geist = Geist({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Finance Dashboard",
  description: "Personal finance dashboard",
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const lang = sessionLocale(session)

  return (
    <html lang={lang} suppressHydrationWarning>
      <body className={geist.className}>
        <AppProviders>
          <QueryProvider>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
              {children}
              <Toaster />
            </ThemeProvider>
          </QueryProvider>
        </AppProviders>
      </body>
    </html>
  )
}
