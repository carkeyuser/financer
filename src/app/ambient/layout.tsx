import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AmbientShell } from "@/components/ambient/AmbientShell"

export default async function AmbientLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session?.user) {
    redirect("/auth/login")
  }

  const security = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { twoFactorEnabled: true, twoFactorSecret: true },
  })
  const needsTwoFactorSetup = security?.twoFactorEnabled && !security.twoFactorSecret
  if (needsTwoFactorSetup) {
    redirect("/settings?setup2fa=1")
  }

  return <AmbientShell>{children}</AmbientShell>
}
