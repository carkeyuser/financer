"use client"

import { SimulationManager } from "@/components/household-finance/SimulationManager"
import { useI18n } from "@/i18n/context"

export default function HaushaltskasseSimulationPage() {
  const { t } = useI18n()

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold">{t("householdFinance.simulations")}</h1>
      <SimulationManager />
    </div>
  )
}
