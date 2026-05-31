"use client"

import { useHouseholdFinance } from "@/hooks/useHousehold"
import { useI18n } from "@/i18n/context"
import { monthName } from "@/i18n/messages"

export function HouseholdSummaryWidget() {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const { data: finance, isLoading } = useHouseholdFinance(currentYear)
  const { locale, t, formatMoney, formatMonthYear } = useI18n()

  if (isLoading) {
    return <div className="text-xs text-muted-foreground p-2">{t("common.loading")}</div>
  }

  const month = finance?.months.find((m) => m.month === currentMonth)

  if (!month || month.status === "leer") {
    return (
      <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
        {t("investments.noDataForMonth", { month: monthName(locale, currentMonth) })}
      </div>
    )
  }

  const monthLabel = formatMonthYear(new Date(currentYear, currentMonth - 1))

  return (
    <div className="p-2 space-y-3 h-full">
      <p className="text-xs text-muted-foreground capitalize">{monthLabel}</p>
      <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-3">
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">{t("investments.income")}</p>
          <p className="text-sm font-semibold">{formatMoney(month.combinedIncome)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">{t("investments.fixedCosts")}</p>
          <p className="text-sm font-semibold">{formatMoney(month.fixedCosts)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">{t("investments.free")}</p>
          <p className={`text-sm font-semibold ${month.remainder >= 0 ? "text-green-500" : "text-red-500"}`}>
            {formatMoney(month.remainder)}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 pt-1 border-t">
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">{t("investments.theoreticalPayout")}</p>
          <p className="text-sm font-medium">{formatMoney(month.theoreticalPayoutPerPerson)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">{t("investments.actualPayout")}</p>
          <p className="text-sm font-medium">{formatMoney(month.actualPayoutPerPerson)}</p>
        </div>
      </div>
    </div>
  )
}
