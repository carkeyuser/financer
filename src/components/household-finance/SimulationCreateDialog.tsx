"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { useI18n } from "@/i18n/context"
import {
  useCreateHouseholdFinanceSimulation,
  useUpdateHouseholdFinanceSimulation,
  type HouseholdFinanceSimulationListItem,
} from "@/hooks/useHouseholdFinanceSimulations"

function toMonthInput(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`
}

function parseMonthInput(value: string) {
  const [year, month] = value.split("-").map(Number)
  return { year, month }
}

export function SimulationCreateDialog({
  open,
  onClose,
  simulation,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  simulation?: HouseholdFinanceSimulationListItem
  onCreated?: (id: string) => void
}) {
  const { t, translateApiError } = useI18n()
  const current = new Date()
  const createSimulation = useCreateHouseholdFinanceSimulation()
  const updateSimulation = useUpdateHouseholdFinanceSimulation()

  const [name, setName] = useState("")
  const [start, setStart] = useState(toMonthInput(current.getFullYear(), current.getMonth() + 1))
  const [end, setEnd] = useState(toMonthInput(current.getFullYear(), 12))

  useEffect(() => {
    if (!open) return
    setName(simulation?.name ?? "")
    setStart(
      simulation
        ? toMonthInput(simulation.startYear, simulation.startMonth)
        : toMonthInput(current.getFullYear(), current.getMonth() + 1)
    )
    setEnd(simulation ? toMonthInput(simulation.endYear, simulation.endMonth) : toMonthInput(current.getFullYear(), 12))
  }, [open, simulation])

  async function handleSave() {
    const startMonth = parseMonthInput(start)
    const endMonth = parseMonthInput(end)
    const payload = {
      name,
      startYear: startMonth.year,
      startMonth: startMonth.month,
      endYear: endMonth.year,
      endMonth: endMonth.month,
    }

    try {
      if (simulation) {
        const updated = await updateSimulation.mutateAsync({ id: simulation.id, data: payload })
        toast.success(t("householdFinance.simulationSaved"))
        onCreated?.(updated.id)
      } else {
        const created = await createSimulation.mutateAsync(payload)
        toast.success(t("householdFinance.simulationCreated"))
        onCreated?.(created.id)
      }
      onClose()
    } catch (error) {
      toast.error(translateApiError(error))
    }
  }

  const isPending = createSimulation.isPending || updateSimulation.isPending

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {simulation ? t("householdFinance.editSimulation") : t("householdFinance.newSimulation")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("common.name")}</Label>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder={t("householdFinance.simulationNamePlaceholder")} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t("householdFinance.startMonth")}</Label>
              <Input type="month" value={start} onChange={(event) => setStart(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("householdFinance.endMonth")}</Label>
              <Input type="month" value={end} onChange={(event) => setEnd(event.target.value)} />
            </div>
          </div>
          <p className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
            {t("householdFinance.simulationSafeHint")}
          </p>
          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
