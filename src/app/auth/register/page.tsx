"use client"

import { useState, Suspense, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { createRegisterSchema, type RegisterInput } from "@/lib/validations/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useI18n } from "@/i18n/context"
import { translateApiError } from "@/i18n/api-errors"

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteToken = searchParams.get("inviteToken")
  const { locale, t } = useI18n()
  const [error, setError] = useState<string | null>(null)

  const registerSchema = useMemo(() => createRegisterSchema(locale), [locale])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      inviteToken: inviteToken ?? undefined,
    },
  })

  async function onSubmit(data: RegisterInput) {
    setError(null)
    const payload = {
      ...data,
      inviteToken: inviteToken ?? data.inviteToken,
      householdName: inviteToken ? undefined : data.householdName,
    }
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const body = await res.json()
      const firstError = Object.values(body.error ?? {})[0]
      setError(
        Array.isArray(firstError)
          ? translateApiError(firstError[0] as string, locale)
          : t("auth.registrationFailed")
      )
      return
    }

    if (inviteToken) {
      router.push(`/auth/login?registered=1&callbackUrl=${encodeURIComponent(`/auth/accept-invite?token=${inviteToken}`)}`)
    } else {
      router.push("/auth/login?registered=1")
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t("auth.registerTitle")}</CardTitle>
        <CardDescription>
          {inviteToken ? t("auth.registerDescriptionInvite") : t("auth.registerDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {inviteToken && <input type="hidden" {...register("inviteToken")} value={inviteToken} />}
          <div className="space-y-1">
            <Label htmlFor="name">{t("auth.displayName")}</Label>
            <Input id="name" placeholder="Max Mustermann" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="username">{t("auth.username")}</Label>
            <Input
              id="username"
              type="text"
              placeholder="max_mustermann"
              autoComplete="username"
              {...register("username")}
            />
            {errors.username && <p className="text-sm text-destructive">{errors.username.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">{t("auth.password")}</Label>
            <Input id="password" type="password" {...register("password")} />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>
          {!inviteToken && (
            <div className="space-y-1">
              <Label htmlFor="householdName">{t("auth.householdName")}</Label>
              <Input
                id="householdName"
                placeholder="Familie Mustermann"
                {...register("householdName")}
              />
              {errors.householdName && (
                <p className="text-sm text-destructive">{errors.householdName.message}</p>
              )}
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? t("auth.creatingAccount") : t("auth.registerTitle")}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {t("auth.hasAccount")}{" "}
          <Link href="/auth/login" className="underline underline-offset-4 hover:text-primary">
            {t("auth.login")}
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Suspense>
        <RegisterForm />
      </Suspense>
    </div>
  )
}
