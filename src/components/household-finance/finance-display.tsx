"use client"

import type { ReactNode } from "react"
import { CheckCircle2, Clock, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import type { HouseholdFinanceStatus } from "@/lib/utils/household-finance"

export function StatusBadge({ status }: { status: HouseholdFinanceStatus }) {
  if (status === "fertig") return <CheckCircle2 className="h-4 w-4 text-green-500" />
  if (status === "vorkalkuliert") return <Clock className="h-4 w-4 text-yellow-500" />
  return <Minus className="h-4 w-4 text-muted-foreground/40" />
}

export function MobileValueRow({
  label,
  value,
  tone,
}: {
  label: string
  value: ReactNode
  tone?: "positive" | "negative" | "muted"
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-right font-medium",
          tone === "positive" && "text-green-500",
          tone === "negative" && "text-red-500",
          tone === "muted" && "text-muted-foreground"
        )}
      >
        {value}
      </span>
    </div>
  )
}
