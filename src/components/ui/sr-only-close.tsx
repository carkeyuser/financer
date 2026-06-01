"use client"

import { useI18n } from "@/i18n/context"

export function SrOnlyClose() {
  const { t } = useI18n()
  return <span className="sr-only">{t("common.close")}</span>
}
