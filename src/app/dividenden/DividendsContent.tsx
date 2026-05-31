"use client"

import { useEffect, useMemo, useState } from "react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from "recharts"
import { CalendarDays, ChevronLeft, ChevronRight, HandCoins, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useI18n } from "@/i18n/context"
import { monthName } from "@/i18n/messages"
import {
  useCreateDividendPayment,
  useDeleteDividendPayment,
  useDividendSummary,
  useUpdateDividendPayment,
  type DividendAssetOption,
  type DividendEvent,
  type DividendSummary,
} from "@/hooks/useDividends"

function parseInput(value: string): number {
  return parseFloat(value.replace(",", "."))
}

function toInputNumber(value: number): string {
  return Number.isFinite(value) && value > 0 ? String(Number(value.toFixed(6))) : ""
}

function todayInputValue(): string {
  return new Date().toISOString().split("T")[0]
}

function KpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  )
}

function DividendKpis({ summary }: { summary: DividendSummary }) {
  const { t, formatMoney, formatNumber } = useI18n()
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard label={t("dividends.totalYear")} value={formatMoney(summary.kpis.totalYear)} />
      <KpiCard label={t("dividends.currentMonth")} value={formatMoney(summary.kpis.currentMonth)} />
      <KpiCard label={t("dividends.futurePayments")} value={formatMoney(summary.kpis.futureTotal)} />
      <KpiCard label={t("dividends.paymentCount")} value={formatNumber(summary.kpis.paymentCount)} />
    </div>
  )
}

