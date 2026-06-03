"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { usePersonalIncomeSummary, type PersonalIncomeMonthRow } from "@/hooks/usePersonalIncome"
import { useI18n } from "@/i18n/context"
import { monthName } from "@/i18n/messages"
import { PersonalIncomeMonthDialog } from "./PersonalIncomeMonthDialog"
import { PersonalIncomeAddYearButton } from "./PersonalIncomeAddYearDialog"
import { usePersonalIncomeYearsContext } from "./PersonalIncomeYearsContext"
import { MobileValueRow } from "@/components/household-finance/finance-display"
import { CheckCircle2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

function formatCell(value: number | null, formatMoney: (n: number) => string, dash: string) {
  if (value == null || value === 0) return dash
  return formatMoney(value)
}

function syncIcon(row: PersonalIncomeMonthRow) {
  if (row.netSalary == null) return null
  const hk = row.householdIncomeAmount
  if (hk != null && Math.abs(hk - row.netSalary) < 0.01) {
    return <CheckCircle2 className="h-4 w-4 text-green-500" aria-hidden />
  }
  if (row.syncedToHouseholdAt && hk != null) {
    return <AlertCircle className="h-4 w-4 text-amber-500" aria-hidden />
  }
  return null
}

export function PersonalIncomeTable() {
  const { locale, t, formatMoney } = useI18n()
  const { years, selectedYear: year, setSelectedYear: setYear } = usePersonalIncomeYearsContext()
  const [dialogMonth, setDialogMonth] = useState<number | null>(null)
  const { data, isLoading } = usePersonalIncomeSummary(year)
  const dash = t("common.dash")

  const dialogRow =
    dialogMonth != null ? (data?.months.find((m) => m.month === dialogMonth) ?? null) : null

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          {t("personalIncome.loading")}
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base">{t("personalIncome.monthTable")}</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="w-28 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <PersonalIncomeAddYearButton />
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-1">
            <span>
              {t("personalIncome.totalGross")}: {formatMoney(data.totals.gross)}
            </span>
            <span>
              {t("personalIncome.totalNet")}: {formatMoney(data.totals.net)}
            </span>
            <span>
              {t("personalIncome.totalBonus")}: {formatMoney(data.totals.totalBonus)}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left p-3 font-medium">{t("common.month")}</th>
                  <th className="text-right p-3 font-medium">{t("personalIncome.gross")}</th>
                  <th className="text-right p-3 font-medium">{t("personalIncome.net")}</th>
                  <th className="text-right p-3 font-medium">{t("personalIncome.bonus")}</th>
                  <th className="text-center p-3 font-medium w-12">{t("personalIncome.hkShort")}</th>
                </tr>
              </thead>
              <tbody>
                {data.months.map((m) => {
                  const hasData =
                    m.grossSalary != null ||
                    m.netSalary != null ||
                    m.totalBonus > 0
                  return (
                    <tr
                      key={m.month}
                      className={cn(
                        "border-b cursor-pointer hover:bg-muted/50 transition-colors",
                        !hasData && "opacity-70"
                      )}
                      onClick={() => setDialogMonth(m.month)}
                    >
                      <td className="p-3 font-medium">{monthName(locale, m.month)}</td>
                      <td className="p-3 text-right tabular-nums">
                        {formatCell(m.grossSalary, formatMoney, dash)}
                      </td>
                      <td className="p-3 text-right tabular-nums">
                        {formatCell(m.netSalary, formatMoney, dash)}
                      </td>
                      <td className="p-3 text-right tabular-nums">
                        {m.totalBonus > 0 ? formatMoney(m.totalBonus) : dash}
                      </td>
                      <td className="p-3 text-center">{syncIcon(m)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 px-3 pb-3 md:hidden">
            {data.months.map((m) => (
              <Card
                key={m.month}
                role="button"
                tabIndex={0}
                className="cursor-pointer active:scale-[0.99]"
                onClick={() => setDialogMonth(m.month)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    setDialogMonth(m.month)
                  }
                }}
              >
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{monthName(locale, m.month)}</p>
                    {syncIcon(m)}
                  </div>
                  <MobileValueRow
                    label={t("personalIncome.gross")}
                    value={formatCell(m.grossSalary, formatMoney, dash)}
                  />
                  <MobileValueRow
                    label={t("personalIncome.net")}
                    value={formatCell(m.netSalary, formatMoney, dash)}
                  />
                  <MobileValueRow
                    label={t("personalIncome.bonus")}
                    value={m.totalBonus > 0 ? formatMoney(m.totalBonus) : dash}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {dialogMonth != null && (
        <PersonalIncomeMonthDialog
          open={dialogMonth != null}
          onClose={() => setDialogMonth(null)}
          year={year}
          month={dialogMonth}
          row={dialogRow}
        />
      )}
    </>
  )
}
