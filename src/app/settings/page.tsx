"use client"

import { useI18n } from "@/i18n/context"
import { SettingsContent } from "./SettingsContent"

export default function SettingsPage() {
  const { t } = useI18n()
  return (
    <div className="space-y-8 max-w-lg">
      <div>
        <h1 className="text-2xl font-semibold">{t("nav.settings")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("settings.pageDescription")}</p>
      </div>
      <SettingsContent />
    </div>
  )
}
