"use client"

import { useI18n } from "@/i18n/context"
import { HouseholdContent } from "./HouseholdContent"

export default function HouseholdPage() {
  const { t } = useI18n()
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("nav.users")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("household.pageDescription")}</p>
      </div>
      <HouseholdContent />
    </div>
  )
}
