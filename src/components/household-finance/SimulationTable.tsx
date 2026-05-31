"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { useI18n } from "@/i18n/context"
import { monthName } from "@/i18n/messages"
import { cn } from "@/lib/utils"
import type { HouseholdFinanceSimulationDetail } from "@/hooks/useHouseholdFinanceSimulations"
import { MobileValueRow, StatusBadge } from "./finance-display"
import { SimulationMonthDialog } from "./SimulationMonthDialog"

export function SimulationTable({ simulation }: { simulation: HouseholdFinanceSimulationDetail }) {
  const { locale, t, formatMoney } = useI18n()
  const [dialogIndex, setDialogIndex] = useState<number | null>(null)
  const selectedMonth = dialogIndex !== null ? simulation.months[dialogIndex] : null
  const totalSurplus = simulation.quarters.reduce((sum, quarter) => sum + quarter.surplus, 0)

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-0">
          <div className="space-y-3 px-3 pb-3 md:hidden">
            {simulation.months.map((month, index) => {
              const hasIncome = month.combinedIncome > 0
              const remainderTone = !hasIncome ? "muted" : month.remainder >= 0 ? "positive" : "negative"

              return (
                <Card
                  key={`${month.year}-${month.month}`}
                  role="button"
                  tabIndex={0}
                  className={cn("cursor-pointer transition-colors active:scale-[0.99]", month.status === "leer" && "opacity-75")}
                  onClick={() => setDialogIndex(index)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault()
                      setDialogIndex(index)
                    }
                  }}
                >
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{monthName(locale, month.month)} {month.year}</p>
                        <p className="text-xs text-muted-foreground">
                          {month.status === "fertig"
                            ? t("householdFinance.legendDone")
                            : month.status === "vorkalkuliert"
                              ? t("householdFinance.legendEstimated")
                              : t("householdFinance.legendEmpty")}
                        </p>
                      </div>
                      <StatusBadge status={month.status} />
                    </div>

                    <div className="space-y-2">
                      <MobileValueRow label={t("householdFinance.income")} value={hasIncome ? formatMoney(month.combinedIncome) : t("common.dash")} tone={!hasIncome ? "muted" : undefined} />
                      <MobileValueRow label={t("householdFinance.fixedCosts")} value={formatMoney(month.fixedCosts)} tone="muted" />
                      <MobileValueRow label={t("householdFinance.remainder")} value={hasIncome ? formatMoney(month.remainder) : t("common.dash")} tone={remainderTone} />
                      <MobileValueRow label={t("householdFinance.theoreticalPerPersonShort")} value={month.theoreticalPayoutPerPerson > 0 ? formatMoney(month.theoreticalPayoutPerPerson) : t("common.dash")} tone={month.theoreticalPayoutPerPerson > 0 ? undefined : "muted"} />
                      <MobileValueRow label={t("householdFinance.paidOut")} value={month.actualPayoutPerPerson > 0 ? formatMoney(month.actualPayoutPerPerson) : t("common.dash")} tone={month.actualPayoutPerPerson > 0 ? undefined : "muted"} />
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="w-40 px-4 py-2 text-left font-medium text-muted-foreground">{t("householdFinance.month")}</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">{t("householdFinance.income")}</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">{t("householdFinance.fixedCosts")}</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">{t("householdFinance.remainder")}</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">{t("householdFinance.theoreticalPerPerson")}</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">{t("householdFinance.paidOut")}</th>
                  <th className="w-10 px-3 py-2 text-center font-medium text-muted-foreground"></th>
                  <th className="w-8 px-2 py-2 text-center"></th>
                </tr>
              </thead>
              <tbody>
                {simulation.months.map((month, index) => (
                  <tr
                    key={`${month.year}-${month.month}`}
                    className={cn("cursor-pointer border-b transition-colors hover:bg-muted/20", month.status === "leer" && "opacity-60")}
                    onClick={() => setDialogIndex(index)}
                  >
                    <td className="px-4 py-2.5 font-medium">{monthName(locale, month.month)} {month.year}</td>
                    <td className="px-3 py-2.5 text-right">
                      {month.combinedIncome > 0 ? formatMoney(month.combinedIncome) : <span className="text-muted-foreground">{t("common.dash")}</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right text-muted-foreground">{formatMoney(month.fixedCosts)}</td>
                    <td className="px-3 py-2.5 text-right">
                      {month.combinedIncome > 0 ? (
                        <span className={month.remainder >= 0 ? "text-green-500" : "text-red-500"}>{formatMoney(month.remainder)}</span>
                      ) : (
                        <span className="text-muted-foreground">{t("common.dash")}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {month.theoreticalPayoutPerPerson > 0 ? formatMoney(month.theoreticalPayoutPerPerson) : <span className="text-muted-foreground">{t("common.dash")}</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {month.actualPayoutPerPerson > 0 ? formatMoney(month.actualPayoutPerPerson) : <span className="text-muted-foreground">{t("common.dash")}</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center"><StatusBadge status={month.status} /></td>
                    <td className="px-2 py-2.5 text-center">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(event) => { event.stopPropagation(); setDialogIndex(index) }}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/10">
                  <td className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">{t("common.total")}</td>
                  <td className="px-3 py-2.5 text-right text-xs font-medium">{formatMoney(simulation.totals.combinedIncome)}</td>
                  <td className="px-3 py-2.5 text-right text-xs text-muted-foreground">{formatMoney(simulation.totals.totalFixedCosts)}</td>
                  <td className="px-3 py-2.5 text-right text-xs font-medium">{formatMoney(simulation.totals.totalRemainder)}</td>
                  <td className="px-3 py-2.5 text-right text-xs font-medium">{formatMoney(simulation.totals.totalTheoreticalPayout)}</td>
                  <td className="px-3 py-2.5 text-right text-xs font-medium">{formatMoney(simulation.totals.totalActualPayout)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {simulation.quarters.map((quarter) => (
          <Card key={`${quarter.year}-${quarter.q}`} size="sm">
            <CardContent className="space-y-1">
              <p className="text-xs text-muted-foreground">Q{quarter.q} {quarter.year}</p>
              <p className={cn("text-base font-semibold", quarter.bonusPerPerson >= 0 ? "text-green-500" : "text-red-500")}>
                {quarter.bonusPerPerson >= 0 ? "+" : ""}{formatMoney(quarter.bonusPerPerson)}
              </p>
              <p className="text-xs text-muted-foreground">{t("householdFinance.quarterBonusPerPerson")}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card size="sm">
        <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-muted-foreground">{t("householdFinance.simulationTotalSurplus")}</span>
          <span className={cn("text-lg font-semibold", totalSurplus >= 0 ? "text-green-500" : "text-red-500")}>
            {totalSurplus >= 0 ? "+" : ""}{formatMoney(totalSurplus)}
          </span>
        </CardContent>
      </Card>

      {selectedMonth && (
        <SimulationMonthDialog
          open={!!selectedMonth}
          onClose={() => setDialogIndex(null)}
          simulation={simulation}
          month={selectedMonth}
        />
      )}
    </div>
  )
}
