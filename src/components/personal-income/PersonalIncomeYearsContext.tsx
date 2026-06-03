"use client"

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"
import {
  usePersonalIncomeAvailableYears,
  useTrackPersonalIncomeYear,
} from "@/hooks/usePersonalIncome"

type PersonalIncomeYearsContextValue = {
  years: number[]
  selectedYear: number
  setSelectedYear: (year: number) => void
  currentYear: number
  isLoading: boolean
  addPastYear: (year: number) => Promise<void>
  isAddingYear: boolean
}

const PersonalIncomeYearsContext = createContext<PersonalIncomeYearsContextValue | null>(
  null
)

export function PersonalIncomeYearsProvider({ children }: { children: ReactNode }) {
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const { data, isLoading } = usePersonalIncomeAvailableYears()
  const trackYear = useTrackPersonalIncomeYear()

  const defaultYears = useMemo(
    () => Array.from({ length: 6 }, (_, i) => currentYear - i),
    [currentYear]
  )
  const years = data?.years ?? defaultYears

  const addPastYear = useCallback(
    async (year: number) => {
      await trackYear.mutateAsync(year)
      setSelectedYear(year)
    },
    [trackYear.mutateAsync]
  )

  const value = useMemo(
    () => ({
      years,
      selectedYear,
      setSelectedYear,
      currentYear: data?.currentYear ?? currentYear,
      isLoading,
      addPastYear,
      isAddingYear: trackYear.isPending,
    }),
    [
      years,
      selectedYear,
      data?.currentYear,
      currentYear,
      isLoading,
      addPastYear,
      trackYear.isPending,
    ]
  )

  return (
    <PersonalIncomeYearsContext.Provider value={value}>
      {children}
    </PersonalIncomeYearsContext.Provider>
  )
}

export function usePersonalIncomeYearsContext() {
  const ctx = useContext(PersonalIncomeYearsContext)
  if (!ctx) {
    throw new Error("usePersonalIncomeYearsContext must be used within PersonalIncomeYearsProvider")
  }
  return ctx
}
