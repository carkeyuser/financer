"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { usePersonalIncomeYears, type PersonalIncomeYearsMatrix } from "@/hooks/usePersonalIncome"
import { useI18n } from "@/i18n/context"

interface Props {
  years: number[]
}

export function PersonalIncomeYearMatrix({ years }: Props) {
  const { t, formatMoney } = useI18n()
  const { data, isLoading } = usePersonalIncomeYears(years)

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          {t("personalIncome.loading")}
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  const rows: {
    key: string
    label: string
    pick: (c: PersonalIncomeYearsMatrix["columns"][0]) => number
  }[] = [
    { key: "gross", label: t("personalIncome.yearRowGross"), pick: (c) => c.gross },
    { key: "net", label: t("personalIncome.yearRowNet"), pick: (c) => c.net },
    { key: "bonus", label: t("personalIncome.yearRowBonus"), pick: (c) => c.totalBonus },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("personalIncome.yearOverview")}</CardTitle>
        <p className="text-xs text-muted-foreground">
          {data.fromYear} – {data.toYear}
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm min-w-[320px]">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 pr-4 font-medium text-muted-foreground" />
              {data.years.map((y) => (
                <th key={y} className="text-right py-2 px-2 font-semibold">
                  {y}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b last:border-0">
                <td className="py-2 pr-4 text-muted-foreground">{row.label}</td>
                {data.columns.map((col) => {
                  const value = row.pick(col)
                  return (
                    <td key={col.year} className="text-right py-2 px-2 tabular-nums">
                      {value > 0 ? formatMoney(value) : t("common.dash")}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}
