"use client"

import { useI18n } from "@/i18n/context"

export function AssetEntryPageHeader() {
  const { t } = useI18n()
  return <h1 className="text-2xl font-bold mb-6">{t("investments.addEntryTitle")}</h1>
}
