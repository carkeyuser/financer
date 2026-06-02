import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { PersonalIncomeYearSummary, PersonalIncomeMonthRow } from "@/lib/utils/personal-income"
import type {
  PersonalIncomeBonusCreateInput,
  PersonalIncomeMonthUpsertInput,
} from "@/lib/validations/personal-income"

export type { PersonalIncomeYearSummary, PersonalIncomeMonthRow }

export interface PersonalIncomeBonusItem {
  id: string
  date: string
  amount: number
  label: string
  note: string | null
}

export interface PersonalIncomeYearsMatrix {
  fromYear: number
  toYear: number
  years: number[]
  columns: { year: number; gross: number; net: number; totalBonus: number }[]
}

async function fetchSummary(year: number): Promise<PersonalIncomeYearSummary> {
  const res = await fetch(`/api/personal-income/summary?year=${year}`)
  if (!res.ok) throw new Error("PERSONAL_INCOME_LOAD_FAILED")
  return res.json()
}

async function fetchYears(from: number, to: number): Promise<PersonalIncomeYearsMatrix> {
  const res = await fetch(`/api/personal-income/years?from=${from}&to=${to}`)
  if (!res.ok) throw new Error("PERSONAL_INCOME_YEARS_FAILED")
  return res.json()
}

async function fetchBonuses(year: number, month: number): Promise<{ items: PersonalIncomeBonusItem[] }> {
  const res = await fetch(`/api/personal-income/bonuses?year=${year}&month=${month}`)
  if (!res.ok) throw new Error("PERSONAL_INCOME_BONUSES_FAILED")
  return res.json()
}

export function usePersonalIncomeSummary(year: number) {
  return useQuery({
    queryKey: ["personal-income", year],
    queryFn: () => fetchSummary(year),
  })
}

export function usePersonalIncomeYears(fromYear: number, toYear: number) {
  return useQuery({
    queryKey: ["personal-income-years", fromYear, toYear],
    queryFn: () => fetchYears(fromYear, toYear),
  })
}

export function usePersonalIncomeBonuses(year: number, month: number, enabled: boolean) {
  return useQuery({
    queryKey: ["personal-income-bonuses", year, month],
    queryFn: () => fetchBonuses(year, month),
    enabled,
  })
}

export function useSavePersonalIncomeMonth() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: PersonalIncomeMonthUpsertInput) => {
      const res = await fetch("/api/personal-income/months", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw err
      }
      return res.json() as Promise<PersonalIncomeMonthRow>
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["personal-income", variables.year] })
      qc.invalidateQueries({ queryKey: ["personal-income-years"] })
    },
  })
}

export function useSyncPersonalIncomeHousehold() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { year: number; month: number }) => {
      const res = await fetch("/api/personal-income/sync-household", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw err
      }
      return res.json()
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["personal-income", variables.year] })
      qc.invalidateQueries({ queryKey: ["household-finance", variables.year] })
    },
  })
}

export function useCreatePersonalIncomeBonus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: PersonalIncomeBonusCreateInput) => {
      const res = await fetch("/api/personal-income/bonuses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw err
      }
      return res.json() as Promise<PersonalIncomeBonusItem>
    },
    onSuccess: (item) => {
      const d = new Date(item.date)
      const year = d.getFullYear()
      const month = d.getMonth() + 1
      qc.invalidateQueries({ queryKey: ["personal-income-bonuses", year, month] })
      qc.invalidateQueries({ queryKey: ["personal-income", year] })
      qc.invalidateQueries({ queryKey: ["personal-income-years"] })
    },
  })
}

export function useDeletePersonalIncomeBonus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (params: { id: string; year: number; month: number }) => {
      const res = await fetch(`/api/personal-income/bonuses/${params.id}`, { method: "DELETE" })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw err
      }
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["personal-income-bonuses", variables.year, variables.month] })
      qc.invalidateQueries({ queryKey: ["personal-income", variables.year] })
      qc.invalidateQueries({ queryKey: ["personal-income-years"] })
    },
  })
}
