"use client"

import { Check } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  useHouseholdChecklist,
  useToggleChecklistStep,
  type ChecklistStep,
} from "@/hooks/useDailyHabit"
import { useI18n } from "@/i18n/context"
import { cn } from "@/lib/utils"

const STEPS: { step: ChecklistStep; labelKey: "householdFinance.checklistIncome" | "householdFinance.checklistFixedCosts" | "householdFinance.checklistPayouts" | "householdFinance.checklistTransfers" }[] = [
  { step: "INCOME", labelKey: "householdFinance.checklistIncome" },
  { step: "FIXED_COSTS", labelKey: "householdFinance.checklistFixedCosts" },
  { step: "PAYOUTS", labelKey: "householdFinance.checklistPayouts" },
  { step: "TRANSFERS_DONE", labelKey: "householdFinance.checklistTransfers" },
]

interface Props {
  year: number
  month: number
  currentUserId?: string
}

export function MonthChecklistSection({ year, month, currentUserId }: Props) {
  const { t } = useI18n()
  const { data, isLoading } = useHouseholdChecklist(year, month)
  const toggle = useToggleChecklistStep()

  if (isLoading || !data) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t("householdFinance.checklistTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.members.map((member) => {
          const doneSteps = new Set(member.steps.map((s) => s.step))
          const isMe = member.userId === currentUserId
          const allRequired = ["INCOME", "PAYOUTS", "TRANSFERS_DONE"].every((s) => doneSteps.has(s))
          return (
            <div key={member.userId} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{member.name}</p>
                <span
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-full",
                    allRequired
                      ? "bg-green-500/10 text-green-600"
                      : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                  )}
                >
                  {allRequired
                    ? t("householdFinance.checklistPartnerDone")
                    : t("householdFinance.checklistPartnerOpen")}
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {STEPS.map(({ step, labelKey }) => {
                  const checked = doneSteps.has(step)
                  const disabled = !isMe || toggle.isPending
                  return (
                    <div key={step} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`${member.userId}-${step}`}
                        checked={checked}
                        disabled={disabled}
                        className="h-4 w-4 rounded border-input"
                        onChange={(e) => {
                          if (!isMe) return
                          toggle.mutate({
                            year,
                            month,
                            step,
                            completed: e.target.checked,
                          })
                        }}
                      />
                      <Label
                        htmlFor={`${member.userId}-${step}`}
                        className={cn("text-sm", !isMe && "text-muted-foreground")}
                      >
                        {checked && <Check className="inline h-3 w-3 mr-1 text-green-500" />}
                        {t(labelKey)}
                      </Label>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
