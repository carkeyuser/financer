"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createAssetEntrySchema, type AssetEntryInput } from "@/lib/validations/asset"
import { useCreateAssetEntry } from "@/hooks/useAssets"
import { useI18n } from "@/i18n/context"
import { entryTypeShortLabel } from "@/i18n/messages"

interface AssetEntryFormProps {
  assetId: string
  assetName: string
  ticker: string
  assetCurrency?: string
}

const ENTRY_TYPE_VALUES = ["PURCHASE", "SALE", "PRICE_UPDATE"] as const

export function AssetEntryForm({ assetId, assetName, ticker, assetCurrency = "EUR" }: AssetEntryFormProps) {
  const router = useRouter()
  const { locale, t, translateApiError } = useI18n()
  const assetEntrySchema = useMemo(() => createAssetEntrySchema(locale), [locale])
  const createEntry = useCreateAssetEntry()
  const [fetchingPrice, setFetchingPrice] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AssetEntryInput>({
    resolver: zodResolver(assetEntrySchema),
    defaultValues: { assetId, type: "PURCHASE" },
  })

  const entryType = watch("type")
  const dateValue = watch("date")
  const showQuantity = entryType !== "PRICE_UPDATE"

  useEffect(() => {
    if (dateValue) return
    setFetchingPrice(true)
    fetch(`/api/securities/price?symbol=${encodeURIComponent(ticker)}`)
      .then((r) => r.json())
      .then((data) => {
        const price = assetCurrency === "EUR"
          ? (data.priceEur ?? data.price)
          : (data.price ?? data.priceEur)
        if (price != null) setValue("price", parseFloat(price.toFixed(2)))
      })
      .catch(() => {})
      .finally(() => setFetchingPrice(false))
  }, [dateValue, ticker, assetCurrency, setValue])

  async function onSubmit(data: AssetEntryInput) {
    try {
      await createEntry.mutateAsync(data)
      toast.success(t("investments.entrySaved", {
        type: entryTypeShortLabel(locale, data.type),
        assetName,
      }))
      router.push(`/investments/${assetId}`)
    } catch (err: unknown) {
      toast.error(translateApiError(err))
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <input type="hidden" {...register("assetId")} />

      <div className="space-y-2">
        <Label>{t("common.type")}</Label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {ENTRY_TYPE_VALUES.map((value) => (
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
              {entryTypeShortLabel(locale, value)}
            </button>
          ))}
        </div>
        {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
      </div>

      <div className={`grid grid-cols-1 gap-4 ${showQuantity ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        <div className="space-y-2">
          <Label htmlFor="date">
            {t("common.date")}{" "}
            <span className="font-normal text-muted-foreground">({t("common.optional")})</span>
          </Label>
          <Input id="date" type="date" {...register("date")} />
          {!dateValue && (
            <p className="text-xs text-muted-foreground">{t("investments.todayDefault")}</p>
          )}
          {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="price">{t("investments.pricePerUnit")}</Label>
          <Input
            id="price"
            type="number"
            step="any"
            placeholder={fetchingPrice ? t("investments.loadingPrice") : "0.00"}
            disabled={fetchingPrice}
            {...register("price", { valueAsNumber: true })}
          />
          {!dateValue && !fetchingPrice && (
            <p className="text-xs text-muted-foreground">{t("investments.currentPrice")}</p>
          )}
          {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
        </div>
        {showQuantity && (
          <div className="space-y-2">
            <Label htmlFor="quantity">{t("common.quantity")}</Label>
            <Input
              id="quantity"
              type="number"
              step="any"
              placeholder="0"
              {...register("quantity", { valueAsNumber: true })}
            />
            {errors.quantity && <p className="text-xs text-destructive">{errors.quantity.message}</p>}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">{t("investments.noteOptional")}</Label>
        <Textarea id="note" placeholder={t("investments.notePlaceholder")} rows={2} {...register("note")} />
      </div>

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
        <Button type="submit" disabled={isSubmitting || fetchingPrice}>
          {isSubmitting ? t("common.saving") : t("common.save")}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push(`/investments/${assetId}`)}>
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  )
}
