"use client"

import { useMemo } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { usePersonalIncomeYears } from "@/hooks/usePersonalIncome"
import { useI18n } from "@/i18n/context"

const SERIES = {
  gross: "#3b82f6",
  net: "#22c55e",
  bonus: "#f59e0b",
} as const

interface Props {
  years: number[]
}

export function PersonalIncomeYearChart({ years }: Props) {
  const { t, formatMoney } = useI18n()
  const { data, isLoading } = usePersonalIncomeYears(years)

  const chartData = useMemo(() => {
    if (!data) return []
    return data.columns.map((col) => ({
      year: String(col.year),
      gross: col.gross,
      net: col.net,
      bonus: col.totalBonus,
    }))
  }, [data])

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("personalIncome.yearChart")}</CardTitle>
        <CardDescription>
          {t("personalIncome.yearChartDescription", { from: data.fromYear, to: data.toYear })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="year" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis
                tickFormatter={(value) => formatMoney(Number(value)).replace(",00", "")}
                tickLine={false}
                axisLine={false}
                fontSize={12}
                width={72}
              />
              <Tooltip
                formatter={(value) => formatMoney(Number(value))}
                labelFormatter={(label) => label}
              />
              <Legend />
              <Bar
                dataKey="gross"
                name={t("personalIncome.yearRowGross")}
                fill={SERIES.gross}
                radius={[3, 3, 0, 0]}
              />
              <Bar
                dataKey="net"
                name={t("personalIncome.yearRowNet")}
                fill={SERIES.net}
                radius={[3, 3, 0, 0]}
              />
              <Bar
                dataKey="bonus"
                name={t("personalIncome.yearRowBonus")}
                fill={SERIES.bonus}
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
