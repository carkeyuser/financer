import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { CalendarEvent } from "@/lib/services/nasdaq-calendar"
import type { MessageKey } from "@/i18n/messages"

export interface TodayBriefing {
  generatedAt: string
  portfolio:
    | { error: "fx" }
    | {
        portfolioTotal: number
        portfolioGainLoss: number
        portfolioGainLossPercent: number
        positionCount: number
        sinceYesterday: {
          current: number | null
          previous: number | null
          deltaEur: number | null
          deltaPercent: number | null
        }
      }
  topFlop: {
    top: { id: string; name: string; ticker: string; gainLossPct: number; gainLossEur: number }[]
    flop: { id: string; name: string; ticker: string; gainLossPct: number; gainLossEur: number }[]
  }
  calendar: { events: CalendarEvent[]; portfolioOnly: boolean }
  household: {
    year: number
    month: number
    status: string
    transfers: { userId: string; userName: string | null; amount: number }[]
    remainder: number
    combinedIncome: number
  }
  dividends: {
    kpis: { totalYear: number; currentMonth: number; futureTotal: number; paymentCount: number }
    upcoming: { id: string; name: string; ticker: string; date: string; amount: number }[]
    month: number
  }
  checklist: {
    members: { userId: string; name: string; completedSteps: string[] }[]
  }
}

export interface NotificationItem {
  id: string
  type: string
  titleKey: MessageKey
  bodyKey: MessageKey
  payload: Record<string, string | number>
  createdAt: string
  read: boolean
}

export function useTodayBriefing() {
  return useQuery({
    queryKey: ["today-briefing"],
    queryFn: async (): Promise<TodayBriefing> => {
      const res = await fetch("/api/today")
      if (!res.ok) throw new Error("Failed to load briefing")
      return res.json()
    },
    staleTime: 60_000,
  })
}

export function usePortfolioSnapshots(days = 90) {
  return useQuery({
    queryKey: ["portfolio-snapshots", days],
    queryFn: async () => {
      const res = await fetch(`/api/portfolio/snapshots?days=${days}`)
      if (!res.ok) throw new Error("Failed to load snapshots")
      return res.json() as Promise<{
        delta: {
          current: number | null
          previous: number | null
          deltaEur: number | null
          deltaPercent: number | null
        }
        series: { date: string; totalEur: number; gainLossEur: number | null }[]
      }>
    },
    staleTime: 60_000,
  })
}

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications")
      if (!res.ok) throw new Error("Failed to load notifications")
      return res.json() as Promise<{ items: NotificationItem[]; unreadCount: number }>
    },
    refetchInterval: 120_000,
  })
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/notifications/${id}`, { method: "PATCH" })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await fetch("/api/notifications/read-all", { method: "POST" })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  })
}

export type ChecklistStep = "INCOME" | "FIXED_COSTS" | "PAYOUTS" | "TRANSFERS_DONE"

export function useHouseholdChecklist(year: number, month: number) {
  return useQuery({
    queryKey: ["household-checklist", year, month],
    queryFn: async () => {
      const res = await fetch(`/api/household-finance/checklist?year=${year}&month=${month}`)
      if (!res.ok) throw new Error("Failed to load checklist")
      return res.json() as Promise<{
        year: number
        month: number
        members: { userId: string; name: string; steps: { step: string; completedAt: string }[] }[]
      }>
    },
  })
}

export function useToggleChecklistStep() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      year: number
      month: number
      step: ChecklistStep
      completed: boolean
    }) => {
      const res = await fetch("/api/household-finance/checklist", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error("Failed to update checklist")
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["household-checklist", vars.year, vars.month] })
      qc.invalidateQueries({ queryKey: ["today-briefing"] })
      qc.invalidateQueries({ queryKey: ["notifications"] })
    },
  })
}
