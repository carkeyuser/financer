import { z } from "zod"
import type { Locale } from "@/i18n/locales"
import { createTranslator } from "@/i18n/messages"

export function createAssetSchema(locale: Locale) {
  const t = createTranslator(locale)
  return z.object({
    ticker: z.string().min(1, t("validation.tickerRequired")),
    name: z.string().min(1, t("validation.nameRequired")),
    type: z.enum(["STOCK", "ETF", "CRYPTO", "BOND", "OTHER"]),
    currency: z.string().min(1, t("validation.currencyRequired")),
    account: z.string().min(1, t("validation.accountRequired")),
    isin: z.string().optional(),
    wkn: z.string().optional(),
    purchaseDate: z.string().optional(),
    purchasePrice: z.number().positive(t("validation.pricePositive")),
    quantity: z.number().positive(t("validation.quantityPositive")),
    note: z.string().optional(),
  })
}

export function createAssetEntrySchema(locale: Locale) {
  const t = createTranslator(locale)
  return z.object({
    assetId: z.string().min(1),
    type: z.enum(["PURCHASE", "SALE", "PRICE_UPDATE", "QUANTITY_UPDATE", "VWAP_UPDATE"]),
    price: z.number().positive(t("validation.pricePositive")).optional(),
    quantity: z.number().positive(t("validation.quantityPositive")).optional(),
    date: z.string().optional(),
    note: z.string().optional(),
  })
}

export function createAssetEditSchema(locale: Locale) {
  const t = createTranslator(locale)
  return z.object({
    name: z.string().min(1, t("validation.nameRequired")),
    type: z.enum(["STOCK", "ETF", "CRYPTO", "BOND", "OTHER"]),
    account: z.string().min(1, t("validation.accountRequired")),
    isin: z.string().optional(),
    wkn: z.string().optional(),
    notes: z.string().optional(),
  })
}

export function createAssetEntryUpdateSchema(locale: Locale) {
  const t = createTranslator(locale)
  return z.object({
    type: z.enum(["PURCHASE", "SALE", "PRICE_UPDATE", "QUANTITY_UPDATE", "VWAP_UPDATE"]),
    price: z.number().positive(t("validation.pricePositive")).optional(),
    quantity: z.number().positive(t("validation.quantityPositive")).optional(),
    date: z.string().optional(),
    note: z.string().optional(),
  })
}

export const assetSchema = createAssetSchema("de")
export const assetEntrySchema = createAssetEntrySchema("de")
export const assetEditSchema = createAssetEditSchema("de")
export const assetEntryUpdateSchema = createAssetEntryUpdateSchema("de")

export type AssetInput = z.infer<ReturnType<typeof createAssetSchema>>
export type AssetEntryInput = z.infer<ReturnType<typeof createAssetEntrySchema>>
export type AssetEntryUpdateInput = z.infer<ReturnType<typeof createAssetEntryUpdateSchema>>
export type AssetEditInput = z.infer<ReturnType<typeof createAssetEditSchema>>
