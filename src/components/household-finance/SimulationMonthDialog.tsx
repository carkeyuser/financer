"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { useI18n } from "@/i18n/context"
import { monthName } from "@/i18n/messages"
import { TransferPreviewSection } from "./TransferPreviewSection"
import {
  useUpdateHouseholdFinanceSimulationMonth,
  type HouseholdFinanceSimulationDetail,
} from "@/hooks/useHouseholdFinanceSimulations"

type SimulationMonth = HouseholdFinanceSimulationDetail["months"][number]

function moneyString(value: number) {
  return value > 0 ? String(value) : ""
}

function parseMoney(value: string) {
  return parseFloat(value.replace(",", ".")) || 0
}

export function SimulationMonthDialog({
  open,
  onClose,
  simulation,
  month,
}: {
  open: boolean
  onClose: () => void
  simulation: HouseholdFinanceSimulationDetail
  month: SimulationMonth
}) {
  const { locale, t, formatMoney, translateApiError } = useI18n()
  const updateMonth = useUpdateHouseholdFinanceSimulationMonth(simulation.id)
  const [fixedCosts, setFixedCosts] = useState("")
  const [incomes, setIncomes] = useState<Record<string, string>>({})
  const [payouts, setPayouts] = useState<Record<string, string>>({})
  const [applyFixedCosts, setApplyFixedCosts] = useState(false)
  const [applyIncomes, setApplyIncomes] = useState(false)
  const [applyPayouts, setApplyPayouts] = useState(false)

  function fillFromMonth(source: SimulationMonth) {
    const nextIncomes: Record<string, string> = {}
    const nextPayouts: Record<string, string> = {}
    for (const member of simulation.members) {
      nextIncomes[member.id] = moneyString(source.incomes.find((entry) => entry.userId === member.id)?.amount ?? 0)
      nextPayouts[member.id] = moneyString(source.payouts.find((entry) => entry.userId === member.id)?.amount ?? 0)
    }
    setFixedCosts(String(source.fixedCosts))
    setIncomes(nextIncomes)
    setPayouts(nextPayouts)
  }

  useEffect(() => {
    if (!open) return
    fillFromMonth(month)
    setApplyFixedCosts(false)
    setApplyIncomes(false)
    setApplyPayouts(false)
  }, [open, month.year, month.month, simulation.id])

  const monthIndex = simulation.months.findIndex((item) => item.year === month.year && item.month === month.month)
  const previousMonth = monthIndex > 0 ? simulation.months[monthIndex - 1] : null

  const totalIncome = simulation.members.reduce((sum, member) => sum + parseMoney(incomes[member.id] ?? ""), 0)
  const fixedCostsValue = parseMoney(fixedCosts)
  const remainder = totalIncome - fixedCostsValue
  const theoreticalPerPerson = remainder > 0 ? remainder / (simulation.members.length || 2) : 0

  const parsedIncomes = Object.fromEntries(
    simulation.members.map((member) => [member.id, parseMoney(incomes[member.id] ?? "")])
  )
  const parsedPayouts = Object.fromEntries(
    simulation.members
      .filter((member) => payouts[member.id] !== "" && payouts[member.id] !== undefined)
      .map((member) => [member.id, parseMoney(payouts[member.id] ?? "")])
  )

  async function handleSave() {
    try {
      await updateMonth.mutateAsync({
        year: month.year,
        month: month.month,
        fixedCosts: fixedCostsValue,
        incomes: simulation.members.map((member) => ({ userId: member.id, amount: parseMoney(incomes[member.id] ?? "") })),
        payouts: simulation.members.map((member) => ({ userId: member.id, amount: parseMoney(payouts[member.id] ?? "") })),
        applyToFuture: {
          fixedCosts: applyFixedCosts,
          incomes: applyIncomes,
          payouts: applyPayouts,
        },
      })
      toast.success(t("householdFinance.simulationSaved"))
      onClose()
    } catch (error) {
      toast.error(translateApiError(error))
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{monthName(locale, month.month)} {month.year}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => previousMonth && fillFromMonth(previousMonth)} disabled={!previousMonth}>
              {t("householdFinance.copyPreviousMonth")}
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label>{t("householdFinance.fixedCosts")}</Label>
            <div className="relative">
              <Input type="number" min="0" step="0.01" value={fixedCosts} onChange={(event) => setFixedCosts(event.target.value)} className="pr-7" />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">€</span>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">{t("householdFinance.incomeSection")}</p>
            <div className="space-y-2">
              {simulation.members.map((member) => (
                <div key={member.id} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                  <Label className="truncate text-sm sm:w-28 sm:shrink-0">{member.name ?? member.email}</Label>
                  <div className="relative flex-1">
                    <Input type="number" min="0" step="0.01" value={incomes[member.id] ?? ""} onChange={(event) => setIncomes((prev) => ({ ...prev, [member.id]: event.target.value }))} className="pr-7" />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">€</span>
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
              <span className="text-muted-foreground">{t("householdFinance.remainder")}</span>
              <span className={remainder >= 0 ? "text-green-500" : "text-red-500"}>{formatMoney(remainder)}</span>
            </div>
            <div className="flex justify-between border-t pt-1">
              <span className="text-muted-foreground">{t("householdFinance.theoreticalPerPersonShort")}</span>
              <span className="font-semibold">{formatMoney(theoreticalPerPerson)}</span>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">{t("householdFinance.payoutSection")}</p>
            <div className="space-y-2">
              {simulation.members.map((member) => (
                <div key={member.id} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                  <Label className="truncate text-sm sm:w-28 sm:shrink-0">{member.name ?? member.email}</Label>
                  <div className="relative flex-1">
                    <Input type="number" min="0" step="0.01" value={payouts[member.id] ?? ""} onChange={(event) => setPayouts((prev) => ({ ...prev, [member.id]: event.target.value }))} className="pr-7" />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">€</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <TransferPreviewSection
            members={simulation.members}
            incomes={parsedIncomes}
            payouts={parsedPayouts}
            fixedCosts={fixedCostsValue}
          />

          <div className="space-y-2 rounded-md border p-3 text-sm">
            <p className="font-medium">{t("householdFinance.applyFromHere")}</p>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="accent-green-600" checked={applyFixedCosts} onChange={(event) => setApplyFixedCosts(event.target.checked)} />
              {t("householdFinance.applyFixedCosts")}
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="accent-green-600" checked={applyIncomes} onChange={(event) => setApplyIncomes(event.target.checked)} />
              {t("householdFinance.applyIncomes")}
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="accent-green-600" checked={applyPayouts} onChange={(event) => setApplyPayouts(event.target.checked)} />
              {t("householdFinance.applyPayouts")}
            </label>
          </div>

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
            <Button onClick={handleSave} disabled={updateMonth.isPending}>
              {updateMonth.isPending ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
