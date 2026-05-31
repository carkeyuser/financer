"use client"

import { useCallback, useMemo, useState } from "react"
import Link from "next/link"
import { Upload, Loader2, AlertTriangle, CheckCircle2, FileSpreadsheet } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SecuritySearch } from "@/components/investments/SecuritySearch"
import { useHousehold } from "@/hooks/useHousehold"
import {
  useTradeRepublicApply,
  useTradeRepublicPreview,
  type TrImportApplyResponse,
  type TrImportPreviewResponse,
} from "@/hooks/useTradeRepublicImport"
import { useI18n } from "@/i18n/context"
import type { TrImportPreviewRow, TrImportResolution, TrTickerOverride } from "@/lib/services/tr-import-types"
import { countUnresolvedTickers, initialTickerOverrides, type TrTickerMapping } from "@/lib/services/tr-import-ticker-mapping"
import { cn } from "@/lib/utils"

type WizardStep = "intro" | "upload" | "analyze" | "overview" | "conflicts" | "tickers" | "confirm" | "result"

interface TradeRepublicImportWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TradeRepublicImportWizard({ open, onOpenChange }: TradeRepublicImportWizardProps) {
  const { t, translateApiError } = useI18n()
  const ti = (key: string, params?: Record<string, string | number>) => {
    const path = `investments.trImport.${key}`
    let s = t(path as "investments.trImport.button")
    if (params) {
      for (const [k, v] of Object.entries(params)) s = s.replace(`{${k}}`, String(v))
    }
    return s
  }

  const [step, setStep] = useState<WizardStep>("intro")
  const [account, setAccount] = useState("Trade Republic")
  const [targetUserId, setTargetUserId] = useState<string>("")
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<TrImportPreviewResponse | null>(null)
  const [filter, setFilter] = useState<string>("all")
  const [resolutions, setResolutions] = useState<Record<string, TrImportResolution>>({})
  const [tickerOverrides, setTickerOverrides] = useState<Record<string, TrTickerOverride>>({})
  const [applyResult, setApplyResult] = useState<TrImportApplyResponse | null>(null)

  const previewMutation = useTradeRepublicPreview()
  const applyMutation = useTradeRepublicApply()
  const { data: household } = useHousehold()

  const isAdmin = household?.myRole === "OWNER" || household?.myRole === "ADMIN"

  const conflictRows = useMemo(
    () => preview?.rows.filter((r) => r.status === "conflict" || r.status === "skip_soft") ?? [],
    [preview]
  )
  const tickerMappings = preview?.tickerMappings ?? []
  const unresolvedTickers = countUnresolvedTickers(tickerMappings, tickerOverrides)

  const filteredRows = useMemo(() => {
    if (!preview) return []
    if (filter === "all") return preview.rows
    return preview.rows.filter((r) => r.status === filter)
  }, [preview, filter])

  const unresolvedConflicts = conflictRows.filter(
    (r) => r.status === "conflict" && !resolutions[r.rowId]
  ).length

  const reset = useCallback(() => {
    setStep("intro")
    setAccount("Trade Republic")
    setTargetUserId("")
    setFile(null)
    setPreview(null)
    setFilter("all")
    setResolutions({})
    setTickerOverrides({})
    setApplyResult(null)
    previewMutation.reset()
    applyMutation.reset()
  }, [previewMutation, applyMutation])

  const handleClose = (o: boolean) => {
    if (!o) reset()
    onOpenChange(o)
  }

