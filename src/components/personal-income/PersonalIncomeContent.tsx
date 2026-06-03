"use client"

import { PersonalIncomeTable } from "./PersonalIncomeTable"
import { PersonalIncomeYearChart } from "./PersonalIncomeYearChart"
import { PersonalIncomeYearMatrix } from "./PersonalIncomeYearMatrix"
import { PersonalIncomeYearsProvider, usePersonalIncomeYearsContext } from "./PersonalIncomeYearsContext"
import { useI18n } from "@/i18n/context"

function PersonalIncomeSections() {
  const { years } = usePersonalIncomeYearsContext()

  return (
    <>
      <PersonalIncomeTable />
      <PersonalIncomeYearMatrix years={years} />
      <PersonalIncomeYearChart years={years} />
    </>
  )
}

export function PersonalIncomeContent() {
  const { t } = useI18n()

  return (
    <PersonalIncomeYearsProvider>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-2xl font-semibold">{t("personalIncome.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("personalIncome.subtitle")}</p>
        </div>
        <PersonalIncomeSections />
      </div>
    </PersonalIncomeYearsProvider>
  )
}
