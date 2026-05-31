"use client"

import { previewMonthTransfers } from "@/lib/utils/household-finance"
import { useI18n } from "@/i18n/context"
import { cn } from "@/lib/utils"

interface Member {
  id: string
  name: string | null
  email?: string | null
}

interface Props {
  members: Member[]
  incomes: Record<string, number>
  payouts: Record<string, number>
  fixedCosts: number
}

export function TransferPreviewSection({ members, incomes, payouts, fixedCosts }: Props) {
  const { t, formatMoney } = useI18n()

  const hasAnyPayout = Object.keys(payouts).length > 0
  if (!hasAnyPayout) return null

  const transfers = previewMonthTransfers(members, incomes, payouts)
  const totalTransfer = transfers.reduce((sum, transfer) => sum + transfer.amount, 0)
  const insufficient = totalTransfer < fixedCosts
  const shortfall = fixedCosts - totalTransfer

  return (
    <div className="rounded-md bg-muted/50 p-3 text-sm space-y-2">
      <p className="font-medium text-muted-foreground">{t("householdFinance.transferSection")}</p>
      <div className="space-y-1">
        {transfers.map((transfer) => (
          <div key={transfer.userId} className="flex justify-between gap-3">
            <span className="truncate text-muted-foreground">{transfer.userName}</span>
            <span className={cn("shrink-0 font-medium", transfer.amount < 0 && "text-red-500")}>
              {formatMoney(transfer.amount)}
            </span>
          </div>
        ))}
      </div>
      <div className="space-y-1 border-t pt-2">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("householdFinance.transferTotal")}</span>
          <span className="font-semibold">{formatMoney(totalTransfer)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("householdFinance.transferCoversFixedCosts")}</span>
          <span className="text-muted-foreground">{formatMoney(fixedCosts)}</span>
        </div>
        {insufficient && (
          <p className="text-red-500 text-xs pt-1">
            {t("householdFinance.transferInsufficient", { shortfall: formatMoney(shortfall) })}
          </p>
        )}
      </div>
    </div>
  )
}
