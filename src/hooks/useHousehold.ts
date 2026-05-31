import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import type { HouseholdRole } from "@/generated/prisma"
import type { CreateUserInput, EditUserInput } from "@/lib/validations/household"
export type { UpdateHouseholdNameInput } from "@/lib/validations/household"

export interface HouseholdMember {
  id: string
  userId: string
  name: string | null
  email: string
  image: string | null
  role: HouseholdRole
  joinedAt: string
  twoFactorEnabled: boolean
  twoFactorConfigured: boolean
}

export interface HouseholdInfo {
  household: { id: string; name: string; currency: string } | null
  myRole: HouseholdRole | null
  members: HouseholdMember[]
  households: { id: string; name: string; currency: string; role: HouseholdRole }[]
  pendingInvites: { id: string; expiresAt: string; createdAt: string }[]
}

async function fetchHousehold(): Promise<HouseholdInfo> {
  const res = await fetch("/api/household")
  if (!res.ok) throw new Error("Haushalt konnte nicht geladen werden")
  return res.json()
}

export function useHousehold() {
  return useQuery({
    queryKey: ["household"],
    queryFn: fetchHousehold,
  })
}

export function useCreateInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/household/invite", { method: "POST" })
      if (!res.ok) {
        const err = await res.json()
        throw err
      }
      return res.json() as Promise<{ inviteUrl: string; expiresAt: string }>
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["household"] }),
  })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateUserInput) => {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw err
      }
      return res.json() as Promise<{ id: string; username: string }>
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["household"] }),
  })
}

export function useRemoveMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/household/members/${userId}`, { method: "DELETE" })
      if (!res.ok) {
        const err = await res.json()
        throw err
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["household"] }),
  })
}

export function useUpdateMemberRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: "ADMIN" | "MEMBER" }) => {
      const res = await fetch(`/api/household/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw err
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["household"] }),
  })
}

export function useAdminToggle2FA() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, enabled }: { userId: string; enabled: boolean }) => {
      const res = await fetch(`/api/admin/2fa/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw err
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["household"] }),
  })
}

export function useAdminEditUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: EditUserInput }) => {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw err
      }
      return res.json() as Promise<{ id: string; name: string | null; username: string }>
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["household"] }),
  })
}

export function useUpdateHouseholdName() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch("/api/household", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw err
      }
      return res.json() as Promise<{ id: string; name: string; currency: string }>
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["household"] }),
  })
}

export function useRevokeInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (inviteId: string) => {
      const res = await fetch(`/api/household/invite/${inviteId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Widerruf fehlgeschlagen")
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["household"] }),
  })
}

export function useSwitchHousehold() {
  const { update } = useSession()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (householdId: string) => {
      const res = await fetch("/api/household/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ householdId }),
      })
      if (!res.ok) throw new Error("Wechsel fehlgeschlagen")
      return res.json() as Promise<{ householdId: string }>
    },
    onSuccess: async (data) => {
      await update({ householdId: data.householdId })
      qc.clear()
    },
  })
}

export function useDashboardSummary() {
  return useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/summary")
      if (!res.ok) throw new Error("Dashboard konnte nicht geladen werden")
      return res.json() as Promise<{
        portfolioTotal: number
        portfolioGainLoss: number
        portfolioGainLossPercent: number
        positionCount: number
        allocationByType: { type: string; value: number }[]
      }>
    },
  })
}

export interface MonthlyFinanceSummary {
  year: number
  fixedCosts: { id: string; name: string; amount: number; order: number }[]
  members: { id: string; name: string | null; email: string | null }[]
  months: {
    year: number
    month: number
    incomes: { userId: string; userName: string | null; amount: number }[]
    combinedIncome: number
    fixedCosts: number
    remainder: number
    theoreticalPayoutPerPerson: number
    payouts: { userId: string; userName: string | null; amount: number }[]
    actualPayoutPerPerson: number
    surplusPerPerson: number
    transfers: { userId: string; userName: string | null; amount: number }[]
    totalTransfer: number
    status: "leer" | "vorkalkuliert" | "fertig"
  }[]
  quarters: { year: number; q: number; surplus: number; bonusPerPerson: number }[]
  totals: {
    combinedIncome: number
    totalFixedCosts: number
    totalRemainder: number
    totalTheoreticalPayout: number
    totalActualPayout: number
    averageActualPayout: number
  }
}

export function useHouseholdFinance(year: number) {
  return useQuery({
    queryKey: ["household-finance", year],
    queryFn: async () => {
      const res = await fetch(`/api/household-finance/summary?year=${year}`)
      if (!res.ok) throw new Error("Haushaltsdaten konnten nicht geladen werden")
      return res.json() as Promise<MonthlyFinanceSummary>
    },
  })
}

async function saveMonthlyEntryPart(
  url: string,
  payload: { userId: string; year: number; month: number; amount: number }
) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    let err: unknown
    try {
      err = await res.json()
    } catch {
      err = new Error("Monatseingabe konnte nicht gespeichert werden")
    }
    throw err
  }
}

export function useSaveMonthlyEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: {
      year: number
      month: number
      incomes: { userId: string; amount: number }[]
      payouts: { userId: string; amount: number }[]
    }) => {
      await Promise.all([
        ...data.incomes.map((inc) =>
          saveMonthlyEntryPart("/api/household-finance/income", {
            userId: inc.userId,
            year: data.year,
            month: data.month,
            amount: inc.amount,
          })
        ),
        ...data.payouts.map((p) =>
          saveMonthlyEntryPart("/api/household-finance/payout", {
            userId: p.userId,
            year: data.year,
            month: data.month,
            amount: p.amount,
          })
        ),
      ])
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["household-finance", variables.year] })
    },
  })
}
