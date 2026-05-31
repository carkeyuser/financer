"use client"

import { HouseholdFinanceTable } from "@/components/household-finance/HouseholdFinanceTable"
import { useI18n } from "@/i18n/context"

export default function HaushaltskassePage() {
  const { t } = useI18n()

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold">{t("householdFinance.title")}</h1>
      <HouseholdFinanceTable />
    </div>
  )
}
