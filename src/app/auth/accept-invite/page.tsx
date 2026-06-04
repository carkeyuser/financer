"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { toast } from "sonner"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useI18n } from "@/i18n/context"
import { translateApiError } from "@/i18n/api-errors"

function AcceptInviteInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const { status, update } = useSession()
  const { locale, t } = useI18n()
  const [inviteInfo, setInviteInfo] = useState<{
    householdName: string
    email: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)

  useEffect(() => {
    if (!token) return
    fetch(`/api/household/accept-invite?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (!res.ok) {
          setError(t("auth.acceptInviteInvalid"))
          return
        }
        const data = await res.json()
        setInviteInfo({ householdName: data.householdName, email: data.email })
      })
      .catch(() => setError(t("auth.acceptInviteLoadFailed")))
  }, [token, t])

  async function acceptInvite() {
    if (!token) return
    setAccepting(true)
    try {
      const res = await fetch("/api/household/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(translateApiError(data, locale))
        return
      }
      await update({ householdId: data.householdId })
      toast.success(
        t("auth.welcomeHousehold").replace(
          "{name}",
          data.householdName ?? t("auth.welcomeHouseholdDefault")
        )
      )
      router.push("/dashboard")
    } catch {
      setError(t("auth.acceptInviteFailed"))
    } finally {
      setAccepting(false)
    }
  }

  if (!token) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <p className="text-destructive text-sm">{t("auth.acceptInviteBadLink")}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{t("auth.acceptInviteTitle")}</CardTitle>
        <CardDescription>
          {inviteInfo
            ? t("auth.acceptInviteInvited").replace("{name}", inviteInfo.householdName)
            : t("auth.acceptInviteLoading")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}

        {status === "loading" && (
          <p className="text-sm text-muted-foreground">{t("auth.sessionLoading")}</p>
        )}

        {status === "unauthenticated" && inviteInfo && (
          <div className="space-y-3">
            <p className="text-sm">{t("auth.acceptInvitePrompt")}</p>
            <Link
              href={`/auth/login?callbackUrl=/auth/accept-invite?token=${token}`}
              className={cn(buttonVariants(), "w-full")}
            >
              {t("auth.login")}
            </Link>
            <Link
              href={`/auth/register?inviteToken=${token}`}
              className={cn(buttonVariants({ variant: "outline" }), "w-full")}
            >
              {t("auth.registerTitle")}
            </Link>
          </div>
        )}

        {status === "authenticated" && inviteInfo && !error && (
          <Button className="w-full" onClick={acceptInvite} disabled={accepting}>
            {accepting ? t("auth.joining") : t("auth.acceptInvite")}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export default function AcceptInvitePage() {
  const { t } = useI18n()
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Suspense fallback={<p className="text-muted-foreground">{t("common.loading")}</p>}>
        <AcceptInviteInner />
      </Suspense>
    </div>
  )
}
