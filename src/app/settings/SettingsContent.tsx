"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { ShieldCheck, ShieldOff, ShieldAlert } from "lucide-react"
import { z } from "zod"
import {
  createProfileSchema,
  createPasswordSchema,
  type ProfileInput,
  type PasswordInput,
} from "@/lib/validations/settings"
import { useHousehold } from "@/hooks/useHousehold"
import { BackupCard } from "./BackupCard"
import { LanguageCard } from "./LanguageCard"
import { useI18n } from "@/i18n/context"
import { translateApiError } from "@/i18n/api-errors"
import { getMessages } from "@/i18n/messages"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"

type TotpInput = { token: string }

function TwoFactorCard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { locale, t } = useI18n()
  const forceSetup = searchParams.get("setup2fa") === "1"
  const totpSchema = useMemo(
    () => z.object({ token: z.string().length(6, getMessages(locale).validation.totpLength) }),
    [locale]
  )
  const qc = useQueryClient()
  const [step, setStep] = useState<"idle" | "setup" | "confirm" | "disable-confirm">("idle")
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [setupStarted, setSetupStarted] = useState(false)

  const { data: tfaStatus, isLoading } = useQuery({
    queryKey: ["2fa-status"],
    queryFn: async () => {
      const res = await fetch("/api/user/2fa")
      if (!res.ok) throw new Error(t("settings.twoFactorLoadFailed"))
      return res.json() as Promise<{ enabled: boolean; configured: boolean }>
    },
  })

  const totpForm = useForm<TotpInput>({ resolver: zodResolver(totpSchema), mode: "onChange" })
  const disableForm = useForm<TotpInput>({ resolver: zodResolver(totpSchema), mode: "onChange" })

  const handleSetup = useCallback(async () => {
    const res = await fetch("/api/user/2fa", { method: "POST" })
    if (!res.ok) { toast.error(t("settings.twoFactorSetupFailed")); return }
    const data = await res.json() as { qrCodeDataUrl: string; secret: string }
    setQrCodeDataUrl(data.qrCodeDataUrl)
    setSecret(data.secret)
    setStep("setup")
  }, [t])

  useEffect(() => {
    if (!forceSetup || isLoading || setupStarted || step !== "idle") return
    if (tfaStatus?.enabled && !tfaStatus.configured) {
      setSetupStarted(true)
      void handleSetup()
    }
  }, [forceSetup, handleSetup, isLoading, setupStarted, step, tfaStatus?.configured, tfaStatus?.enabled])

  async function handleConfirm(data: TotpInput) {
    const res = await fetch("/api/user/2fa", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: data.token, secret: secret ?? undefined }),
    })
    if (!res.ok) {
      const err = await res.json() as { error?: string }
      toast.error(translateApiError(err, locale))
      totpForm.reset()
      return
    }
    toast.success(t("settings.twoFactorActivated"))
    setStep("idle")
    setSecret(null)
    setQrCodeDataUrl(null)
    await qc.invalidateQueries({ queryKey: ["2fa-status"] })
    if (forceSetup) {
      router.replace("/settings")
    }
  }

  function handleDisable() {
    disableForm.reset()
    setStep("disable-confirm")
  }

  async function handleDisableConfirm(data: TotpInput) {
    const res = await fetch("/api/user/2fa", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: data.token }),
    })
    if (!res.ok) {
      const err = await res.json() as { error?: string }
      toast.error(translateApiError(err, locale))
      disableForm.reset()
      return
    }
    toast.success(t("settings.twoFactorDeactivated"))
    setStep("idle")
    setQrCodeDataUrl(null)
    setSecret(null)
    qc.invalidateQueries({ queryKey: ["2fa-status"] })
  }

  if (isLoading) return null

  const isEnabled = tfaStatus?.enabled && tfaStatus?.configured

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              {isEnabled ? (
                <ShieldCheck className="h-4 w-4 text-green-500" />
              ) : tfaStatus?.enabled && !tfaStatus?.configured ? (
                <ShieldAlert className="h-4 w-4 text-amber-500" />
              ) : (
                <ShieldOff className="h-4 w-4 text-muted-foreground" />
              )}
              {t("settings.twoFactorTitle")}
            </CardTitle>
            <CardDescription className="mt-1">
              {isEnabled
                ? t("settings.twoFactorActive")
                : tfaStatus?.enabled && !tfaStatus?.configured
                ? t("settings.twoFactorPending")
                : t("settings.twoFactorInactive")}
            </CardDescription>
          </div>
          {isEnabled && (
            <Badge variant="secondary" className="text-green-600 border-green-200 bg-green-50">
              {t("settings.twoFactorBadgeActive")}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {forceSetup && tfaStatus?.enabled && !tfaStatus.configured && (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {t("settings.twoFactorForcedSetup")}
          </p>
        )}

        {step === "idle" && (
          <div className="flex flex-col gap-2 sm:flex-row">
            {!isEnabled && (
              <Button type="button" variant="outline" onClick={handleSetup}>
                {t("settings.twoFactorSetup")}
              </Button>
            )}
            {isEnabled && (
              <Button type="button" variant="destructive" onClick={handleDisable}>
                {t("settings.twoFactorDisable")}
              </Button>
            )}
          </div>
        )}

        {step === "setup" && qrCodeDataUrl && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("settings.twoFactorScanQr")}</p>
            <img src={qrCodeDataUrl} alt="2FA QR" className="w-48 h-48 max-w-full border rounded-md" />
            {secret && (
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer">{t("settings.twoFactorManualSecret")}</summary>
                <code className="block mt-1 break-all font-mono bg-muted px-2 py-1 rounded">
                  {secret}
                </code>
              </details>
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" onClick={() => setStep("confirm")}>
                {t("settings.twoFactorContinue")}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setStep("idle")}>
                {t("common.cancel")}
              </Button>
            </div>
          </div>
        )}

        {step === "confirm" && (
          <form onSubmit={totpForm.handleSubmit(handleConfirm)} className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("settings.twoFactorConfirmHint")}</p>
            <div className="space-y-1">
              <Label htmlFor="token">{t("auth.authenticatorCode")}</Label>
              <Input
                id="token"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="123456"
                autoFocus
                {...totpForm.register("token")}
              />
              {totpForm.formState.errors.token && (
                <p className="text-sm text-destructive">
                  {totpForm.formState.errors.token.message}
                </p>
              )}
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={() => setStep("setup")}>
                {t("common.back")}
              </Button>
              <Button type="submit" disabled={totpForm.formState.isSubmitting}>
                {totpForm.formState.isSubmitting ? t("common.checking") : t("settings.twoFactorActivate")}
              </Button>
            </div>
          </form>
        )}

        {step === "disable-confirm" && (
          <form onSubmit={disableForm.handleSubmit(handleDisableConfirm)} className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("settings.twoFactorDisableHint")}</p>
            <div className="space-y-1">
              <Label htmlFor="disable-token">{t("auth.authenticatorCode")}</Label>
              <Input
                id="disable-token"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="123456"
                autoFocus
                {...disableForm.register("token")}
              />
              {disableForm.formState.errors.token && (
                <p className="text-sm text-destructive">
                  {disableForm.formState.errors.token.message}
                </p>
              )}
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={() => setStep("idle")}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" variant="destructive" disabled={disableForm.formState.isSubmitting}>
                {disableForm.formState.isSubmitting ? t("common.checking") : t("settings.twoFactorDisable")}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}

