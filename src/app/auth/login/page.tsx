"use client"

import { Suspense, useState, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { z } from "zod"
import { createLoginSchema, type LoginInput } from "@/lib/validations/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useI18n } from "@/i18n/context"
import { getMessages } from "@/i18n/messages"
import { markLoginSnapshotPending } from "@/lib/constants/login-snapshot"

type TotpInput = { token: string }
type TwoFactorState = "off" | "pending_setup" | "active"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { locale, t } = useI18n()
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard"
  const registered = searchParams.get("registered")

  const [error, setError] = useState<string | null>(null)
  const [pendingCreds, setPendingCreds] = useState<LoginInput | null>(null)

  const loginSchema = useMemo(() => createLoginSchema(locale), [locale])
  const totpSchema = useMemo(
    () => z.object({ token: z.string().length(6, getMessages(locale).validation.totpLength) }),
    [locale]
  )

  const credForm = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })
  const totpForm = useForm<TotpInput>({ resolver: zodResolver(totpSchema) })

  async function onCredentials(data: LoginInput) {
    setError(null)
    const res = await fetch("/api/auth/check-2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    const json = await res.json() as {
      valid: boolean
      twoFactorRequired: boolean
      twoFactorState?: TwoFactorState
    }

    if (!json.valid) {
      setError(t("auth.invalidCredentials"))
      return
    }

    const twoFactorState = json.twoFactorState ?? (json.twoFactorRequired ? "active" : "off")

    if (twoFactorState === "active") {
      setPendingCreds(data)
      return
    }

    const result = await signIn("credentials", {
      username: data.username,
      password: data.password,
      redirect: false,
    })
    if (result?.error) {
      setError(t("auth.loginFailed"))
      return
    }
    if (twoFactorState !== "pending_setup") {
      markLoginSnapshotPending()
    }
    router.push(twoFactorState === "pending_setup" ? "/settings?setup2fa=1" : callbackUrl)
    router.refresh()
  }

  async function onTotp(data: TotpInput) {
    if (!pendingCreds) return
    setError(null)
    const result = await signIn("credentials", {
      username: pendingCreds.username,
      password: pendingCreds.password,
      totp: data.token,
      redirect: false,
    })
    if (result?.error) {
      setError(t("auth.invalidTotp"))
      totpForm.reset()
      return
    }
    markLoginSnapshotPending()
    router.push(callbackUrl)
    router.refresh()
  }

  if (pendingCreds) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t("auth.twoFactorTitle")}</CardTitle>
          <CardDescription>{t("auth.twoFactorDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={totpForm.handleSubmit(onTotp)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="token">{t("auth.authenticatorCode")}</Label>
              <Input
                id="token"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="123456"
                autoComplete="one-time-code"
                autoFocus
                {...totpForm.register("token")}
              />
              {totpForm.formState.errors.token && (
                <p className="text-sm text-destructive">
                  {totpForm.formState.errors.token.message}
                </p>
              )}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => { setPendingCreds(null); setError(null) }}
              >
                {t("common.back")}
              </Button>
              <Button type="submit" className="flex-1" disabled={totpForm.formState.isSubmitting}>
                {totpForm.formState.isSubmitting ? t("common.checking") : t("common.confirm")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t("auth.loginTitle")}</CardTitle>
        <CardDescription>
          {registered ? t("auth.loginRegistered") : t("auth.loginDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={credForm.handleSubmit(onCredentials)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="username">{t("auth.username")}</Label>
            <Input
              id="username"
              type="text"
              placeholder="mein_benutzername"
              autoComplete="username"
              {...credForm.register("username")}
            />
            {credForm.formState.errors.username && (
              <p className="text-sm text-destructive">{credForm.formState.errors.username.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">{t("auth.password")}</Label>
            <Input id="password" type="password" {...credForm.register("password")} />
            {credForm.formState.errors.password && (
              <p className="text-sm text-destructive">
                {credForm.formState.errors.password.message}
              </p>
            )}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={credForm.formState.isSubmitting}>
            {credForm.formState.isSubmitting ? t("common.checking") : t("auth.login")}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {t("auth.noAccount")}{" "}
          <Link href="/auth/register" className="underline underline-offset-4 hover:text-primary">
            {t("auth.register")}
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  )
}
