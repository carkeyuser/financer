export const CHART_SERIES_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-1)",
  "var(--chart-2)",
] as const

export const CHART_GAIN = "var(--gain)"
export const CHART_LOSS = "var(--loss)"
export const CHART_PRIMARY = "var(--chart-1)"
export const CHART_SECONDARY = "var(--chart-2)"
export const CHART_TERTIARY = "var(--chart-3)"
export const CHART_REFERENCE = "var(--muted-foreground)"
export const CHART_DIVIDEND = "var(--gain)"

export const PERSONAL_INCOME_SERIES = {
  gross: "var(--chart-1)",
  net: "var(--gain)",
  bonus: "var(--chart-3)",
} as const
