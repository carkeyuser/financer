"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useI18n } from "@/i18n/context"
import { usePersonalIncomeYearsContext } from "./PersonalIncomeYearsContext"

export function PersonalIncomeAddYearButton() {
  const { t, translateApiError } = useI18n()
  const { years, currentYear, addPastYear, isAddingYear } = usePersonalIncomeYearsContext()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState(String(currentYear - 6))

  const maxPastYear = currentYear - 1

  async function handleSubmit() {
    const year = parseInt(input, 10)
    if (Number.isNaN(year) || year < 2000 || year > maxPastYear) {
      toast.error(t("personalIncome.addYearInvalid", { max: maxPastYear }))
      return
    }
    if (years.includes(year)) {
      toast.error(t("personalIncome.addYearExists"))
      return
    }

    try {
      await addPastYear(year)
      toast.success(t("personalIncome.addYearSuccess", { year }))
      setOpen(false)
    } catch (err: unknown) {
      toast.error(translateApiError(err))
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1"
        onClick={() => setOpen(true)}
        disabled={isAddingYear}
      >
        <Plus className="h-3.5 w-3.5" />
        {t("personalIncome.addYear")}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("personalIncome.addYearTitle")}</DialogTitle>
            <DialogDescription>
              {t("personalIncome.addYearDescription", { max: maxPastYear })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="past-year">{t("personalIncome.addYearLabel")}</Label>
            <Input
              id="past-year"
              type="number"
              min={2000}
              max={maxPastYear}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={isAddingYear}>
              {t("personalIncome.addYearConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
