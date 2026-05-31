"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SecuritySearch } from "./SecuritySearch"
import { createAssetSchema, type AssetInput } from "@/lib/validations/asset"
import { useCreateAsset } from "@/hooks/useAssets"
import { useI18n } from "@/i18n/context"

const ACCOUNT_SUGGESTIONS = ["Comdirect", "Trade Republic", "DKB", "Flatex", "N26", "Volksbank", "Consorsbank", "ING"]

export function AssetForm() {
  const router = useRouter()
  const { locale, t, translateApiError } = useI18n()
  const assetSchema = useMemo(() => createAssetSchema(locale), [locale])
  const createAsset = useCreateAsset()
  const [selectedSymbol, setSelectedSymbol] = useState<string>()
  const [fetchedPrices, setFetchedPrices] = useState<{ native: number | null; eur: number | null }>({ native: null, eur: null })

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AssetInput>({
    resolver: zodResolver(assetSchema),
    defaultValues: { currency: "EUR" },
  })

  const selectedCurrency = watch("currency") ?? "EUR"

  function handleSecuritySelect(security: {
    symbol: string
    name: string
    assetType: AssetInput["type"]
    currency: string
    currentPrice: number | null
    currentPriceEur: number | null
  }) {
    setValue("ticker", security.symbol)
    setValue("name", security.name)
    setValue("type", security.assetType)
    setFetchedPrices({ native: security.currentPrice, eur: security.currentPriceEur })

    const priceForCurrency = selectedCurrency === "EUR"
      ? (security.currentPriceEur ?? security.currentPrice)
      : security.currentPrice
    if (priceForCurrency != null) {
      setValue("purchasePrice", priceForCurrency)
    }
    setSelectedSymbol(security.symbol)
  }

  function handleCurrencyChange(currency: string | null) {
    if (!currency) return
    setValue("currency", currency)
    const price = currency === "EUR"
      ? (fetchedPrices.eur ?? fetchedPrices.native)
      : fetchedPrices.native
    if (price != null) {
      setValue("purchasePrice", price)
    }
  }

  async function onSubmit(data: AssetInput) {
    try {
      const result = await createAsset.mutateAsync(data)
      if (result.merged) {
        toast.success(t("investments.sharesAdded", { qty: data.quantity, ticker: data.ticker }))
      } else {
        toast.success(t("investments.assetCreated", { name: data.name, ticker: data.ticker }))
      }
      router.push("/investments")
    } catch (err: unknown) {
      toast.error(translateApiError(err))
    }
  }

  const currencySuffix = selectedCurrency === "EUR" ? "€" : "$"

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-2">
        <Label>{t("investments.securitySearch")}</Label>
        <SecuritySearch onSelect={handleSecuritySelect} selectedSymbol={selectedSymbol} />
        {errors.ticker && <p className="text-xs text-destructive">{errors.ticker.message}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ticker">{t("investments.ticker")}</Label>
          <Input id="ticker" placeholder={t("investments.tickerPlaceholder")} {...register("ticker")} />
          {errors.ticker && <p className="text-xs text-destructive">{errors.ticker.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency">{t("investments.currency")}</Label>
          <Select value={selectedCurrency} onValueChange={handleCurrencyChange}>
            <SelectTrigger id="currency">
              <SelectValue placeholder={t("investments.selectCurrency")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EUR">€ EUR</SelectItem>
              <SelectItem value="USD">$ USD</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">{t("common.name")}</Label>
        <Input id="name" placeholder={t("investments.namePlaceholder")} {...register("name")} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="account">{t("investments.account")}</Label>
        <Input
          id="account"
          placeholder={t("investments.accountPlaceholder")}
          list="account-suggestions"
          {...register("account")}
        />
        <datalist id="account-suggestions">
          {ACCOUNT_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
        </datalist>
        {errors.account && <p className="text-xs text-destructive">{errors.account.message}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="purchaseDate">{t("investments.purchaseDateOptional")}</Label>
          <Input id="purchaseDate" type="date" {...register("purchaseDate")} />
          {errors.purchaseDate && <p className="text-xs text-destructive">{errors.purchaseDate.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="purchasePrice">
            {t("investments.pricePerUnit")} ({currencySuffix})
          </Label>
          <Input
            id="purchasePrice"
            type="number"
            step="any"
            placeholder="0.00"
            {...register("purchasePrice", { valueAsNumber: true })}
          />
          {errors.purchasePrice && <p className="text-xs text-destructive">{errors.purchasePrice.message}</p>}
        </div>
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
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">{t("investments.noteOptional")}</Label>
        <Textarea id="note" placeholder={t("investments.notePlaceholder")} rows={2} {...register("note")} />
      </div>

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t("common.saving") : t("common.save")}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/investments")}>
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  )
}
