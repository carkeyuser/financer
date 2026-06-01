"use client"

import { HouseholdFinanceTable } from "@/components/household-finance/HouseholdFinanceTable"
import { MonthChecklistSection } from "@/components/household-finance/MonthChecklistSection"
import { useI18n } from "@/i18n/context"
import { useSession } from "next-auth/react"

export default function HaushaltskassePage() {
  const { t } = useI18n()
  const { data: session } = useSession()
  const now = new Date()

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold">{t("householdFinance.title")}</h1>
      <MonthChecklistSection
        year={now.getFullYear()}
        month={now.getMonth() + 1}
        currentUserId={session?.user?.id}
      />
      <HouseholdFinanceTable />
    </div>
  )
}
