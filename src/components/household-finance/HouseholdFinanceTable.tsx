"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Plus, CheckCircle2, Clock, Minus } from "lucide-react"
import { useHouseholdFinance } from "@/hooks/useHousehold"
import { MonthlyEntryDialog } from "./MonthlyEntryDialog"
import { FixedCostsSettings } from "@/app/settings/FixedCostsSettings"
import { cn } from "@/lib/utils"
import { useI18n } from "@/i18n/context"
import { monthName } from "@/i18n/messages"
import { MobileValueRow, StatusBadge } from "./finance-display"

export function HouseholdFinanceTable() {
  const { locale, t, formatMoney } = useI18n()
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [dialogMonth, setDialogMonth] = useState<number | null>(null)
  const { data, isLoading } = useHouseholdFinance(year)

  const years = Array.from({ length: 4 }, (_, i) => currentYear - i)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <FixedCostsSettings />
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {t("householdFinance.loading")}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) return null

  const totalFixedCosts = data.fixedCosts.reduce((s, c) => s + c.amount, 0)
  const yearlySupplus = data.quarters.reduce((s, q) => s + q.surplus, 0)

  return (
    <div className="space-y-4">
      <FixedCostsSettings />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base">{t("householdFinance.title")}</CardTitle>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-28 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-3 px-3 pb-3 md:hidden">
            {data.months.map((m) => {
              const hasIncome = m.combinedIncome > 0
              const remainderTone = !hasIncome ? "muted" : m.remainder >= 0 ? "positive" : "negative"

              return (
                <Card
                  key={m.month}
                  role="button"
                  tabIndex={0}
                  className={cn(
                    "cursor-pointer transition-colors active:scale-[0.99]",
                    m.status === "leer" && "opacity-75"
                  )}
                  onClick={() => setDialogMonth(m.month)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      setDialogMonth(m.month)
                    }
                  }}
                >
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{monthName(locale, m.month)}</p>
                        <p className="text-xs text-muted-foreground">
                          {m.status === "fertig"
                            ? t("householdFinance.legendDone")
                            : m.status === "vorkalkuliert"
                              ? t("householdFinance.legendEstimated")
                              : t("householdFinance.legendEmpty")}
                        </p>
                      </div>
                      <StatusBadge status={m.status} />
                    </div>

                    <div className="space-y-2">
                      <MobileValueRow
                        label={t("householdFinance.income")}
                        value={hasIncome ? formatMoney(m.combinedIncome) : t("common.dash")}
                        tone={!hasIncome ? "muted" : undefined}
                      />
                      <MobileValueRow
                        label={t("householdFinance.fixedCosts")}
                        value={formatMoney(m.fixedCosts)}
                        tone="muted"
                      />
                      <MobileValueRow
                        label={t("householdFinance.remainder")}
                        value={hasIncome ? formatMoney(m.remainder) : t("common.dash")}
                        tone={remainderTone}
                      />
                      <MobileValueRow
                        label={t("householdFinance.theoreticalPerPersonShort")}
                        value={m.theoreticalPayoutPerPerson > 0 ? formatMoney(m.theoreticalPayoutPerPerson) : t("common.dash")}
                        tone={m.theoreticalPayoutPerPerson > 0 ? undefined : "muted"}
                      />
                      <MobileValueRow
                        label={t("householdFinance.paidOut")}
                        value={m.actualPayoutPerPerson > 0 ? formatMoney(m.actualPayoutPerPerson) : t("common.dash")}
                        tone={m.actualPayoutPerPerson > 0 ? undefined : "muted"}
                      />
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
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground w-32">{t("householdFinance.month")}</th>
                  <th className="text-right px-3 py-2 font-medium text-muted-foreground">{t("householdFinance.income")}</th>
                  <th className="text-right px-3 py-2 font-medium text-muted-foreground">{t("householdFinance.fixedCosts")}</th>
                  <th className="text-right px-3 py-2 font-medium text-muted-foreground">{t("householdFinance.remainder")}</th>
                  <th className="text-right px-3 py-2 font-medium text-muted-foreground">{t("householdFinance.theoreticalPerPerson")}</th>
                  <th className="text-right px-3 py-2 font-medium text-muted-foreground">{t("householdFinance.paidOut")}</th>
                  <th className="text-center px-3 py-2 font-medium text-muted-foreground w-10"></th>
                  <th className="text-center px-2 py-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {data.months.map((m) => (
                      <tr
                        key={m.month}
                        className={cn(
                          "border-b hover:bg-muted/20 transition-colors cursor-pointer",
                          m.status === "leer" && "opacity-60"
                        )}
                        onClick={() => setDialogMonth(m.month)}
                      >
                        <td className="px-4 py-2.5 font-medium">{monthName(locale, m.month)}</td>
                        <td className="text-right px-3 py-2.5">
                          {m.combinedIncome > 0 ? formatMoney(m.combinedIncome) : <span className="text-muted-foreground">{t("common.dash")}</span>}
                        </td>
                        <td className="text-right px-3 py-2.5 text-muted-foreground">{formatMoney(m.fixedCosts)}</td>
                        <td className="text-right px-3 py-2.5">
                          {m.combinedIncome > 0 ? (
                            <span className={m.remainder >= 0 ? "text-green-500" : "text-red-500"}>
                              {formatMoney(m.remainder)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">{t("common.dash")}</span>
                          )}
                        </td>
                        <td className="text-right px-3 py-2.5">
                          {m.theoreticalPayoutPerPerson > 0 ? formatMoney(m.theoreticalPayoutPerPerson) : <span className="text-muted-foreground">{t("common.dash")}</span>}
                        </td>
                        <td className="text-right px-3 py-2.5">
                          {m.actualPayoutPerPerson > 0 ? formatMoney(m.actualPayoutPerPerson) : <span className="text-muted-foreground">{t("common.dash")}</span>}
                        </td>
                        <td className="text-center px-3 py-2.5">
                          <StatusBadge status={m.status} />
                        </td>
                        <td className="text-center px-2 py-2.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 md:h-6 md:w-6"
                            onClick={(e) => { e.stopPropagation(); setDialogMonth(m.month) }}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/10">
                  <td className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">{t("householdFinance.average")}</td>
                  <td className="text-right px-3 py-2.5 text-xs" />
                  <td className="text-right px-3 py-2.5 text-xs text-muted-foreground">
                    {formatMoney(totalFixedCosts)}
                  </td>
                  <td colSpan={2} />
                  <td className="text-right px-3 py-2.5 text-xs font-semibold">
                    {formatMoney(data.totals.averageActualPayout)}
                  </td>
                  <td colSpan={2} />
                </tr>
                <tr className="border-t-2 bg-muted/20">
                  <td className="px-4 py-2.5 text-sm font-semibold" colSpan={2}>{t("householdFinance.yearlySurplus")}</td>
                  <td colSpan={3} />
                  <td className="text-right px-3 py-2.5 text-sm font-bold">
                    {yearlySupplus >= 0 ? (
                      <span className="text-green-500">+{formatMoney(yearlySupplus)}</span>
                    ) : (
                      <span className="text-red-500">{formatMoney(yearlySupplus)}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground text-right">{t("common.perPerson")}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex items-center gap-3 px-4 py-3 text-xs text-muted-foreground border-t flex-wrap">
            <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> {t("householdFinance.legendDone")}</span>
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-yellow-500" /> {t("householdFinance.legendEstimated")}</span>
            <span className="flex items-center gap-1"><Minus className="h-3.5 w-3.5 text-muted-foreground/40" /> {t("householdFinance.legendEmpty")}</span>
            <span className="ml-auto">{t("householdFinance.fixedCostsTotal", { amount: formatMoney(totalFixedCosts) })}</span>
          </div>
        </CardContent>
      </Card>

      {dialogMonth !== null && (
        <MonthlyEntryDialog
          open={dialogMonth !== null}
          onClose={() => setDialogMonth(null)}
          year={year}
          month={dialogMonth}
          data={data}
        />
      )}
    </div>
  )
}
