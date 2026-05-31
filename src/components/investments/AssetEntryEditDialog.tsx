"use client"

import { useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createAssetEntryUpdateSchema, type AssetEntryUpdateInput } from "@/lib/validations/asset"
import { useUpdateAssetEntry, type AssetEntry } from "@/hooks/useAssets"
import { useI18n } from "@/i18n/context"
import { entryTypeLabel } from "@/i18n/messages"

const EDITABLE_TYPES = ["PURCHASE", "SALE", "PRICE_UPDATE"] as const

interface Props {
  entry: AssetEntry
  open: boolean
  onClose: () => void
}

export function AssetEntryEditDialog({ entry, open, onClose }: Props) {
  const { locale, t, translateApiError } = useI18n()
  const assetEntryUpdateSchema = useMemo(() => createAssetEntryUpdateSchema(locale), [locale])
  const updateEntry = useUpdateAssetEntry()

  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } =
    useForm<AssetEntryUpdateInput>({
      resolver: zodResolver(assetEntryUpdateSchema),
      defaultValues: {
        type: entry.type,
        price: parseFloat(entry.price),
        quantity: entry.quantity ? parseFloat(entry.quantity) : undefined,
        date: format(new Date(entry.date), "yyyy-MM-dd"),
        note: entry.note ?? "",
      },
    })

  useEffect(() => {
    if (open) {
      reset({
        type: entry.type,
        price: parseFloat(entry.price),
        quantity: entry.quantity ? parseFloat(entry.quantity) : undefined,
        date: format(new Date(entry.date), "yyyy-MM-dd"),
        note: entry.note ?? "",
      })
    }
  }, [open, entry, reset])

  const entryType = watch("type")
  const isOverrideType = entry.type === "QUANTITY_UPDATE" || entry.type === "VWAP_UPDATE"
  const showQuantity = entryType !== "PRICE_UPDATE" && entryType !== "VWAP_UPDATE"

  async function onSubmit(data: AssetEntryUpdateInput) {
    try {
      await updateEntry.mutateAsync({ id: entry.id, data })
      toast.success(t("investments.entryUpdated"))
      onClose()
    } catch (err: unknown) {
      toast.error(translateApiError(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("investments.editEntry")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>{t("common.type")}</Label>
            {isOverrideType ? (
              <p className="text-sm text-muted-foreground py-1">
                {entryTypeLabel(locale, entry.type)}
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {EDITABLE_TYPES.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setValue("type", value)}
                    className={`min-h-10 rounded-md border px-3 py-2 text-sm transition-colors sm:min-h-0 ${
                      entryType === value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-input hover:bg-accent"
                    }`}
                  >
                    {entryTypeLabel(locale, value)}
                  </button>
                ))}
              </div>
            )}
            {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
          </div>

          <div className={`grid grid-cols-1 gap-4 ${showQuantity ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
            <div className="space-y-1">
              <Label htmlFor="ee-date">{t("common.date")}</Label>
              <Input id="ee-date" type="date" {...register("date")} />
              {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="ee-price">{t("investments.pricePerUnit")}</Label>
              <Input
                id="ee-price"
                type="number"
                step="any"
                placeholder="0.00"
                {...register("price", { valueAsNumber: true })}
              />
              {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
            </div>
            {showQuantity && (
              <div className="space-y-1">
                <Label htmlFor="ee-quantity">{t("common.quantity")}</Label>
                <Input
                  id="ee-quantity"
                  type="number"
                  step="any"
                  placeholder="0"
                  {...register("quantity", { valueAsNumber: true })}
                />
                {errors.quantity && <p className="text-xs text-destructive">{errors.quantity.message}</p>}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="ee-note">{t("investments.noteOptional")}</Label>
            <Textarea id="ee-note" placeholder={t("investments.notePlaceholder")} rows={2} {...register("note")} />
          </div>

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