export function SettingsContent() {
  const { data: session, update } = useSession()
  const { data: householdData } = useHousehold()
  const { locale, t } = useI18n()
  const [profilePending, setProfilePending] = useState(false)
  const [passwordPending, setPasswordPending] = useState(false)

  const profileSchema = useMemo(() => createProfileSchema(locale), [locale])
  const passwordSchema = useMemo(() => createPasswordSchema(locale), [locale])

  const profileForm = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: "", username: "" },
  })

  const passwordForm = useForm<PasswordInput>({
    resolver: zodResolver(passwordSchema),
  })

  // Populate form once session is loaded (fixes race condition with async session)
  useEffect(() => {
    if (session?.user?.id) {
      profileForm.reset({
        name: session.user.name ?? "",
        username: session.user.username ?? "",
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id])

  async function onProfile(data: ProfileInput) {
    setProfilePending(true)
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json() as { error?: Record<string, string[]> }
        if (err.error?.username?.[0]) {
          profileForm.setError("username", { message: err.error.username[0] })
        } else if (err.error?.name?.[0]) {
          profileForm.setError("name", { message: err.error.name[0] })
        } else {
          toast.error(t("settings.saveFailed"))
        }
        return
      }
      await update({ name: data.name ?? null, username: data.username })
      toast.success(t("settings.profileSaved"))
    } finally {
      setProfilePending(false)
    }
  }

  async function onPassword(data: PasswordInput) {
    setPasswordPending(true)
    try {
      const res = await fetch("/api/user/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json() as { error?: Record<string, string[]> | string }
        if (err.error && typeof err.error === "object") {
          if (err.error.currentPassword?.[0]) {
            passwordForm.setError("currentPassword", { message: err.error.currentPassword[0] })
            return
          }
          if (err.error.newPassword?.[0]) {
            passwordForm.setError("newPassword", { message: err.error.newPassword[0] })
            return
          }
        }
        toast.error(
          typeof err.error === "string"
            ? translateApiError(err.error, locale)
            : t("settings.passwordChangeFailed")
        )
        return
      }
      passwordForm.reset()
      toast.success(t("settings.passwordChanged"))
    } finally {
      setPasswordPending(false)
    }
  }

  return (
    <div className="space-y-6">
      <LanguageCard />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("settings.profile")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={profileForm.handleSubmit(onProfile)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="username">{t("settings.usernameLogin")}</Label>
              <Input id="username" {...profileForm.register("username")} />
              {profileForm.formState.errors.username && (
                <p className="text-sm text-destructive">
                  {profileForm.formState.errors.username.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="name">{t("settings.displayNameOptional")}</Label>
              <Input id="name" {...profileForm.register("name")} />
              {profileForm.formState.errors.name && (
                <p className="text-sm text-destructive">
                  {profileForm.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label>{t("settings.defaultCurrency")}</Label>
              <Input
                value={householdData?.household?.currency ?? "EUR"}
                disabled
              />
            </div>
            <Button type="submit" disabled={profilePending} className="w-full sm:w-auto">
              {profilePending ? t("common.saving") : t("common.save")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("settings.changePassword")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={passwordForm.handleSubmit(onPassword)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="currentPassword">{t("settings.currentPassword")}</Label>
              <Input
                id="currentPassword"
                type="password"
                {...passwordForm.register("currentPassword")}
              />
              {passwordForm.formState.errors.currentPassword && (
                <p className="text-sm text-destructive">
                  {passwordForm.formState.errors.currentPassword.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="newPassword">{t("settings.newPassword")}</Label>
              <Input id="newPassword" type="password" {...passwordForm.register("newPassword")} />
              {passwordForm.formState.errors.newPassword && (
                <p className="text-sm text-destructive">
                  {passwordForm.formState.errors.newPassword.message}
                </p>
              )}
            </div>
            <Button type="submit" disabled={passwordPending} className="w-full sm:w-auto">
              {passwordPending ? t("settings.changingPassword") : t("settings.changePassword")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <TwoFactorCard />

      <BackupCard />

      <Separator />

      <p className="text-xs text-muted-foreground">{t("household.accountDeleteHint")}</p>
    </div>
  )
}
