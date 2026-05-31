import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AuthenticatedDialogs } from "./AuthenticatedDialogs"
import { Sidebar } from "./Sidebar"
import { ThemeToggle } from "./ThemeToggle"
import { MobileTopBar } from "./MobileTopBar"
import { prisma } from "@/lib/prisma"

export async function AuthGuard({
  children,
  allowPendingTwoFactorSetup = false,
}: {
  children: React.ReactNode
  allowPendingTwoFactorSetup?: boolean
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/auth/login")
  }

  const security = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { twoFactorEnabled: true, twoFactorSecret: true },
  })
  const needsTwoFactorSetup = security?.twoFactorEnabled && !security.twoFactorSecret
  if (needsTwoFactorSetup && !allowPendingTwoFactorSetup) {
    redirect("/settings?setup2fa=1")
  }

  const householdId = session.user.householdId
  let householdName: string | null = null

  if (householdId) {
    const household = await prisma.household.findUnique({
      where: { id: householdId },
      select: { name: true },
    })
    householdName = household?.name ?? null
  }

  return (
    <div className="min-h-screen md:flex">
      <AuthenticatedDialogs />
      <Sidebar householdName={householdName} />
      <div className="flex-1 flex flex-col">
        <MobileTopBar householdName={householdName} />
        <header className="hidden h-14 border-b items-center justify-end px-6 gap-2 bg-card md:flex">
          <ThemeToggle />
        </header>
        <main className="flex-1 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