function DividendMonthlyChart({ summary }: { summary: DividendSummary }) {
  const { locale, t, formatMoney } = useI18n()
  const data = summary.monthly.map((item) => ({
    ...item,
    label: monthName(locale, item.month).slice(0, 3),
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("dividends.monthlyChart")}</CardTitle>
        <CardDescription>{t("dividends.monthlyChartDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickFormatter={(value) => formatMoney(Number(value)).replace(",00", "")} tickLine={false} axisLine={false} fontSize={12} width={70} />
              <ChartTooltip formatter={(value) => formatMoney(Number(value))} />
              <Bar dataKey="amount" name={t("dividends.amount")} fill="#22c55e" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

function PaymentDialog({
  open,
  onClose,
  year,
  assets,
  event,
}: {
  open: boolean
  onClose: () => void
  year: number
  assets: DividendAssetOption[]
  event: DividendEvent | null
}) {
  const { t, translateApiError } = useI18n()
  const createPayment = useCreateDividendPayment(year)
  const updatePayment = useUpdateDividendPayment(year)
  const [assetId, setAssetId] = useState("")
  const [date, setDate] = useState("")
  const [amount, setAmount] = useState("")
  const [grossAmount, setGrossAmount] = useState("")
  const [taxAmount, setTaxAmount] = useState("")
  const [amountPerShare, setAmountPerShare] = useState("")
  const [quantity, setQuantity] = useState("")
  const [note, setNote] = useState("")
  const asset = assets.find((item) => item.id === assetId) ?? assets[0]

  useEffect(() => {
    if (!open) return
    const initialAsset = event ? assets.find((item) => item.id === event.assetId) : assets[0]
    setAssetId(initialAsset?.id ?? "")
    setDate(event?.date ?? "")
    setAmount(toInputNumber(event?.amount ?? 0))
    setGrossAmount(toInputNumber(event?.grossAmount ?? 0))
    setTaxAmount(toInputNumber(event?.taxAmount ?? 0))
    setAmountPerShare(toInputNumber(event?.amountPerShare ?? 0))
    setQuantity(toInputNumber(event?.quantity ?? 0))
    setNote(event?.note ?? "")
  }, [assets, event, open])

  if (!asset) return null

  const parsedAmount = parseInput(amount) || 0
  const parsedGross = parseInput(grossAmount)
  const parsedTax = parseInput(taxAmount)
  const parsedAmountPerShare = parseInput(amountPerShare)
  const parsedQuantity = parseInput(quantity)
  const isSaving = createPayment.isPending || updatePayment.isPending

  async function handleSubmit() {
    try {
      const data = {
        assetId,
        date: date || undefined,
        amount: parsedAmount,
        grossAmount: Number.isFinite(parsedGross) ? parsedGross : undefined,
        taxAmount: Number.isFinite(parsedTax) ? parsedTax : undefined,
        amountPerShare: Number.isFinite(parsedAmountPerShare) ? parsedAmountPerShare : undefined,
        quantity: Number.isFinite(parsedQuantity) ? parsedQuantity : undefined,
        note,
      }
      if (event?.paymentId) {
        await updatePayment.mutateAsync({ id: event.paymentId, data })
        toast.success(t("dividends.paymentUpdated"))
      } else {
        await createPayment.mutateAsync(data)
        toast.success(t("dividends.paymentCreated"))
      }
      onClose()
    } catch (error) {
      toast.error(translateApiError(error))
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{event ? t("dividends.editPayment") : t("dividends.addPayment")}</DialogTitle>
          <DialogDescription>{t("dividends.paymentDialogDescription")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>{t("common.position")}</Label>
            <Select value={assetId} onValueChange={(value) => value && setAssetId(value)}>
              <SelectTrigger className="w-full">
                <span className="truncate">{asset.name} · {asset.ticker}</span>
              </SelectTrigger>
              <SelectContent>
                {assets.map((item) => (
                  <SelectItem key={item.id} value={item.id}>{item.name} · {item.ticker}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t("dividends.amount")} *</Label>
              <Input inputMode="decimal" value={amount} onChange={(changeEvent) => setAmount(changeEvent.target.value)} placeholder="0,00" />
            </div>
            <div className="space-y-1.5">
              <Label>{t("common.date")} <span className="text-muted-foreground">({t("common.optional")})</span></Label>
              <Input type="date" value={date} onChange={(changeEvent) => setDate(changeEvent.target.value)} placeholder={todayInputValue()} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("dividends.gross")} <span className="text-muted-foreground">({t("common.optional")})</span></Label>
              <Input inputMode="decimal" value={grossAmount} onChange={(changeEvent) => setGrossAmount(changeEvent.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("dividends.tax")} <span className="text-muted-foreground">({t("common.optional")})</span></Label>
              <Input inputMode="decimal" value={taxAmount} onChange={(changeEvent) => setTaxAmount(changeEvent.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("dividends.amountPerShare")} <span className="text-muted-foreground">({t("common.optional")})</span></Label>
              <Input inputMode="decimal" value={amountPerShare} onChange={(changeEvent) => setAmountPerShare(changeEvent.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("common.quantity")} <span className="text-muted-foreground">({t("common.optional")})</span></Label>
              <Input inputMode="decimal" value={quantity} onChange={(changeEvent) => setQuantity(changeEvent.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{t("common.note")}</Label>
            <Textarea value={note} onChange={(changeEvent) => setNote(changeEvent.target.value)} placeholder={t("dividends.notePlaceholder")} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
          <Button onClick={handleSubmit} disabled={isSaving || !assetId || parsedAmount <= 0}>
            {isSaving ? t("common.saving") : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DividendEvents({ summary, onEdit }: { summary: DividendSummary; onEdit: (event: DividendEvent | null) => void }) {
  const { t, formatDate, formatMoney, formatNumber } = useI18n()
  const deletePayment = useDeleteDividendPayment(summary.year)

  async function handleDelete(event: DividendEvent) {
    if (!window.confirm(t("dividends.deletePaymentConfirm"))) return
    try {
      await deletePayment.mutateAsync(event.paymentId)
      toast.success(t("dividends.paymentDeleted"))
    } catch {
      toast.error(t("dividends.paymentDeleteFailed"))
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base">{t("dividends.eventsTitle")}</CardTitle>
            <CardDescription>{t("dividends.eventsDescription")}</CardDescription>
          </div>
          <Button onClick={() => onEdit(null)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            {t("dividends.addPayment")}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {summary.events.length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">{t("dividends.noEvents")}</p>
        ) : (
          <div className="space-y-2">
            {summary.events.map((event) => {
              const isFuture = event.status === "EXPECTED"
              return (
                <div key={event.id} className="flex flex-col gap-3 rounded-lg border p-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{event.name}</p>
                      <Badge variant={isFuture ? "secondary" : "default"}>
                        {isFuture ? t("dividends.future") : t("dividends.received")}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {event.ticker} · {event.account || t("common.dash")}
                      {event.ownerName ? ` · ${event.ownerName}` : ""} · {formatDate(event.date)}
                    </p>
                    {event.note && <p className="mt-1 text-xs text-muted-foreground">{event.note}</p>}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 md:justify-end">
                    <div className="text-sm md:text-right">
                      <p className="font-semibold text-green-500">{formatMoney(event.amount)}</p>
                      {(event.quantity > 0 || event.amountPerShare > 0 || event.taxAmount > 0) && (
                        <p className="text-xs text-muted-foreground">
                          {event.quantity > 0 && event.amountPerShare > 0
                            ? `${formatNumber(event.quantity)} × ${formatMoney(event.amountPerShare)}`
                            : t("dividends.manualDetails")}
                          {event.taxAmount > 0 ? ` · ${t("dividends.tax")}: ${formatMoney(event.taxAmount)}` : ""}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => onEdit(event)}>
                        <Pencil className="h-3.5 w-3.5" />
                        <span className="ml-1.5 hidden sm:inline">{t("common.edit")}</span>
                      </Button>
                      <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => handleDelete(event)} disabled={deletePayment.isPending}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function DividendsContent() {
  const { t, formatMoney } = useI18n()
  const [year, setYear] = useState(new Date().getFullYear())
  const [editingEvent, setEditingEvent] = useState<DividendEvent | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const { data: summary, isLoading, error } = useDividendSummary(year)

  const latestEvent = useMemo(() => summary?.events[0] ?? null, [summary])

  function openDialog(event: DividendEvent | null) {
    setEditingEvent(event)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("dividends.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("dividends.pageDescription")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setYear((current) => current - 1)} aria-label={t("dividends.previousYear")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-20 rounded-md border px-3 py-2 text-center text-sm font-medium">{year}</div>
          <Button variant="outline" size="icon" onClick={() => setYear((current) => current + 1)} aria-label={t("dividends.nextYear")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {summary && (
            <Button onClick={() => openDialog(null)} className="gap-1.5">
              <Plus className="h-4 w-4" />
              {t("dividends.addPayment")}
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">{t("dividends.loading")}</div>
      ) : error || !summary ? (
        <div className="flex h-40 items-center justify-center text-sm text-destructive">{t("dividends.loadFailed")}</div>
      ) : summary.assets.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-center">
          <HandCoins className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("dividends.noAssets")}</p>
        </div>
      ) : (
        <>
          <DividendKpis summary={summary} />

          {latestEvent && (
            <Card>
              <CardContent className="flex flex-col gap-2 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-green-500/10 p-2 text-green-500">
                    <CalendarDays className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t("dividends.latestPayment")}</p>
                    <p className="text-xs text-muted-foreground">{latestEvent.name} · {latestEvent.date}</p>
                  </div>
                </div>
                <p className="text-lg font-semibold text-green-500">{formatMoney(latestEvent.amount)}</p>
              </CardContent>
            </Card>
          )}

          <DividendMonthlyChart summary={summary} />
          <DividendEvents summary={summary} onEdit={openDialog} />
          <PaymentDialog
            open={dialogOpen}
            onClose={() => setDialogOpen(false)}
            year={year}
            assets={summary.assets}
            event={editingEvent}
          />
        </>
      )}
    </div>
  )
}
