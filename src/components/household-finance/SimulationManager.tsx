"use client"

import { useEffect, useState } from "react"
import { Calculator, Pencil, Plus, Trash2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { useI18n } from "@/i18n/context"
import {
  useDeleteHouseholdFinanceSimulation,
  useHouseholdFinanceSimulation,
  useHouseholdFinanceSimulations,
} from "@/hooks/useHouseholdFinanceSimulations"
import { SimulationCreateDialog } from "./SimulationCreateDialog"
import { SimulationTable } from "./SimulationTable"

export function SimulationManager() {
  const { t, formatMonthYear, translateApiError } = useI18n()
  const { data: simulations, isLoading } = useHouseholdFinanceSimulations()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const deleteSimulation = useDeleteHouseholdFinanceSimulation()
  const selectedSimulation = simulations?.find((simulation) => simulation.id === selectedId)
  const { data: detail, isLoading: detailLoading } = useHouseholdFinanceSimulation(selectedId)

  useEffect(() => {
    if (!simulations || simulations.length === 0) {
      setSelectedId(null)
      return
    }
    if (!selectedId || !simulations.some((simulation) => simulation.id === selectedId)) {
      setSelectedId(simulations[0].id)
    }
  }, [simulations, selectedId])

  async function handleDelete() {
    if (!selectedId || !selectedSimulation) return
    if (!window.confirm(t("householdFinance.deleteSimulationConfirm", { name: selectedSimulation.name }))) return

    try {
      await deleteSimulation.mutateAsync(selectedId)
      toast.success(t("householdFinance.simulationDeleted"))
      setSelectedId(null)
    } catch (error) {
      toast.error(translateApiError(error))
    }
  }

  const formatRange = (simulation: {
    startYear: number
    startMonth: number
    endYear: number
    endMonth: number
  }) =>
    `${formatMonthYear(new Date(simulation.startYear, simulation.startMonth - 1))} - ${formatMonthYear(
      new Date(simulation.endYear, simulation.endMonth - 1)
    )}`

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calculator className="h-4 w-4" />
              {t("householdFinance.simulations")}
            </CardTitle>
            <CardDescription>{t("householdFinance.simulationDescription")}</CardDescription>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            {t("householdFinance.newSimulation")}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">{t("common.loading")}</div>
        ) : !simulations || simulations.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-center">
            <p className="text-sm font-medium">{t("householdFinance.noSimulations")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("householdFinance.noSimulationsDescription")}</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <Select value={selectedId ?? ""} onValueChange={setSelectedId}>
                <SelectTrigger className="w-full lg:max-w-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {simulations.map((simulation) => (
                    <SelectItem key={simulation.id} value={simulation.id} className="[&_svg]:text-green-500">
                      {simulation.name} · {formatRange(simulation)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} disabled={!selectedSimulation}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  {t("common.edit")}
                </Button>
                <Button variant="outline" size="sm" onClick={handleDelete} disabled={!selectedSimulation || deleteSimulation.isPending} className="text-destructive hover:text-destructive">
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  {t("common.delete")}
                </Button>
              </div>
            </div>

            <p className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
              {t("householdFinance.simulationSafeHint")}
            </p>

            {detailLoading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">{t("common.loading")}</div>
            ) : detail ? (
              <SimulationTable simulation={detail} />
            ) : null}
          </>
        )}
      </CardContent>

      <SimulationCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={setSelectedId}
      />
      {selectedSimulation && (
        <SimulationCreateDialog
          open={editOpen}
          onClose={() => setEditOpen(false)}
          simulation={selectedSimulation}
          onCreated={setSelectedId}
        />
      )}
    </Card>
  )
}
