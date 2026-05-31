"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useI18n } from "@/i18n/context"
import type { Locale } from "@/i18n/locales"
import { translateApiError } from "@/i18n/api-errors"

export function LanguageCard() {
  const { data: session, update } = useSession()
  const { locale, setLocale, t } = useI18n()
  const [pending, setPending] = useState(false)

  async function onChange(next: Locale) {
    if (next === locale) return
    setPending(true)
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale: next,
          username: session?.user?.username,
          name: session?.user?.name ?? "",
        }),
      })
      if (!res.ok) {
        toast.error(translateApiError(await res.json(), locale))
        return
      }
      setLocale(next)
      await update({ locale: next })
      toast.success(t("settings.languageSaved"))
    } finally {
      setPending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("settings.language")}</CardTitle>
        <CardDescription>{t("settings.languageDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-w-xs">
          <Label htmlFor="locale">{t("settings.language")}</Label>
          <Select
            value={locale}
            onValueChange={(v) => onChange(v as Locale)}
            disabled={pending}
          >
            <SelectTrigger id="locale" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="de">{t("settings.languageGerman")}</SelectItem>
              <SelectItem value="en">{t("settings.languageEnglish")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}
