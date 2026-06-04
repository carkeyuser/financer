import type { Metadata } from "next"
import { Geist, Orbitron } from "next/font/google"
import { APP_THEMES } from "@/lib/constants/themes"
import { ThemeProvider } from "next-themes"
import { Toaster } from "@/components/ui/sonner"
import { QueryProvider } from "@/components/providers/QueryProvider"
import { AppProviders } from "@/components/providers/AppProviders"
import { auth } from "@/lib/auth"
import { sessionLocale } from "@/lib/session-locale"
import { RetrowaveAmbience } from "@/components/theme/RetrowaveAmbience"
import "./globals.css"

const geist = Geist({ subsets: ["latin"] })
const orbitron = Orbitron({ subsets: ["latin"], variable: "--font-orbitron" })

export const metadata: Metadata = {
  title: "Finance Dashboard",
  description: "Personal finance dashboard",
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const lang = sessionLocale(session)

  return (
    <html lang={lang} suppressHydrationWarning>
      <body className={`${geist.className} ${orbitron.variable}`}>
        <AppProviders>
          <QueryProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              themes={[...APP_THEMES]}
            >
              <RetrowaveAmbience />
              <div className="relative z-10 min-h-screen">
                {children}
                <Toaster />
              </div>
            </ThemeProvider>
          </QueryProvider>
        </AppProviders>
      </body>
    </html>
  )
}
