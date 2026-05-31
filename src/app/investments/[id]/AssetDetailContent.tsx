"use client"

import { useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { Plus, ArrowLeft, Trash2, TrendingUp, TrendingDown, Pencil, SquarePen, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAsset, useDeleteAssetEntry, useDeleteAsset, useCreateAssetEntry, useUpdateAssetEntry, type AssetEntry } from "@/hooks/useAssets"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  getCurrentValue,
  getTotalGainLoss,
  getGainLossPercent,
  getVWAP,
  getCurrentPrice,
} from "@/lib/utils/calculations"
import { useRouter } from "next/navigation"
import { AssetEditDialog } from "@/components/investments/AssetEditDialog"
import { AssetEntryEditDialog } from "@/components/investments/AssetEntryEditDialog"
import { useI18n } from "@/i18n/context"
import { assetTypeLabel, entryTypeLabel } from "@/i18n/messages"

export function AssetDetailContent({ assetId }: { assetId: string }) {
  const router = useRouter()
  const { locale, t, formatMoney, formatNumber, formatPercent, getDateFnsLocale, translateApiError } = useI18n()
  const dateFnsLocale = getDateFnsLocale()
  const { data: asset, isLoading, error } = useAsset(assetId)
  const deleteEntry = useDeleteAssetEntry()
  const deleteAsset = useDeleteAsset()
  const createEntry = useCreateAssetEntry()
  const updateEntry = useUpdateAssetEntry()
  const [editOpen, setEditOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<AssetEntry | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [editingQty, setEditingQty] = useState(false)
  const [qtyInput, setQtyInput] = useState("")
  const [savingQty, setSavingQty] = useState(false)
  const [editingVwap, setEditingVwap] = useState(false)
  const [vwapInput, setVwapInput] = useState("")
  const [savingVwap, setSavingVwap] = useState(false)
  const [editingValue, setEditingValue] = useState(false)
  const [valueInput, setValueInput] = useState("")
  const [savingValue, setSavingValue] = useState(false)

  if (isLoading) return <div className="text-muted-foreground text-sm py-10">{t("common.loading")}</div>
  if (error || !asset) return <div className="text-destructive text-sm py-10">{t("investments.assetNotFound")}</div>

  const eurRate = asset.eurRate ?? 1
  const isEur = asset.currency === "EUR"
  const value = getCurrentValue(asset, asset.entries) * eurRate
  const gainLoss = getTotalGainLoss(asset, asset.entries) * eurRate
  const gainLossPct = getGainLossPercent(asset, asset.entries)
  const vwap = getVWAP(asset.entries)
  const currentPrice = getCurrentPrice(asset.entries)
  const qty = parseFloat(asset.quantity)
  const isPos = gainLoss >= 0
  const entries = [...asset.entries].reverse()

  async function handleDeleteEntry(id: string) {
    try {
      await deleteEntry.mutateAsync(id)
      toast.success(t("investments.entryDeleted"))
    } catch (err: unknown) {
      toast.error(translateApiError(err))
    }
  }

  async function handleSaveValue() {
    const newValueEur = parseFloat(valueInput.replace(",", "."))
    if (isNaN(newValueEur) || newValueEur <= 0) { toast.error(t("investments.invalidValue")); return }
    const newPriceNative = newValueEur / qty / eurRate
    setSavingValue(true)
    try {
      const today = new Date().toISOString().split("T")[0]
      const sorted = [...asset!.entries].sort((a, b) => a.date.localeCompare(b.date))
      const latest = sorted[sorted.length - 1]
      if (latest?.type === "PRICE_UPDATE" && latest.date.startsWith(today)) {
        await updateEntry.mutateAsync({ id: latest.id, data: { type: "PRICE_UPDATE", price: newPriceNative, date: today, note: latest.note ?? undefined } })
        toast.success(t("investments.valueUpdated"))
      } else {
        await createEntry.mutateAsync({ assetId: asset!.id, type: "PRICE_UPDATE", price: newPriceNative, date: today })
        toast.success(t("investments.valueCreated"))
      }
      setEditingValue(false)
    } catch (err: unknown) {
      toast.error(translateApiError(err))
    } finally {
      setSavingValue(false)
    }
  }

  async function handleSaveVwap() {
    const newVwap = parseFloat(vwapInput.replace(",", "."))
    if (isNaN(newVwap) || newVwap <= 0) { toast.error(t("investments.invalidVwap")); return }
    setSavingVwap(true)
    try {
      await createEntry.mutateAsync({ assetId: asset!.id, type: "VWAP_UPDATE", price: newVwap })
      toast.success(t("investments.vwapUpdated"))
      setEditingVwap(false)
    } catch (err: unknown) {
      toast.error(translateApiError(err))
    } finally {
      setSavingVwap(false)
    }
  }

  async function handleRefreshPrice() {
    setRefreshing(true)
    try {
      const res = await fetch(`/api/securities/price?symbol=${encodeURIComponent(asset!.ticker)}`)
      const data = await res.json()
      const nativePrice: number | null = data.price ?? null
      const price: number | null = isEur
        ? (data.priceEur ?? (nativePrice != null ? nativePrice * (data.eurRate ?? 1) : null))
        : nativePrice
      if (price == null) { toast.error(t("investments.priceFetchFailed")); return }

      const today = new Date().toISOString().split("T")[0]
      const sorted = [...asset!.entries].sort((a, b) => a.date.localeCompare(b.date))
      const latest = sorted[sorted.length - 1]

      if (latest?.type === "PRICE_UPDATE" && latest.date.startsWith(today)) {
        await updateEntry.mutateAsync({ id: latest.id, data: { type: "PRICE_UPDATE", price, date: today, note: latest.note ?? undefined } })
        toast.success(t("investments.priceUpdated"))
      } else {
        await createEntry.mutateAsync({ assetId: asset!.id, type: "PRICE_UPDATE", price, date: today })
        toast.success(t("investments.priceCreated"))
      }
    } catch (err: unknown) {
      toast.error(translateApiError(err))
    } finally {
      setRefreshing(false)
    }
  }

  async function handleSaveQty() {
    const newQty = parseFloat(qtyInput.replace(",", "."))
    if (isNaN(newQty) || newQty <= 0) { toast.error(t("investments.invalidQuantity")); return }
    setSavingQty(true)
    try {
      await createEntry.mutateAsync({ assetId: asset!.id, type: "QUANTITY_UPDATE", quantity: newQty })
      toast.success(t("investments.quantityUpdated"))
      setEditingQty(false)
    } catch (err: unknown) {
      toast.error(translateApiError(err))
    } finally {
      setSavingQty(false)
    }
  }

  async function handleDeleteAsset() {
    if (!confirm(t("investments.deleteConfirm", { name: asset!.name, ticker: asset!.ticker }))) return
    try {
      await deleteAsset.mutateAsync(assetId)
      toast.success(t("investments.positionDeleted"))
      router.push("/investments")
    } catch (err: unknown) {
      toast.error(translateApiError(err))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link href="/investments" className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold truncate">{asset.name}</h1>
            <Badge variant="secondary">{assetTypeLabel(locale, asset.type)}</Badge>
            <span className="text-muted-foreground text-sm">{asset.ticker}</span>
          </div>
          {(asset.isin || asset.wkn) && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {asset.isin && `ISIN: ${asset.isin}`}{asset.isin && asset.wkn && " · "}{asset.wkn && `WKN: ${asset.wkn}`}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <Button variant="outline" size="icon" onClick={() => setEditOpen(true)} title={t("common.edit")}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleRefreshPrice} disabled={refreshing} title={t("investments.updatePrice")}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
          <Link href={`/investments/${assetId}/entry`} className={cn(buttonVariants())}>
            <Plus className="h-4 w-4 mr-2" />{t("investments.addEntry")}
          </Link>
          <Button variant="destructive" size="icon" onClick={handleDeleteAsset}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">{t("investments.currentValue")}</p>
            {editingValue ? (
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <input
                  type="number"
                  step="any"
                  autoFocus
                  value={valueInput}
                  onChange={(e) => setValueInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSaveValue(); if (e.key === "Escape") setEditingValue(false) }}
                  className="h-10 w-full rounded border border-input bg-background px-2 py-0.5 text-sm sm:h-auto sm:w-28"
                />
                <Button size="sm" className="h-10 px-3 text-xs sm:h-6 sm:px-2" onClick={handleSaveValue} disabled={savingValue}>
                  {savingValue ? "…" : t("common.ok")}
                </Button>
                <Button size="sm" variant="ghost" className="h-10 px-3 text-xs sm:h-6 sm:px-2" onClick={() => setEditingValue(false)}>✕</Button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <p className="text-xl font-bold">{formatMoney(value)}</p>
                <button
                  onClick={() => { setValueInput(value.toFixed(2)); setEditingValue(true) }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title={t("investments.setValueManually")}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            {!isEur && !editingValue && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatMoney(getCurrentValue(asset, asset.entries), asset.currency)}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">{t("investments.gainLossLabel")}</p>
            <p className={`text-xl font-bold flex items-center gap-1 ${isPos ? "text-green-500" : "text-red-500"}`}>
              {isPos ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {isPos ? "+" : ""}{formatMoney(gainLoss)}
            </p>
            <p className={`text-xs ${isPos ? "text-green-500" : "text-red-500"}`}>
              {isPos ? "+" : ""}{formatPercent(gainLossPct, 2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">{t("common.quantity")}</p>
            {editingQty ? (
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <input
                  type="number"
                  step="any"
                  autoFocus
                  value={qtyInput}
                  onChange={(e) => setQtyInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSaveQty(); if (e.key === "Escape") setEditingQty(false) }}
                  className="h-10 w-full rounded border border-input bg-background px-2 py-0.5 text-sm sm:h-auto sm:w-28"
                />
                <Button size="sm" className="h-10 px-3 text-xs sm:h-6 sm:px-2" onClick={handleSaveQty} disabled={savingQty}>
                  {savingQty ? "…" : t("common.ok")}
                </Button>
                <Button size="sm" variant="ghost" className="h-10 px-3 text-xs sm:h-6 sm:px-2" onClick={() => setEditingQty(false)}>✕</Button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <p className="text-xl font-bold">{formatNumber(qty, { maximumFractionDigits: 6 })}</p>
                <button
                  onClick={() => { setQtyInput(qty.toString()); setEditingQty(true) }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title={t("investments.correctQuantity")}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">{t("investments.avgPurchasePrice")}</p>
            {editingVwap ? (
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <input
                  type="number"
                  step="any"
                  autoFocus
                  value={vwapInput}
                  onChange={(e) => setVwapInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSaveVwap(); if (e.key === "Escape") setEditingVwap(false) }}
                  className="h-10 w-full rounded border border-input bg-background px-2 py-0.5 text-sm sm:h-auto sm:w-28"
                />
                <Button size="sm" className="h-10 px-3 text-xs sm:h-6 sm:px-2" onClick={handleSaveVwap} disabled={savingVwap}>
                  {savingVwap ? "…" : t("common.ok")}
                </Button>
                <Button size="sm" variant="ghost" className="h-10 px-3 text-xs sm:h-6 sm:px-2" onClick={() => setEditingVwap(false)}>✕</Button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <p className="text-xl font-bold">{formatMoney(vwap * eurRate)}</p>
                <button
                  onClick={() => { setVwapInput((vwap).toFixed(4)); setEditingVwap(true) }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title={t("investments.correctVwap")}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("investments.current")} {formatMoney(currentPrice * eurRate)}
              {!isEur && ` (${formatMoney(currentPrice, asset.currency)})`}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("investments.entries")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {asset.entries.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4">{t("investments.noEntries")}</p>
          ) : (
            <>
              <div className="space-y-3 p-3 md:hidden">
                {entries.map((entry) => {
                  const price = parseFloat(entry.price)
                  const entryQty = entry.quantity ? parseFloat(entry.quantity) : null
                  const total = entryQty != null ? price * entryQty : null
                  return (
                    <div key={entry.id} className="rounded-lg border p-3">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">
                            {format(new Date(entry.date), "dd.MM.yyyy", { locale: dateFnsLocale })}
                          </p>
                          <Badge
                            variant={
                              entry.type === "PURCHASE"
                                ? "default"
                                : entry.type === "SALE"
                                ? "destructive"
                                : entry.type === "QUANTITY_UPDATE"
                                ? "outline"
                                : entry.type === "VWAP_UPDATE"
                                ? "outline"
                                : "secondary"
                            }
                            className="mt-1 text-xs"
                          >
                            {entryTypeLabel(locale, entry.type)}
                          </Badge>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 text-muted-foreground hover:text-foreground"
                            onClick={() => setEditingEntry(entry)}
                          >
                            <SquarePen className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteEntry(entry.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">{t("investments.price")}</p>
                          <p className="font-medium">{formatMoney(price, asset.currency)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">{t("common.quantity")}</p>
                          <p className="font-medium">
                            {entryQty != null ? formatNumber(entryQty, { maximumFractionDigits: 6 }) : t("common.dash")}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">{t("common.total")}</p>
                          <p className="font-medium">{total != null ? formatMoney(total, asset.currency) : t("common.dash")}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">{t("common.note")}</p>
                          <p className="truncate text-muted-foreground">{entry.note ?? t("common.dash")}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("common.date")}</TableHead>
                      <TableHead>{t("common.type")}</TableHead>
                      <TableHead className="text-right">{t("investments.price")}</TableHead>
                      <TableHead className="text-right">{t("common.quantity")}</TableHead>
                      <TableHead className="text-right">{t("common.total")}</TableHead>
                      <TableHead>{t("common.note")}</TableHead>
                      <TableHead className="w-20" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry) => {
                      const price = parseFloat(entry.price)
                      const entryQty = entry.quantity ? parseFloat(entry.quantity) : null
                      const total = entryQty != null ? price * entryQty : null
                      return (
                        <TableRow key={entry.id}>
                          <TableCell className="text-sm">
                            {format(new Date(entry.date), "dd.MM.yyyy", { locale: dateFnsLocale })}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                entry.type === "PURCHASE"
                                  ? "default"
                                  : entry.type === "SALE"
                                  ? "destructive"
                                  : entry.type === "QUANTITY_UPDATE"
                                  ? "outline"
                                  : entry.type === "VWAP_UPDATE"
                                  ? "outline"
                                  : "secondary"
                              }
                              className="text-xs"
                            >
                              {entryTypeLabel(locale, entry.type)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-sm">{formatMoney(price, asset.currency)}</TableCell>
                          <TableCell className="text-right text-sm">
                            {entryQty != null ? formatNumber(entryQty, { maximumFractionDigits: 6 }) : t("common.dash")}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {total != null ? formatMoney(total, asset.currency) : t("common.dash")}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                            {entry.note ?? t("common.dash")}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={() => setEditingEntry(entry)}
                              >
                                <SquarePen className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => handleDeleteEntry(entry.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      {editOpen && (
        <AssetEditDialog asset={asset} open={editOpen} onClose={() => setEditOpen(false)} />
      )}
      {editingEntry && (
        <AssetEntryEditDialog
          entry={editingEntry}
          open={!!editingEntry}
          onClose={() => setEditingEntry(null)}
        />
      )}
    </div>
  )
}
