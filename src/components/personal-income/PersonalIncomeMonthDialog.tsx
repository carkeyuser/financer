"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { useI18n } from "@/i18n/context"
import { monthName } from "@/i18n/messages"
import {
  usePersonalIncomeBonuses,
  useSavePersonalIncomeMonth,
  useSyncPersonalIncomeHousehold,
  useCreatePersonalIncomeBonus,
  useDeletePersonalIncomeBonus,
  type PersonalIncomeMonthRow,
} from "@/hooks/usePersonalIncome"
import { Trash2 } from "lucide-react"

interface Props {
  open: boolean
  onClose: () => void
  year: number
  month: number
  row: PersonalIncomeMonthRow | null
}

function parseAmount(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const n = parseFloat(trimmed.replace(",", "."))
  return Number.isNaN(n) ? null : n
}

export function PersonalIncomeMonthDialog({ open, onClose, year, month, row }: Props) {
  const { locale, t, formatMoney, translateApiError } = useI18n()
  const { mutateAsync: saveMonth, isPending: saving } = useSavePersonalIncomeMonth()
  const { mutateAsync: syncHousehold, isPending: syncing } = useSyncPersonalIncomeHousehold()
  const { data: bonusesData, refetch: refetchBonuses } = usePersonalIncomeBonuses(year, month, open)
  const { mutateAsync: createBonus, isPending: creatingBonus } = useCreatePersonalIncomeBonus()
  const { mutateAsync: deleteBonus } = useDeletePersonalIncomeBonus()

  const [gross, setGross] = useState("")
  const [net, setNet] = useState("")
  const [monthBonus, setMonthBonus] = useState("")
  const [note, setNote] = useState("")
  const [bonusDate, setBonusDate] = useState("")
  const [bonusLabel, setBonusLabel] = useState("")
  const [bonusAmount, setBonusAmount] = useState("")

  useEffect(() => {
    if (!open) return
    setGross(row?.grossSalary != null ? String(row.grossSalary) : "")
    setNet(row?.netSalary != null ? String(row.netSalary) : "")
    setMonthBonus(row?.monthBonus != null ? String(row.monthBonus) : "")
    setNote(row?.note ?? "")
    const defaultDate = `${year}-${String(month).padStart(2, "0")}-15`
    setBonusDate(defaultDate)
    setBonusLabel("")
    setBonusAmount("")
  }, [open, row, year, month])

  async function handleSave() {
    try {
      await saveMonth({
        year,
        month,
        grossSalary: parseAmount(gross),
        netSalary: parseAmount(net),
        monthBonus: parseAmount(monthBonus),
        note: note.trim() || null,
      })
      toast.success(t("personalIncome.saved"))
      onClose()
    } catch (error) {
      toast.error(translateApiError(error))
    }
  }

  async function handleSync() {
    try {
      await saveMonth({
        year,
        month,
        grossSalary: parseAmount(gross),
        netSalary: parseAmount(net),
        monthBonus: parseAmount(monthBonus),
        note: note.trim() || null,
      })
      await syncHousehold({ year, month })
      toast.success(t("personalIncome.syncSuccess"))
    } catch (error) {
      toast.error(translateApiError(error))
    }
  }

  async function handleAddBonus() {
    const amount = parseAmount(bonusAmount)
    if (!bonusLabel.trim() || amount == null || amount <= 0) {
      toast.error(t("personalIncome.bonusInvalid"))
      return
    }
    try {
      await createBonus({
        date: bonusDate,
        amount,
        label: bonusLabel.trim(),
      })
      setBonusLabel("")
      setBonusAmount("")
      await refetchBonuses()
      toast.success(t("personalIncome.bonusAdded"))
    } catch (error) {
      toast.error(translateApiError(error))
    }
  }

  const hkAmount = row?.householdIncomeAmount
  const netParsed = parseAmount(net)
  const hkMismatch =
    netParsed != null && hkAmount != null && Math.abs(netParsed - hkAmount) > 0.009

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {monthName(locale, month)} {year}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pi-gross">{t("personalIncome.gross")}</Label>
            <Input
              id="pi-gross"
              inputMode="decimal"
              placeholder={t("householdFinance.amountPlaceholder")}
              value={gross}
              onChange={(e) => setGross(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pi-net">{t("personalIncome.net")}</Label>
            <Input
              id="pi-net"
              inputMode="decimal"
              placeholder={t("householdFinance.amountPlaceholder")}
              value={net}
              onChange={(e) => setNet(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pi-month-bonus">{t("personalIncome.monthBonus")}</Label>
            <Input
              id="pi-month-bonus"
              inputMode="decimal"
              placeholder={t("householdFinance.amountPlaceholder")}
              value={monthBonus}
              onChange={(e) => setMonthBonus(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pi-note">{t("common.note")}</Label>
            <Input id="pi-note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          <div className="rounded-lg border p-3 space-y-2">
            <p className="text-sm font-medium">{t("personalIncome.extraBonuses")}</p>
            {(bonusesData?.items ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground">{t("personalIncome.noExtraBonuses")}</p>
            ) : (
              <ul className="space-y-2">
                {(bonusesData?.items ?? []).map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-2 text-sm">
                    <span>
                      {b.label} — {formatMoney(b.amount)}
                      <span className="text-muted-foreground ml-1">({b.date})</span>
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={async () => {
                        try {
                          await deleteBonus({ id: b.id, year, month })
                          toast.success(t("personalIncome.bonusDeleted"))
                        } catch (error) {
                          toast.error(translateApiError(error))
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <div className="grid gap-2 pt-2">
              <Input type="date" value={bonusDate} onChange={(e) => setBonusDate(e.target.value)} />
              <Input
                placeholder={t("personalIncome.bonusLabelPlaceholder")}
                value={bonusLabel}
                onChange={(e) => setBonusLabel(e.target.value)}
              />
              <Input
                inputMode="decimal"
                placeholder={t("householdFinance.amountPlaceholder")}
                value={bonusAmount}
                onChange={(e) => setBonusAmount(e.target.value)}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={creatingBonus}
                onClick={handleAddBonus}
              >
                {t("personalIncome.addBonus")}
              </Button>
            </div>
          </div>

          <div className="rounded-lg border p-3 space-y-2 bg-muted/30">
            <p className="text-sm font-medium">{t("personalIncome.householdSection")}</p>
            <p className="text-sm text-muted-foreground">
              {t("personalIncome.householdCurrent")}:{" "}
              {hkAmount != null ? formatMoney(hkAmount) : t("common.dash")}
            </p>
            {hkMismatch && (
              <p className="text-xs text-amber-600 dark:text-amber-400">{t("personalIncome.hkMismatch")}</p>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              disabled={syncing || saving || netParsed == null}
              onClick={handleSync}
            >
              {t("personalIncome.syncToHousehold")}
            </Button>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="button" disabled={saving} onClick={handleSave}>
              {saving ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
