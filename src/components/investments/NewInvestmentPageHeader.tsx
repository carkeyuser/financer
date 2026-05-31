"use client"

import { CardTitle } from "@/components/ui/card"
import { useI18n } from "@/i18n/context"

export function NewInvestmentPageHeader() {
  const { t } = useI18n()
  return <h1 className="text-2xl font-bold mb-6">{t("investments.addInvestment")}</h1>
}

export function NewInvestmentCardTitle() {
  const { t } = useI18n()
  return <CardTitle className="text-base">{t("investments.buySecurity")}</CardTitle>
}
