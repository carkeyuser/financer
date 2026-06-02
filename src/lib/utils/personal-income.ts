export interface PersonalIncomeMonthRow {
  month: number
  grossSalary: number | null
  netSalary: number | null
  monthBonus: number | null
  extraBonus: number
  totalBonus: number
  note: string | null
  syncedToHouseholdAt: string | null
  householdIncomeAmount: number | null
}

export interface PersonalIncomeYearTotals {
  gross: number
  net: number
  monthBonus: number
  extraBonus: number
  totalBonus: number
}

export interface PersonalIncomeYearSummary {
  year: number
  months: PersonalIncomeMonthRow[]
  totals: PersonalIncomeYearTotals
}

export interface PersonalIncomeYearColumn {
  year: number
  gross: number
  net: number
  totalBonus: number
}

export function sumDefined(values: (number | null | undefined)[]): number {
  return values.reduce<number>((s, v) => s + (v ?? 0), 0)
}

export function bonusForCalendarMonth(
  bonuses: { date: Date; amount: number }[],
  year: number,
  month: number
): number {
  return bonuses
    .filter((b) => b.date.getFullYear() === year && b.date.getMonth() + 1 === month)
    .reduce((s, b) => s + b.amount, 0)
}

export function buildPersonalIncomeYearSummary(input: {
  year: number
  months: {
    month: number
    grossSalary: number | null
    netSalary: number | null
    monthBonus: number | null
    note: string | null
    syncedToHouseholdAt: Date | null
  }[]
  extraBonusesByMonth: Record<number, number>
  householdIncomeByMonth: Record<number, number | null>
}): PersonalIncomeYearSummary {
  const monthMap = new Map(input.months.map((m) => [m.month, m]))

  const rows: PersonalIncomeMonthRow[] = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1
    const stored = monthMap.get(month)
    const extraBonus = input.extraBonusesByMonth[month] ?? 0
    const monthBonus = stored?.monthBonus ?? null
    const totalBonus = (monthBonus ?? 0) + extraBonus

    return {
      month,
      grossSalary: stored?.grossSalary ?? null,
      netSalary: stored?.netSalary ?? null,
      monthBonus,
      extraBonus,
      totalBonus: totalBonus > 0 ? totalBonus : 0,
      note: stored?.note ?? null,
      syncedToHouseholdAt: stored?.syncedToHouseholdAt?.toISOString() ?? null,
      householdIncomeAmount: input.householdIncomeByMonth[month] ?? null,
    }
  })

  const totals: PersonalIncomeYearTotals = {
    gross: sumDefined(rows.map((r) => r.grossSalary)),
    net: sumDefined(rows.map((r) => r.netSalary)),
    monthBonus: sumDefined(rows.map((r) => r.monthBonus)),
    extraBonus: sumDefined(rows.map((r) => r.extraBonus)),
    totalBonus: sumDefined(rows.map((r) => r.totalBonus)),
  }

  return { year: input.year, months: rows, totals }
}

export function buildPersonalIncomeYearsMatrix(
  columns: PersonalIncomeYearColumn[],
  fromYear: number,
  toYear: number
): { fromYear: number; toYear: number; years: number[]; columns: PersonalIncomeYearColumn[] } {
  const years: number[] = []
  for (let y = fromYear; y <= toYear; y++) years.push(y)

  const byYear = new Map(columns.map((c) => [c.year, c]))
  const filled = years.map(
    (year) =>
      byYear.get(year) ?? {
        year,
        gross: 0,
        net: 0,
        totalBonus: 0,
      }
  )

  return { fromYear, toYear, years, columns: filled }
}
