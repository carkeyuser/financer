"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSaveMonthlyEntry } from "@/hooks/useHousehold"
import type { MonthlyFinanceSummary } from "@/hooks/useHousehold"
import { toast } from "sonner"
import { useI18n } from "@/i18n/context"
import { monthName } from "@/i18n/messages"
import { TransferPreviewSection } from "./TransferPreviewSection"

interface Props {
  open: boolean
  onClose: () => void
  year: number
  month: number
  data: MonthlyFinanceSummary
}

function buildEntryFields(data: MonthlyFinanceSummary, month: number) {
  const monthData = data.months[month - 1]
  const incomes: Record<string, string> = {}
  const payouts: Record<string, string> = {}
  for (const m of data.members) {
    const inc = monthData.incomes.find((i) => i.userId === m.id)
    incomes[m.id] = inc ? String(inc.amount) : ""
    const p = monthData.payouts.find((p) => p.userId === m.id)
    payouts[m.id] = p ? String(p.amount) : ""
  }
  return { incomes, payouts }
}

function MonthlyEntryDialogBody({
  onClose,
  year,
  month,
  data,
}: Omit<Props, "open">) {
  const { locale, t, formatMoney, translateApiError } = useI18n()
  const { mutateAsync, isPending } = useSaveMonthlyEntry()
  const initial = buildEntryFields(data, month)
  const [incomes, setIncomes] = useState(initial.incomes)
  const [payouts, setPayouts] = useState(initial.payouts)

  async function handleSave() {
    try {
      await mutateAsync({
        year,
        month,
        incomes: data.members
          .filter((m) => incomes[m.id] !== "" && incomes[m.id] !== undefined)
          .map((m) => ({ userId: m.id, amount: parseFloat(incomes[m.id].replace(",", ".")) || 0 })),
        payouts: data.members
          .filter((m) => payouts[m.id] !== "" && payouts[m.id] !== undefined)
          .map((m) => ({ userId: m.id, amount: parseFloat(payouts[m.id].replace(",", ".")) || 0 })),
      })
      toast.success(t("householdFinance.saved"))
      onClose()
    } catch (error) {
      toast.error(translateApiError(error))
    }
  }

  const totalIncome = data.members.reduce((s, m) => s + (parseFloat(incomes[m.id]?.replace(",", ".")) || 0), 0)
  const totalFixedCosts = data.fixedCosts.reduce((s, c) => s + c.amount, 0)
  const remainder = totalIncome - totalFixedCosts
  const theoreticalPerPerson = remainder > 0 ? remainder / (data.members.length || 2) : 0

  const parsedIncomes = Object.fromEntries(
    data.members.map((m) => [m.id, parseFloat(incomes[m.id]?.replace(",", ".")) || 0])
  )
  const parsedPayouts = Object.fromEntries(
    data.members
      .filter((m) => payouts[m.id] !== "" && payouts[m.id] !== undefined)
      .map((m) => [m.id, parseFloat(payouts[m.id].replace(",", ".")) || 0])
  )

  return (
    <>
      <DialogHeader>
        <DialogTitle>{monthName(locale, month)} {year}</DialogTitle>
      </DialogHeader>

      <div className="space-y-5">
        <div>
          <p className="text-sm font-medium mb-2 text-muted-foreground">{t("householdFinance.incomeSection")}</p>
          <div className="space-y-2">
            {data.members.map((m) => (
              <div key={m.id} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                <Label className="text-sm truncate sm:w-24 sm:shrink-0">{m.name ?? m.email}</Label>
                <div className="relative flex-1">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={t("householdFinance.amountPlaceholder")}
                    value={incomes[m.id] ?? ""}
                    onChange={(e) => setIncomes((prev) => ({ ...prev, [m.id]: e.target.value }))}
                    className="pr-7"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("householdFinance.totalIncome")}</span>
            <span className="font-medium">{formatMoney(totalIncome)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("householdFinance.fixedCosts")}</span>
            <span className="text-red-500">−{formatMoney(totalFixedCosts)}</span>
          </div>
          <div className="flex justify-between border-t pt-1 mt-1">
            <span className="text-muted-foreground">{t("householdFinance.theoreticalPerPersonShort")}</span>
            <span className="font-semibold text-green-500">{formatMoney(theoreticalPerPerson)}</span>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium mb-2 text-muted-foreground">{t("householdFinance.payoutSection")}</p>
          <div className="space-y-2">
            {data.members.map((m) => (
              <div key={m.id} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                <Label className="text-sm truncate sm:w-24 sm:shrink-0">{m.name ?? m.email}</Label>
                <div className="relative flex-1">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={t("householdFinance.amountPlaceholder")}
                    value={payouts[m.id] ?? ""}
                    onChange={(e) => setPayouts((prev) => ({ ...prev, [m.id]: e.target.value }))}
                    className="pr-7"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <TransferPreviewSection
          members={data.members}
          incomes={parsedIncomes}
          payouts={parsedPayouts}
          fixedCosts={totalFixedCosts}
        />

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? t("common.saving") : t("common.save")}
          </Button>
        </div>
      </div>
    </>
  )
}

export function MonthlyEntryDialog({ open, onClose, year, month, data }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        {open ? (
          <MonthlyEntryDialogBody
            key={`${year}-${month}`}
            onClose={onClose}
            year={year}
            month={month}
            data={data}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
