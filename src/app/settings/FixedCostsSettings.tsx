"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Trash2, Plus, Pencil, Check, X, ChevronDown } from "lucide-react"
import { toast } from "sonner"
import { useI18n } from "@/i18n/context"
import { cn } from "@/lib/utils"

interface FixedCost {
  id: string
  name: string
  amount: number
  order: number
}

function useFixedCosts() {
  const { t } = useI18n()
  return useQuery<FixedCost[]>({
    queryKey: ["fixed-costs"],
    queryFn: async () => {
      const res = await fetch("/api/household-finance/fixed-costs")
      if (!res.ok) throw new Error(t("fixedCosts.loadFailed"))
      return res.json()
    },
  })
}

function EditRow({
  cost,
  onSave,
  onCancel,
}: {
  cost?: FixedCost
  onSave: (name: string, amount: number) => Promise<void>
  onCancel: () => void
}) {
  const { t } = useI18n()
  const [name, setName] = useState(cost?.name ?? "")
  const [amount, setAmount] = useState(cost ? String(cost.amount) : "")
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim() || !amount) return
    setSaving(true)
    try {
      await onSave(name.trim(), parseFloat(amount.replace(",", ".")))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 py-1 sm:flex-row sm:items-center">
      <Input
        className="flex-1 text-sm sm:h-8"
        placeholder={t("fixedCosts.namePlaceholder")}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSave()}
      />
      <div className="relative w-full sm:w-28">
        <Input
          className="text-sm pr-6 sm:h-8"
          placeholder={t("fixedCosts.amountPlaceholder")}
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">€</span>
      </div>
      <div className="flex justify-end gap-1 sm:contents">
        <Button size="icon" variant="ghost" className="h-10 w-10 sm:h-8 sm:w-8" onClick={handleSave} disabled={saving}>
          <Check className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-10 w-10 sm:h-8 sm:w-8" onClick={onCancel}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

export function FixedCostsSettings() {
  const { t, formatMoney } = useI18n()
  const qc = useQueryClient()
  const { data: costs, isLoading } = useFixedCosts()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [open, setOpen] = useState(false)

  const mutate = useMutation({
    mutationFn: async ({ method, url, body }: { method: string; url: string; body?: object }) => {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      })
      if (!res.ok && res.status !== 204) throw new Error(t("common.error"))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fixed-costs"] }),
    onError: () => toast.error(t("fixedCosts.saveFailed")),
  })

  const total = costs?.reduce((s, c) => s + c.amount, 0) ?? 0

  if (isLoading) return null

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">{t("fixedCosts.title")}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("fixedCosts.total")}: <span className="font-medium text-foreground">{formatMoney(total)}</span>
              </p>
            </div>
            <CollapsibleTrigger className="inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground sm:h-8">
              {open ? t("fixedCosts.hide") : t("fixedCosts.show")}
              <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
            </CollapsibleTrigger>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-1">
            {costs?.map((cost) =>
              editingId === cost.id ? (
                <EditRow
                  key={cost.id}
                  cost={cost}
                  onSave={async (name, amount) => {
                    await mutate.mutateAsync({ method: "PUT", url: `/api/household-finance/fixed-costs/${cost.id}`, body: { name, amount } })
                    toast.success(t("fixedCosts.saved"))
                    setEditingId(null)
                  }}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div key={cost.id} className="flex items-center gap-2 py-1.5 group">
                  <span className="flex-1 min-w-0 truncate text-sm">{cost.name}</span>
                  <span className="text-sm font-medium w-24 text-right shrink-0">
                    {formatMoney(cost.amount)}
                  </span>
                  <Button
                    size="icon" variant="ghost" className="h-10 w-10 opacity-100 sm:h-7 sm:w-7 sm:opacity-0 sm:group-hover:opacity-100"
                    onClick={() => setEditingId(cost.id)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    size="icon" variant="ghost" className="h-10 w-10 opacity-100 text-destructive hover:text-destructive sm:h-7 sm:w-7 sm:opacity-0 sm:group-hover:opacity-100"
                    onClick={() => {
                      mutate.mutate({ method: "DELETE", url: `/api/household-finance/fixed-costs/${cost.id}` })
                      toast.success(t("fixedCosts.deleted"))
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )
            )}

            {adding && (
              <EditRow
                onSave={async (name, amount) => {
                  await mutate.mutateAsync({ method: "POST", url: "/api/household-finance/fixed-costs", body: { name, amount } })
                  toast.success(t("fixedCosts.added"))
                  setAdding(false)
                }}
                onCancel={() => setAdding(false)}
              />
            )}

            <Separator className="my-2" />

            <Button
              variant="outline" size="sm" className="w-full mt-2 gap-1.5"
              onClick={() => { setAdding(true); setEditingId(null) }}
            >
              <Plus className="h-3.5 w-3.5" /> {t("fixedCosts.addItem")}
            </Button>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
