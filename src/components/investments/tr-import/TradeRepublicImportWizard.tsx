"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Upload, AlertTriangle, CheckCircle2, FileSpreadsheet, ChevronDown, Trash2 } from "lucide-react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { SecuritySearch } from "@/components/investments/SecuritySearch"
import { TrImportProgressPanel, type ImportProgressState } from "@/components/investments/tr-import/TrImportProgressPanel"
import { useHousehold } from "@/hooks/useHousehold"
import { useAssets } from "@/hooks/useAssets"
import { useDeleteInvestmentAccount } from "@/hooks/useInvestmentAccount"
import {
  useTradeRepublicApply,
  useTradeRepublicPreview,
  type TrImportApplyResponse,
  type TrImportPreviewResponse,
} from "@/hooks/useTradeRepublicImport"
import { useI18n } from "@/i18n/context"
import type { TrImportPhase } from "@/lib/services/tr-import-progress"
import {
  partitionConflictRows,
  partitionTickerMappings,
  rowNeedsAttention,
  sortOverviewRows,
} from "@/lib/services/tr-import-sort"
import type { TrImportPreviewRow, TrImportResolution, TrImportRowStatus, TrTickerOverride } from "@/lib/services/tr-import-types"
import { countUnresolvedTickers, initialTickerOverrides, isProductOnlyKey, tickerOverrideKey, type TrTickerMapping } from "@/lib/services/tr-import-ticker-mapping"
import { cn } from "@/lib/utils"

type WizardStep = "intro" | "upload" | "analyze" | "overview" | "conflicts" | "tickers" | "confirm" | "applying" | "result"

interface TradeRepublicImportWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenMerge?: (trAccount: string) => void
}