  const runPreview = async () => {
    if (!file) return
    setStep("analyze")
    try {
      const result = await previewMutation.mutateAsync({
        file,
        account: account.trim() || ti("accountDefault"),
        targetUserId: targetUserId || undefined,
      })
      setPreview(result)
      setTickerOverrides(initialTickerOverrides(result.tickerMappings))
      setStep("overview")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : ti("analyzeFailed"))
      setStep("upload")
    }
  }

  const goAfterOverview = () => {
    if (conflictRows.length > 0) setStep("conflicts")
    else if (tickerMappings.length > 0) setStep("tickers")
    else setStep("confirm")
  }

  const goAfterConflicts = () => {
    if (tickerMappings.length > 0) setStep("tickers")
    else setStep("confirm")
  }

  const runApply = async () => {
    if (!preview) return
    try {
      const result = await applyMutation.mutateAsync({
        previewId: preview.previewId,
        resolutions,
        tickerOverrides,
      })
      setApplyResult(result)
      setStep("result")
      if (result.errors.length > 0) {
        toast.warning(result.errors[0])
      } else {
        toast.success(ti("resultTitle"))
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : translateApiError({ error: "Import fehlgeschlagen" }))
    }
  }

  const applyCounts = useMemo(() => {
    if (!preview) return { created: 0, linked: 0, skipped: 0 }
    let created = 0
    let linked = 0
    let skipped = 0
    for (const row of preview.rows) {
      if (row.status === "skip_hard" || row.status === "ignored") {
        skipped++
        continue
      }
      const action = resolutions[row.rowId] ?? row.defaultResolution
      if (action === "skip") skipped++
      else if (action === "link") linked++
      else if (row.status === "import_new" || action === "import" || action === "replace") created++
    }
    return { created, linked, skipped }
  }, [preview, resolutions])

  const stepLabels: { id: WizardStep; label: string }[] = [
    { id: "intro", label: ti("stepIntro") },
    { id: "upload", label: ti("stepUpload") },
    { id: "overview", label: ti("stepOverview") },
    { id: "conflicts", label: ti("stepConflicts") },
    { id: "tickers", label: ti("stepTickers") },
    { id: "confirm", label: ti("stepConfirm") },
  ]

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{ti("title")}</DialogTitle>
        </DialogHeader>

        {step !== "analyze" && step !== "result" && (
          <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
            {stepLabels.map((s) => (
              <Badge key={s.id} variant={step === s.id ? "default" : "outline"} className="font-normal">
                {s.label}
              </Badge>
            ))}
          </div>
        )}

        {step === "intro" && (
          <div className="space-y-4">
            <p className="font-medium">{ti("introTitle")}</p>
            <p className="text-sm text-muted-foreground">{ti("introBody")}</p>
            <div className="rounded-md border bg-muted/40 p-3 text-sm">{ti("introSteps")}</div>
            <Button className="w-full sm:w-auto" onClick={() => setStep("upload")}>{ti("next")}</Button>
          </div>
        )}

        {step === "upload" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tr-account">{ti("accountLabel")}</Label>
              <Input id="tr-account" value={account} onChange={(e) => setAccount(e.target.value)} />
            </div>
            {isAdmin && household?.members && household.members.length > 1 && (
              <div className="space-y-2">
                <Label>{ti("ownerLabel")}</Label>
                <Select value={targetUserId || "__self__"} onValueChange={(v) => setTargetUserId(v === "__self__" ? "" : v ?? "")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__self__">{t("nav.profile")}</SelectItem>
                    {household.members.map((m) => (
                      <SelectItem key={m.userId} value={m.userId}>{m.name ?? m.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>{ti("fileLabel")}</Label>
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed p-8 hover:bg-muted/40">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{ti("fileHint")}</span>
                {file && (
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <FileSpreadsheet className="h-4 w-4" />{file.name}
                  </span>
                )}
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("intro")}>{ti("back")}</Button>
              <Button disabled={!file} onClick={runPreview}>{ti("analyze")}</Button>
            </div>
          </div>
        )}

        {step === "analyze" && (
          <div className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{ti("analyzing")}</p>
          </div>
        )}

        {step === "overview" && preview && (
          <OverviewStep
            preview={preview}
            filter={filter}
            setFilter={setFilter}
            filteredRows={filteredRows}
            ti={ti}
            onBack={() => setStep("upload")}
            onNext={goAfterOverview}
          />
        )}

        {step === "conflicts" && preview && (
          <ConflictsStep
            rows={conflictRows}
            resolutions={resolutions}
            setResolutions={setResolutions}
            unresolved={unresolvedConflicts}
            ti={ti}
            t={t}
            onBack={() => setStep("overview")}
            onNext={goAfterConflicts}
            onSkipAllSoft={() => {
              const next = { ...resolutions }
              for (const row of conflictRows) {
                if (row.status === "skip_soft") next[row.rowId] = "skip"
              }
              setResolutions(next)
            }}
          />
        )}

        {step === "tickers" && preview && (
          <TickersStep
            mappings={tickerMappings}
            tickerOverrides={tickerOverrides}
            setTickerOverrides={setTickerOverrides}
            unresolved={unresolvedTickers}
            ti={ti}
            onBack={() => setStep(conflictRows.length > 0 ? "conflicts" : "overview")}
            onNext={() => setStep("confirm")}
          />
        )}

        {step === "confirm" && preview && (
          <div className="space-y-4">
            <p className="font-medium">{ti("confirmTitle")}</p>
            <p className="text-sm text-muted-foreground">
              {ti("confirmBody", applyCounts)}
            </p>
            <SummaryCards summary={preview.summary} ti={ti} />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(tickerMappings.length > 0 ? "tickers" : conflictRows.length > 0 ? "conflicts" : "overview")}>
                {ti("back")}
              </Button>
              <Button disabled={applyMutation.isPending || unresolvedTickers > 0} onClick={runApply}>
                {applyMutation.isPending ? ti("applying") : ti("apply")}
              </Button>
            </div>
          </div>
        )}

        {step === "result" && applyResult && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <p className="font-medium">{ti("resultTitle")}</p>
            </div>
            <ul className="space-y-1 text-sm">
              <li>{ti("resultCreated", { n: applyResult.created })}</li>
              <li>{ti("resultLinked", { n: applyResult.linked })}</li>
              <li>{ti("resultSkipped", { n: applyResult.skipped })}</li>
            </ul>
            {applyResult.errors.length > 0 && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm">
                <p className="font-medium">{ti("resultErrors")}</p>
                <ul className="mt-1 list-disc pl-4">
                  {applyResult.errors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleClose(false)}>{ti("close")}</Button>
              <Link href="/investments" className={cn(buttonVariants())}>{ti("toPortfolio")}</Link>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function SummaryCards({
  summary,
  ti,
}: {
  summary: TrImportPreviewResponse["summary"]
  ti: (key: string, params?: Record<string, string | number>) => string
}) {
  const items = [
    { key: "summaryNew", value: summary.importNew, variant: "default" as const },
    { key: "summarySkipHard", value: summary.skipHard, variant: "secondary" as const },
    { key: "summarySkipSoft", value: summary.skipSoft, variant: "secondary" as const },
    { key: "summaryConflict", value: summary.conflict, variant: "destructive" as const },
    { key: "summaryNeedsTicker", value: summary.needsTicker, variant: "outline" as const },
    { key: "summaryIgnored", value: summary.ignored, variant: "outline" as const },
  ]
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {items.map((item) => (
        <div key={item.key} className="rounded-md border p-2 text-center">
          <p className="text-lg font-semibold">{item.value}</p>
          <p className="text-xs text-muted-foreground">{ti(item.key)}</p>
        </div>
      ))}
    </div>
  )
}

function OverviewStep({
  preview,
  filter,
  setFilter,
  filteredRows,
  ti,
  onBack,
  onNext,
}: {
  preview: TrImportPreviewResponse
  filter: string
  setFilter: (f: string) => void
  filteredRows: TrImportPreviewRow[]
  ti: (key: string, params?: Record<string, string | number>) => string
  onBack: () => void
  onNext: () => void
}) {
  const filters = [
    { id: "all", label: ti("filterAll") },
    { id: "import_new", label: ti("summaryNew") },
    { id: "skip_hard", label: ti("summarySkipHard") },
    { id: "skip_soft", label: ti("summarySkipSoft") },
    { id: "conflict", label: ti("summaryConflict") },
    { id: "needs_ticker", label: ti("summaryNeedsTicker") },
  ]

  return (
    <div className="space-y-4">
      <SummaryCards summary={preview.summary} ti={ti} />
      <div className="flex flex-wrap gap-1">
        {filters.map((f) => (
          <Button key={f.id} size="sm" variant={filter === f.id ? "default" : "outline"} onClick={() => setFilter(f.id)}>
            {f.label}
          </Button>
        ))}
      </div>
      <div className="max-h-64 overflow-y-auto rounded-md border">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-muted">
            <tr>
              <th className="p-2 text-left">{ti("stepOverview")}</th>
              <th className="p-2 text-left">{ti("csvSide")}</th>
              <th className="p-2 text-right">{ti("summaryNew")}</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.slice(0, 100).map((row) => (
              <tr key={row.rowId} className="border-t">
                <td className="p-2">{row.date}</td>
                <td className="p-2">{row.product}</td>
                <td className="p-2 text-right">
                  <Badge variant={statusVariant(row.status)} className="text-[10px]">
                    {row.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack}>{ti("back")}</Button>
        <Button onClick={onNext}>{ti("next")}</Button>
      </div>
    </div>
  )
}

function ConflictsStep({
  rows,
  resolutions,
  setResolutions,
  unresolved,
  ti,
  t,
  onBack,
  onNext,
  onSkipAllSoft,
}: {
  rows: TrImportPreviewRow[]
  resolutions: Record<string, TrImportResolution>
  setResolutions: (r: Record<string, TrImportResolution>) => void
  unresolved: number
  ti: (key: string, params?: Record<string, string | number>) => string
  t: (key: string) => string
  onBack: () => void
  onNext: () => void
  onSkipAllSoft: () => void
}) {
  if (rows.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{ti("noConflicts")}</p>
        <Button onClick={onNext}>{ti("next")}</Button>
      </div>
    )
  }

  const resolved = rows.filter((r) => r.status === "skip_soft" || resolutions[r.rowId]).length

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{ti("conflictsTitle")}</p>
        <p className="text-xs text-muted-foreground">{ti("conflictsProgress", { resolved, total: rows.length })}</p>
      </div>
      <Button size="sm" variant="outline" onClick={onSkipAllSoft}>{ti("conflictsBulkSkipSoft")}</Button>
      <div className="max-h-80 space-y-3 overflow-y-auto">
        {rows.map((row) => (
          <ConflictCard
            key={row.rowId}
            row={row}
            resolution={resolutions[row.rowId] ?? (row.status === "skip_soft" ? "skip" : undefined)}
            onChange={(action) => setResolutions({ ...resolutions, [row.rowId]: action })}
            ti={ti}
            t={t}
          />
        ))}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack}>{ti("back")}</Button>
        <Button disabled={unresolved > 0} onClick={onNext}>{ti("next")}</Button>
      </div>
    </div>
  )
}

function ConflictCard({
  row,
  resolution,
  onChange,
  ti,
  t,
}: {
  row: TrImportPreviewRow
  resolution?: TrImportResolution
  onChange: (a: TrImportResolution) => void
  ti: (key: string) => string
  t: (key: string) => string
}) {
  const actions: { id: TrImportResolution; labelKey: "actionSkip" | "actionImport" | "actionLink" | "actionReplace" }[] = [
    { id: "skip", labelKey: "actionSkip" },
    { id: "import", labelKey: "actionImport" },
    { id: "link", labelKey: "actionLink" },
    { id: "replace", labelKey: "actionReplace" },
  ]

  return (
    <div className={cn("rounded-lg border p-3", row.status === "conflict" && "border-amber-500/50")}>
      <div className="mb-2 flex items-center gap-2">
        {row.status === "conflict" && <AlertTriangle className="h-4 w-4 text-amber-500" />}
        <span className="text-sm font-medium">{row.product}</span>
        <Badge variant="outline">{row.date}</Badge>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md bg-muted/50 p-2 text-xs">
          <p className="mb-1 font-medium">{ti("csvSide")}</p>
          <p>{row.isin ?? "—"} · {row.quantity ?? "—"} @ {row.price ?? "—"}</p>
          {row.orderId && <p>{ti("orderId")}: {row.orderId}</p>}
        </div>
        {row.matchedEntry && (
          <div className="rounded-md bg-muted/50 p-2 text-xs">
            <p className="mb-1 font-medium">{ti("dbSide")}</p>
            <p>{row.matchedEntry.assetName} ({row.matchedEntry.ticker})</p>
            <p>{row.matchedEntry.quantity ?? "—"} @ {row.matchedEntry.price ?? row.matchedEntry.amountEur ?? "—"}</p>
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-1">
        {actions.map(({ id, labelKey }) => (
          <Button
            key={id}
            size="sm"
            variant={resolution === id ? "default" : "outline"}
            onClick={() => onChange(id)}
          >
            {ti(labelKey)}
          </Button>
        ))}
      </div>
      {resolution === "replace" && (
        <p className="mt-2 text-xs text-destructive">{ti("replaceWarning")}</p>
      )}
    </div>
  )
}

function TickersStep({
  mappings,
  tickerOverrides,
  setTickerOverrides,
  unresolved,
  ti,
  onBack,
  onNext,
}: {
  mappings: TrTickerMapping[]
  tickerOverrides: Record<string, TrTickerOverride>
  setTickerOverrides: (v: Record<string, TrTickerOverride>) => void
  unresolved: number
  ti: (key: string, params?: Record<string, string | number>) => string
  onBack: () => void
  onNext: () => void
}) {
  if (mappings.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{ti("noTickersNeeded")}</p>
        <Button onClick={onNext}>{ti("next")}</Button>
      </div>
    )
  }

  const acceptAll = () => {
    setTickerOverrides(initialTickerOverrides(mappings))
  }

  const sourceLabel = (source: TrTickerMapping["source"]) => {
    if (source === "portfolio") return ti("tickerSourcePortfolio")
    if (source === "yahoo") return ti("tickerSourceYahoo")
    return ti("tickerSourceManual")
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="font-medium">{ti("tickersTitle")}</p>
        <p className="text-sm text-muted-foreground">{ti("tickersSubtitle")}</p>
        {unresolved > 0 && (
          <p className="text-sm text-amber-600">{ti("tickersUnresolved", { n: unresolved })}</p>
        )}
      </div>
      <Button size="sm" variant="outline" onClick={acceptAll}>{ti("tickersBulk")}</Button>
      <div className="max-h-80 space-y-4 overflow-y-auto">
        {mappings.map((mapping) => {
          const override = tickerOverrides[mapping.isin]
          return (
            <div
              key={mapping.isin}
              className={cn(
                "rounded-lg border p-3 space-y-2",
                mapping.requiresManual && !override?.symbol && "border-amber-500/50"
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium">{mapping.productName}</p>
                <Badge variant="outline">{mapping.isin}</Badge>
                <Badge variant={mapping.requiresManual ? "destructive" : "secondary"}>
                  {sourceLabel(mapping.source)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {mapping.transactionCount}×
                </span>
              </div>

              {mapping.hasTickerConflict && (
                <p className="text-xs text-amber-600">{ti("tickerConflictHint")}</p>
              )}

              {override?.symbol ? (
                <Badge variant="default">{override.symbol} — {override.name}</Badge>
              ) : (
                <p className="text-xs text-muted-foreground">{ti("tickerManualRequired")}</p>
              )}

              <div className="flex flex-wrap gap-1">
                {mapping.portfolioTicker && (
                  <Button
                    size="sm"
                    variant={override?.symbol === mapping.portfolioTicker.symbol ? "default" : "outline"}
                    onClick={() =>
                      setTickerOverrides({ ...tickerOverrides, [mapping.isin]: mapping.portfolioTicker! })
                    }
                  >
                    {ti("tickerUsePortfolio")}: {mapping.portfolioTicker.symbol}
                  </Button>
                )}
                {mapping.yahooTicker && mapping.yahooTicker.symbol !== mapping.portfolioTicker?.symbol && (
                  <Button
                    size="sm"
                    variant={override?.symbol === mapping.yahooTicker.symbol ? "default" : "outline"}
                    onClick={() =>
                      setTickerOverrides({ ...tickerOverrides, [mapping.isin]: mapping.yahooTicker! })
                    }
                  >
                    {ti("tickerUseYahoo")}: {mapping.yahooTicker.symbol}
                  </Button>
                )}
              </div>

              <SecuritySearch
                selectedSymbol={override?.symbol}
                onSelect={(s) =>
                  setTickerOverrides({
                    ...tickerOverrides,
                    [mapping.isin]: {
                      symbol: s.symbol,
                      name: s.name,
                      type: s.assetType,
                      currency: s.currency,
                    },
                  })
                }
              />
            </div>
          )
        })}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack}>{ti("back")}</Button>
        <Button disabled={unresolved > 0} onClick={onNext}>{ti("next")}</Button>
      </div>
    </div>
  )
}

function statusVariant(status: TrImportPreviewRow["status"]) {
  if (status === "conflict") return "destructive" as const
  if (status === "import_new") return "default" as const
  return "secondary" as const
}
