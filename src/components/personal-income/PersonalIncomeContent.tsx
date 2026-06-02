"use client"

import { PersonalIncomeTable } from "./PersonalIncomeTable"
import { PersonalIncomeYearMatrix } from "./PersonalIncomeYearMatrix"
import { useI18n } from "@/i18n/context"

export function PersonalIncomeContent() {
  const { t } = useI18n()
  const currentYear = new Date().getFullYear()
  const fromYear = currentYear - 4

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold">{t("personalIncome.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("personalIncome.subtitle")}</p>
      </div>
      <PersonalIncomeTable />
      <PersonalIncomeYearMatrix fromYear={fromYear} toYear={currentYear} />
    </div>
  )
}