export function TradeRepublicImportWizard({ open, onOpenChange, onOpenMerge }: TradeRepublicImportWizardProps) {
  const { t, translateApiError, locale } = useI18n()
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
  const [importProgress, setImportProgress] = useState<ImportProgressState | null>(null)
  const [checkDuplicatesAfter, setCheckDuplicatesAfter] = useState(true)
  const [clearBeforeImport, setClearBeforeImport] = useState(false)
  const [clearAccountOpen, setClearAccountOpen] = useState(false)

  const dialogContentRef = useRef<HTMLDivElement>(null)
  const stepListRef = useRef<HTMLDivElement>(null)

  const previewMutation = useTradeRepublicPreview((event) => {
    setImportProgress({ phase: event.phase, current: event.current, total: event.total })
  })
  const applyMutation = useTradeRepublicApply((event) => {
    setImportProgress({ phase: event.phase, current: event.current, total: event.total })
  })
  const { data: session } = useSession()
  const { data: household } = useHousehold()
  const { data: portfolioAssets } = useAssets()
  const deleteAccount = useDeleteInvestmentAccount()

  const isAdmin = household?.myRole === "OWNER" || household?.myRole === "ADMIN"
  const accountName = account.trim() || ti("accountDefault")
  const effectiveTargetUserId = targetUserId || session?.user?.id || ""
  const existingAccountAssets = useMemo(
    () =>
      (portfolioAssets ?? []).filter(
        (asset) => asset.account === accountName && asset.userId === effectiveTargetUserId
      ),
    [portfolioAssets, accountName, effectiveTargetUserId]
  )

  const conflictRows = useMemo(
    () => preview?.rows.filter((r) => r.status === "conflict" || r.status === "skip_soft") ?? [],
    [preview]
  )
  const tickerMappings = preview?.tickerMappings ?? []
  const unresolvedTickers = countUnresolvedTickers(tickerMappings, tickerOverrides)

  const filteredRows = useMemo(() => {
    if (!preview) return []
    const rows = filter === "all" ? preview.rows : preview.rows.filter((r) => r.status === filter)
    return sortOverviewRows(rows)
  }, [preview, filter])

  const conflictPartition = useMemo(
    () => partitionConflictRows(conflictRows, resolutions),
    [conflictRows, resolutions]
  )

  const tickerPartition = useMemo(
    () => partitionTickerMappings(tickerMappings, tickerOverrides),
    [tickerMappings, tickerOverrides]
  )

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
    setImportProgress(null)
    setCheckDuplicatesAfter((portfolioAssets?.length ?? 0) >= 2)
    setClearBeforeImport(false)
    setClearAccountOpen(false)
    previewMutation.reset()
    applyMutation.reset()
    deleteAccount.reset()
  }, [previewMutation, applyMutation, deleteAccount, portfolioAssets?.length])

  useEffect(() => {
    if (open && (portfolioAssets?.length ?? 0) >= 2) {
      setCheckDuplicatesAfter(true)
    }
  }, [open, portfolioAssets?.length])

  useEffect(() => {
    if (!open) return
    dialogContentRef.current?.scrollTo({ top: 0 })
    stepListRef.current?.scrollTo({ top: 0 })
  }, [step, open])

  const handleClose = (o: boolean) => {
    if (!o) reset()
    onOpenChange(o)
  }

  const clearDepot = async () => {
    try {
      const result = await deleteAccount.mutateAsync({
        account: accountName,
        targetUserId: targetUserId || undefined,
      })
      toast.success(ti("clearAccountDone", { n: result.deletedAssets }))
      setClearAccountOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : ti("clearAccountFailed"))
    }
  }

  const runPreview = async () => {
    if (!file) return
    setImportProgress(null)
    setStep("analyze")
    try {
      if (clearBeforeImport && existingAccountAssets.length > 0) {
        await deleteAccount.mutateAsync({
          account: accountName,
          targetUserId: targetUserId || undefined,
        })
      }
      const result = await previewMutation.mutateAsync({
        file,
        account: accountName,
        targetUserId: targetUserId || undefined,
      })
      setPreview(result)
      setTickerOverrides(initialTickerOverrides(result.tickerMappings))
      setImportProgress(null)
      setStep("overview")
    } catch (err) {
      setImportProgress(null)
      toast.error(err instanceof Error ? err.message : ti("analyzeFailed"))
      setStep("upload")
    }
  }

  const goAfterOverview = () => {
    if (conflictRows.length > 0) setStep("conflicts")
    else if (tickerPartition.needsAttention.length > 0) setStep("tickers")
    else setStep("confirm")
  }

  const goAfterConflicts = () => {
    if (tickerPartition.needsAttention.length > 0) setStep("tickers")
    else setStep("confirm")
  }

  const runApply = async () => {
    if (!preview) return
    setImportProgress(null)
    setStep("applying")
    try {
      const result = await applyMutation.mutateAsync({
        previewId: preview.previewId,
        resolutions,
        tickerOverrides,
      })
      setApplyResult(result)
      setImportProgress(null)
      setStep("result")
      if (result.errors.length > 0) {
        toast.warning(result.errors[0])
      } else {
        toast.success(ti("resultTitle"))
      }
    } catch (err) {
      setImportProgress(null)
      toast.error(err instanceof Error ? err.message : translateApiError({ error: "Import fehlgeschlagen" }))
      setStep("confirm")
    }
  }

  const phaseLabel = (phase: TrImportPhase) => {
    const keys: Record<TrImportPhase, string> = {
      parse: "progressPhaseParse",
      tickers: "progressPhaseTickers",
      database: "progressPhaseDatabase",
      dedup: "progressPhaseDedup",
      import: "progressPhaseImport",
    }
    return ti(keys[phase])
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
      if (action === "skip") {
        skipped++
        continue
      }
      if (row.status === "needs_ticker" && !tickerOverrides[tickerOverrideKey(row)]?.symbol) {
        skipped++
        continue
      }
      if (action === "link") linked++
      else if (row.status === "import_new" || action === "import" || action === "replace") created++
    }
    return { created, linked, skipped }
  }, [preview, resolutions, tickerOverrides])

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
      <DialogContent ref={dialogContentRef} className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{ti("title")}</DialogTitle>
        </DialogHeader>

        {step !== "analyze" && step !== "applying" && step !== "result" && (
          <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
            {stepLabels.map((s) => (
              <Badge key={s.id} variant={step === s.id ? "default" : "outline"} className="font-normal">
                {s.label}
              </Badge>
            ))}
          </div>
        )}

        <AlertDialog open={clearAccountOpen} onOpenChange={setClearAccountOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{ti("clearAccountTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {ti("clearAccountBody", { n: existingAccountAssets.length, account: accountName })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{ti("back")}</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleteAccount.isPending}
                onClick={(e) => {
                  e.preventDefault()
                  void clearDepot()
                }}
              >
                {ti("clearAccountConfirm")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {step === "intro" && (
          <div className="space-y-4">
            <p className="font-medium">{ti("introTitle")}</p>
            <p className="text-sm text-muted-foreground">{ti("introBody")}</p>
            <div className="rounded-md border bg-muted/40 p-3 text-sm">{ti("introSteps")}</div>
            {onOpenMerge && isAdmin && (
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={checkDuplicatesAfter}
                  onChange={(e) => setCheckDuplicatesAfter(e.target.checked)}
                />
                {ti("checkDuplicatesAfter")}
              </label>
            )}
            <Button className="w-full sm:w-auto" onClick={() => setStep("upload")}>{ti("next")}</Button>
          </div>
        )}

        {step === "upload" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tr-account">{ti("accountLabel")}</Label>
              <Input id="tr-account" value={account} onChange={(e) => setAccount(e.target.value)} />
              {existingAccountAssets.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">
                    {ti("existingAccountHint", { n: existingAccountAssets.length, account: accountName })}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 shrink-0"
                    disabled={deleteAccount.isPending}
                    onClick={() => setClearAccountOpen(true)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    {ti("clearAccount")}
                  </Button>
                </div>
              )}
            </div>
            {existingAccountAssets.length > 0 && (
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={clearBeforeImport}
                  onChange={(e) => setClearBeforeImport(e.target.checked)}
                />
                {ti("clearBeforeImport")}
              </label>
            )}
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
            {onOpenMerge && isAdmin && (
              <button
                type="button"
                className="text-sm text-muted-foreground underline-offset-2 hover:underline"
                onClick={() => {
                  handleClose(false)
                  onOpenMerge(account.trim() || "Trade Republic")
                }}
              >
                {ti("cleanupDuplicates")}
              </button>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("intro")}>{ti("back")}</Button>
              <Button disabled={!file} onClick={runPreview}>{ti("analyze")}</Button>
            </div>
          </div>
        )}

        {step === "analyze" && (
          <TrImportProgressPanel
            progress={importProgress ?? { phase: "parse", current: 0, total: 1 }}
            phaseLabel={phaseLabel}
            countLabel={(current, total) => ti("progressCount", { current, total })}
            etaCalculatingLabel={ti("progressEtaCalculating")}
            etaLabel={(time) => ti("progressEta", { time })}
            locale={locale}
          />
        )}

        {step === "applying" && (
          <TrImportProgressPanel
            progress={importProgress ?? { phase: "import", current: 0, total: 1 }}
            phaseLabel={phaseLabel}
            countLabel={(current, total) => ti("progressCount", { current, total })}
            etaCalculatingLabel={ti("progressEtaCalculating")}
            etaLabel={(time) => ti("progressEta", { time })}
            locale={locale}
          />
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
            needsAttention={conflictPartition.needsAttention}
            resolved={conflictPartition.resolved}
            listRef={stepListRef}
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
            needsAttention={tickerPartition.needsAttention}
            resolved={tickerPartition.resolved}
            listRef={stepListRef}
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
              <Button variant="outline" onClick={() => setStep(tickerPartition.needsAttention.length > 0 ? "tickers" : conflictRows.length > 0 ? "conflicts" : "overview")}>
                {ti("back")}
              </Button>
              <Button disabled={unresolvedTickers > 0} onClick={runApply}>
                {ti("apply")}
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
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => handleClose(false)}>{ti("close")}</Button>
              {onOpenMerge && isAdmin && checkDuplicatesAfter && (
                <Button
                  onClick={() => {
                    handleClose(false)
                    onOpenMerge(account.trim() || preview?.account || "Trade Republic")
                  }}
                >
                  {ti("mergeAfterImport")}
                </Button>
              )}
              <Link href="/investments" className={cn(buttonVariants({ variant: onOpenMerge && isAdmin && checkDuplicatesAfter ? "outline" : "default" }))}>
                {ti("toPortfolio")}
              </Link>
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
              <tr
                key={row.rowId}
                className={cn(
                  "border-t",
                  rowNeedsAttention(row.status) && "bg-destructive/5 hover:bg-destructive/10"
                )}
              >
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
  needsAttention,
  resolved,
  listRef,
  resolutions,
  setResolutions,
  unresolved,
  ti,
  t,
  onBack,
  onNext,
  onSkipAllSoft,
}: {
  needsAttention: TrImportPreviewRow[]
  resolved: TrImportPreviewRow[]
  listRef: React.RefObject<HTMLDivElement | null>
  resolutions: Record<string, TrImportResolution>
  setResolutions: (r: Record<string, TrImportResolution>) => void
  unresolved: number
  ti: (key: string, params?: Record<string, string | number>) => string
  t: (key: string) => string
  onBack: () => void
  onNext: () => void
  onSkipAllSoft: () => void
}) {
  const allRows = [...needsAttention, ...resolved]
  if (allRows.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{ti("noConflicts")}</p>
        <Button onClick={onNext}>{ti("next")}</Button>
      </div>
    )
  }

  const resolvedCount = allRows.filter((r) => r.status === "skip_soft" || resolutions[r.rowId]).length

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{ti("conflictsTitle")}</p>
        <p className="text-xs text-muted-foreground">{ti("conflictsProgress", { resolved: resolvedCount, total: allRows.length })}</p>
      </div>
      <Button size="sm" variant="outline" onClick={onSkipAllSoft}>{ti("conflictsBulkSkipSoft")}</Button>

      {needsAttention.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-destructive">{ti("sectionNeedsReview")}</p>
          <div ref={listRef} className="max-h-80 space-y-3 overflow-y-auto">
            {needsAttention.map((row) => (
              <ConflictCard
                key={row.rowId}
                row={row}
                resolution={resolutions[row.rowId]}
                onChange={(action) => setResolutions({ ...resolutions, [row.rowId]: action })}
                ti={ti}
                t={t}
              />
            ))}
          </div>
        </div>
      )}

      {resolved.length > 0 && (
        <Collapsible defaultOpen={needsAttention.length === 0}>
          <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-xs font-medium text-muted-foreground hover:bg-muted/50">
            <ChevronDown className="h-4 w-4 shrink-0" />
            {ti("sectionResolved", { n: resolved.length })}
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 max-h-48 space-y-3 overflow-y-auto">
            {resolved.map((row) => (
              <ConflictCard
                key={row.rowId}
                row={row}
                resolution={resolutions[row.rowId] ?? (row.status === "skip_soft" ? "skip" : undefined)}
                onChange={(action) => setResolutions({ ...resolutions, [row.rowId]: action })}
                ti={ti}
                t={t}
              />
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

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

  const needsAttention = row.status === "conflict" && !resolution

  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        needsAttention && "border-destructive/40 bg-destructive/5",
        row.status === "conflict" && resolution && "border-amber-500/50",
        row.status === "skip_soft" && "opacity-90"
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        {needsAttention && <AlertTriangle className="h-4 w-4 text-destructive" />}
        {row.status === "conflict" && resolution && <AlertTriangle className="h-4 w-4 text-amber-500" />}
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
  needsAttention,
  resolved,
  listRef,
  tickerOverrides,
  setTickerOverrides,
  unresolved,
  ti,
  onBack,
  onNext,
}: {
  needsAttention: TrTickerMapping[]
  resolved: TrTickerMapping[]
  listRef: React.RefObject<HTMLDivElement | null>
  tickerOverrides: Record<string, TrTickerOverride>
  setTickerOverrides: (v: Record<string, TrTickerOverride>) => void
  unresolved: number
  ti: (key: string, params?: Record<string, string | number>) => string
  onBack: () => void
  onNext: () => void
}) {
  const allMappings = [...needsAttention, ...resolved]
  if (allMappings.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{ti("noTickersNeeded")}</p>
        <Button onClick={onNext}>{ti("next")}</Button>
      </div>
    )
  }

  const acceptAll = () => {
    setTickerOverrides(initialTickerOverrides(allMappings))
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
      {needsAttention.length > 0 && (
        <Button size="sm" variant="outline" onClick={acceptAll}>{ti("tickersBulk")}</Button>
      )}

      {needsAttention.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-destructive">{ti("sectionNeedsReview")}</p>
          <div ref={listRef} className="max-h-80 space-y-4 overflow-y-auto">
            {needsAttention.map((mapping) => (
              <TickerCard
                key={mapping.isin}
                mapping={mapping}
                override={tickerOverrides[mapping.isin]}
                tickerOverrides={tickerOverrides}
                setTickerOverrides={setTickerOverrides}
                ti={ti}
                needsAttention
              />
            ))}
          </div>
        </div>
      )}

      {resolved.length > 0 && (
        <Collapsible defaultOpen={needsAttention.length === 0}>
          <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-xs font-medium text-muted-foreground hover:bg-muted/50">
            <ChevronDown className="h-4 w-4 shrink-0" />
            {ti("sectionAutoMapped", { n: resolved.length })}
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 max-h-48 space-y-4 overflow-y-auto">
            {resolved.map((mapping) => (
              <TickerCard
                key={mapping.isin}
                mapping={mapping}
                override={tickerOverrides[mapping.isin]}
                tickerOverrides={tickerOverrides}
                setTickerOverrides={setTickerOverrides}
                ti={ti}
                needsAttention={false}
              />
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack}>{ti("back")}</Button>
        <Button disabled={unresolved > 0} onClick={onNext}>{ti("next")}</Button>
      </div>
    </div>
  )
}

function TickerCard({
  mapping,
  override,
  tickerOverrides,
  setTickerOverrides,
  ti,
  needsAttention,
}: {
  mapping: TrTickerMapping
  override: TrTickerOverride | undefined
  tickerOverrides: Record<string, TrTickerOverride>
  setTickerOverrides: (v: Record<string, TrTickerOverride>) => void
  ti: (key: string, params?: Record<string, string | number>) => string
  needsAttention: boolean
}) {
  const sourceLabel = (source: TrTickerMapping["source"]) => {
    if (source === "portfolio") return ti("tickerSourcePortfolio")
    if (source === "yahoo") return ti("tickerSourceYahoo")
    return ti("tickerSourceManual")
  }

  return (
    <div
      className={cn(
        "rounded-lg border p-3 space-y-2",
        needsAttention && "border-destructive/40 bg-destructive/5",
        !needsAttention && override?.symbol && "opacity-90"
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium">{mapping.productName}</p>
        {!isProductOnlyKey(mapping.isin) && (
          <Badge variant="outline">{mapping.isin}</Badge>
        )}
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
}

function statusVariant(status: TrImportRowStatus) {
  if (status === "conflict" || status === "needs_ticker") return "destructive" as const
  if (status === "import_new") return "default" as const
  return "secondary" as const
}
