import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type {
  CreateSimulationInput,
  UpdateSimulationInput,
  UpdateSimulationMonthInput,
} from "@/lib/validations/household-finance-simulation"
import type { MonthlyFinanceSummary } from "@/hooks/useHousehold"

export interface HouseholdFinanceSimulationListItem {
  id: string
  name: string
  startYear: number
  startMonth: number
  endYear: number
  endMonth: number
  createdAt: string
  updatedAt: string
}

export interface HouseholdFinanceSimulationDetail
  extends Omit<MonthlyFinanceSummary, "year" | "fixedCosts">,
    HouseholdFinanceSimulationListItem {
  members: { id: string; name: string | null; email: string | null }[]
}

const simulationKeys = {
  all: ["household-finance", "simulations"] as const,
  detail: (id: string) => ["household-finance", "simulations", id] as const,
}

async function readJsonError(res: Response) {
  try {
    return await res.json()
  } catch {
    return { error: "Request failed" }
  }
}

export function useHouseholdFinanceSimulations() {
  return useQuery({
    queryKey: simulationKeys.all,
    queryFn: async () => {
      const res = await fetch("/api/household-finance/simulations")
      if (!res.ok) throw await readJsonError(res)
      return res.json() as Promise<HouseholdFinanceSimulationListItem[]>
    },
  })
}

export function useHouseholdFinanceSimulation(id: string | null) {
  return useQuery({
    queryKey: id ? simulationKeys.detail(id) : ["household-finance", "simulations", "none"],
    enabled: !!id,
    queryFn: async () => {
      const res = await fetch(`/api/household-finance/simulations/${id}`)
      if (!res.ok) throw await readJsonError(res)
      return res.json() as Promise<HouseholdFinanceSimulationDetail>
    },
  })
}

export function useCreateHouseholdFinanceSimulation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateSimulationInput) => {
      const res = await fetch("/api/household-finance/simulations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw await readJsonError(res)
      return res.json() as Promise<HouseholdFinanceSimulationListItem>
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: simulationKeys.all }),
  })
}

export function useUpdateHouseholdFinanceSimulation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateSimulationInput }) => {
      const res = await fetch(`/api/household-finance/simulations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw await readJsonError(res)
      return res.json() as Promise<HouseholdFinanceSimulationDetail>
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: simulationKeys.all })
      qc.setQueryData(simulationKeys.detail(data.id), data)
    },
  })
}

export function useDeleteHouseholdFinanceSimulation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/household-finance/simulations/${id}`, { method: "DELETE" })
      if (!res.ok) throw await readJsonError(res)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: simulationKeys.all }),
  })
}

export function useUpdateHouseholdFinanceSimulationMonth(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: UpdateSimulationMonthInput) => {
      const res = await fetch(`/api/household-finance/simulations/${id}/months`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw await readJsonError(res)
      return res.json() as Promise<{ ok: true }>
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: simulationKeys.all })
      qc.invalidateQueries({ queryKey: simulationKeys.detail(id) })
    },
  })
}
