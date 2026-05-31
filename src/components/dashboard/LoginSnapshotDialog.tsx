"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { TrendingDown, TrendingUp } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useI18n } from "@/i18n/context"
import { consumeLoginSnapshotPending } from "@/lib/constants/login-snapshot"

type LoginSnapshotData = {
  portfolioTotal: number
  portfolioGainLoss: number
  portfolioGainLossPercent: number
  positionCount: number
}

export function LoginSnapshotDialog() {
  const { t, formatMoney, formatNumber } = useI18n()
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<LoginSnapshotData | null>(null)

  useEffect(() => {
    if (!consumeLoginSnapshotPending()) return

    let cancelled = false

    async function loadSnapshot() {
      try {
        const res = await fetch("/api/dashboard/summary?scope=mine")
        if (!res.ok || cancelled) return

        const json = (await res.json()) as LoginSnapshotData
        if (cancelled || json.positionCount === 0) return

        setData(json)
        setOpen(true)
      } catch {
        // FX or network errors: skip popup silently
      }
    }

    void loadSnapshot()
    return () => {
      cancelled = true
    }
  }, [])

  if (!data) return null

  const gainLoss = data.portfolioGainLoss
  const gainLossPercent = data.portfolioGainLossPercent
  const isPositive = gainLoss > 0
  const isNegative = gainLoss < 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("loginSnapshot.title")}</DialogTitle>
          <DialogDescription>
            {t("loginSnapshot.positions", { count: data.positionCount })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1 py-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">{t("loginSnapshot.gainLossLabel")}</p>
            {isPositive ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : isNegative ? (
              <TrendingDown className="h-4 w-4 text-red-500" />
            ) : null}
          </div>
          <p
            className={`text-3xl font-bold tabular-nums ${
              isPositive ? "text-green-500" : isNegative ? "text-red-500" : ""
            }`}
          >
            {gainLoss >= 0 ? "+" : ""}
            {formatMoney(gainLoss)}
          </p>
          <p className="text-sm text-muted-foreground tabular-nums">
            {gainLossPercent >= 0 ? "+" : ""}
            {formatNumber(gainLossPercent, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %
          </p>
          <p className="text-sm text-muted-foreground pt-2">
            {t("loginSnapshot.portfolioValue")}: {formatMoney(data.portfolioTotal)}
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Link
            href="/investments"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            {t("loginSnapshot.goToPortfolio")}
          </Link>
          <Button onClick={() => setOpen(false)}>{t("common.ok")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
