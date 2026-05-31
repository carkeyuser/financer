"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { GitMerge, AlertTriangle, CheckCircle2, Search } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Progress, ProgressLabel } from "@/components/ui/progress"
import { useHousehold } from "@/hooks/useHousehold"
import {
  fetchMergeSuggestionsStream,
  useMergeAssets,
  useMergeAssetsBatch,
  type MergeSuggestionGroup,
} from "@/hooks/useAssetMerge"
import { useAssets, type Asset } from "@/hooks/useAssets"
import { useI18n } from "@/i18n/context"
import { isInterestAsset } from "@/lib/constants/interest-asset"
import { isEmptyPosition } from "@/lib/services/asset-merge-suggestions"
import { getCurrentValue } from "@/lib/utils/calculations"
import type { MergeScanPhase, MergeScanProgressEvent } from "@/lib/validations/asset-merge"
import { cn } from "@/lib/utils"

type WizardStep = "intro" | "scan" | "suggestions" | "review" | "manual" | "applying" | "result"

interface PositionMergeWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  source?: "tr-import"
  trAccount?: string
}

const SCAN_PHASE_WEIGHT: Record<MergeScanPhase, number> = {
  load_assets: 0.2,
  load_rates: 0.4,
  analyze: 0.4,
}

function assetMatchesSearch(asset: Asset, query: string): boolean {
  if (!query.trim()) return true
  const q = query.toLowerCase()
  return (
    asset.ticker.toLowerCase().includes(q) ||
    asset.name.toLowerCase().includes(q) ||
    (asset.isin?.toLowerCase().includes(q) ?? false) ||
    asset.account.toLowerCase().includes(q)
  )
}

function assetValueEur(asset: Asset): number {
  return getCurrentValue(asset, asset.entries) * (asset.eurRate ?? 1)
}

function formatAssetSummary(
  asset: Asset,
  formatMoney: (amount: number, currency?: string) => string
): string {
  return `${asset.ticker} — ${asset.name} · ${formatMoney(assetValueEur(asset))}`
}

interface MergeAssetPickerProps {
  assets: Asset[]
  value: string
  onValueChange: (id: string) => void
  placeholder: string
  searchPlaceholder: string
  noMatchLabel: string
  formatMoney: (amount: number, currency?: string) => string
}

function MergeAssetPicker({
  assets,
  value,
  onValueChange,
  placeholder,
  searchPlaceholder,
  noMatchLabel,
  formatMoney,
}: MergeAssetPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const selected = assets.find((a) => a.id === value)
  const filtered = useMemo(
    () => assets.filter((a) => assetMatchesSearch(a, search)),
    [assets, search]
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="flex items-center gap-2 w-full px-3 py-2 border rounded-md text-sm text-left bg-background hover:bg-accent transition-colors"
      >
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className={cn("min-w-0 flex-1 break-words", selected ? "text-foreground" : "text-muted-foreground")}>
          {selected ? formatAssetSummary(selected, formatMoney) : placeholder}
        </span>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {filtered.length === 0 && <CommandEmpty>{noMatchLabel}</CommandEmpty>}
            {filtered.length > 0 && (
              <CommandGroup>
                {filtered.map((asset) => (
                  <CommandItem
                    key={asset.id}
                    value={asset.id}
                    onSelect={() => {
                      onValueChange(asset.id)
                      setOpen(false)
                      setSearch("")
                    }}
                    className="flex flex-col items-start gap-0.5"
                  >
                    <span className="font-medium text-sm break-words">{asset.name}</span>
                    <span className="text-xs text-muted-foreground break-words">
                      {asset.ticker}
                      {asset.isin ? ` · ${asset.isin}` : ""}
                      {` · ${asset.account}`}
                      {` · ${formatMoney(assetValueEur(asset))}`}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function scanProgressPercent(phase: MergeScanPhase, current: number, total: number): number {
  let base = 0
  for (const [p, weight] of Object.entries(SCAN_PHASE_WEIGHT) as Array<[MergeScanPhase, number]>) {
    if (p === phase) {
      const fraction = total > 0 ? current / total : 1
      return Math.min(100, Math.round((base + weight * fraction) * 100))
    }
    base += weight
  }
  return 100
}

export function PositionMergeWizard({ open, onOpenChange, source, trAccount }: PositionMergeWizardProps) {
  const { t, formatMoney, translateApiError } = useI18n()
  const m = (key: string, params?: Record<string, string | number>) => {
    let s = t(`investments.merge.${key}` as "investments.merge.title")
    if (params) {
      for (const [k, v] of Object.entries(params)) s = s.replace(`{${k}}`, String(v))
    }
    return s
  }

  const [step, setStep] = useState<WizardStep>("intro")
  const [groups, setGroups] = useState<MergeSuggestionGroup[]>([])
  const [targetByGroup, setTargetByGroup] = useState<Record<string, string>>({})
  const [mergedCount, setMergedCount] = useState(0)
  const [skippedCount, setSkippedCount] = useState(0)
  const [resultErrors, setResultErrors] = useState<string[]>([])
  const [manualTargetId, setManualTargetId] = useState("")
  const [manualSourceIds, setManualSourceIds] = useState<Set<string>>(new Set())
  const [hideZeroInManual, setHideZeroInManual] = useState(true)
  const [manualSourceSearch, setManualSourceSearch] = useState("")
  const [scanProgress, setScanProgress] = useState<{ phase: MergeScanPhase; current: number; total: number }>({
    phase: "load_assets",
    current: 0,
    total: 1,
  })
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 })

  const { data: household } = useHousehold()
  const isAdmin = household?.myRole === "OWNER" || household?.myRole === "ADMIN"
  const { data: assets } = useAssets()
  const mergeMutation = useMergeAssets()
  const batchMutation = useMergeAssetsBatch()

  const reset = useCallback(() => {
    setStep("intro")
    setGroups([])
    setTargetByGroup({})
    setMergedCount(0)
    setSkippedCount(0)
    setResultErrors([])
    setManualTargetId("")
    setManualSourceIds(new Set())
    setHideZeroInManual(true)
    setManualSourceSearch("")
    setScanProgress({ phase: "load_assets", current: 0, total: 1 })
    setBatchProgress({ current: 0, total: 0 })
  }, [])

  useEffect(() => {
    if (!open) reset()
  }, [open, reset])

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) reset()
    onOpenChange(nextOpen)
  }

  async function startScan() {
    setStep("scan")
    setScanProgress({ phase: "load_assets", current: 0, total: 1 })
    try {
      const result = await fetchMergeSuggestionsStream(
        (event) => setScanProgress({ phase: event.phase, current: event.current, total: event.total }),
        { trAccount }
      )
      setGroups(result.groups)
      setTargetByGroup((prev) => {
        const next = { ...prev }
        for (const g of result.groups) {
          if (!(g.id in next)) next[g.id] = g.suggestedTargetId
        }
        return next
      })
      setStep(result.groups.length > 0 ? "suggestions" : "manual")
    } catch (err) {
      toast.error(translateApiError(err))
      setStep("intro")
    }
  }

  async function mergeGroup(group: MergeSuggestionGroup) {
    const targetId = targetByGroup[group.id] ?? group.suggestedTargetId
    const sourceIds = group.assets.filter((a) => a.id !== targetId).map((a) => a.id)
    if (sourceIds.length === 0) return

    try {
      await mergeMutation.mutateAsync({ targetAssetId: targetId, sourceAssetIds: sourceIds })
      setMergedCount((c) => c + 1)
      setGroups((prev) => prev.filter((g) => g.id !== group.id))
      toast.success(m("groupMerged"))
    } catch (err) {
      toast.error(translateApiError(err))
      setResultErrors((e) => [...e, translateApiError(err)])
    }
  }

  function skipGroup(groupId: string) {
    setSkippedCount((c) => c + 1)
    setGroups((prev) => prev.filter((g) => g.id !== groupId))
  }

  async function mergeAllHighConfidence() {
    const highGroups = groups.filter((g) => g.confidence === "high")
    if (highGroups.length === 0) return

    const merges = highGroups.map((g) => {
      const targetId = targetByGroup[g.id] ?? g.suggestedTargetId
      return {
        targetAssetId: targetId,
        sourceAssetIds: g.assets.filter((a) => a.id !== targetId).map((a) => a.id),
      }
    }).filter((m) => m.sourceAssetIds.length > 0)

    if (merges.length === 0) return

    setStep("applying")
    setBatchProgress({ current: 0, total: merges.length })

    try {
      const result = await batchMutation.mutateAsync({ merges })
      setMergedCount((c) => c + result.merged)
      setResultErrors((e) => [...e, ...result.errors])
      setGroups((prev) => prev.filter((g) => g.confidence !== "high"))
      setBatchProgress({ current: merges.length, total: merges.length })
      setStep("result")
    } catch (err) {
      toast.error(translateApiError(err))
      setResultErrors((e) => [...e, translateApiError(err)])
      setStep("review")
    }
  }

  async function mergeManual() {
    if (!manualTargetId || manualSourceIds.size === 0) {
      toast.error(m("manualSelectRequired"))
      return
    }
    const sources = [...manualSourceIds].filter((id) => id !== manualTargetId)
    if (sources.length === 0) {
      toast.error(m("manualSelectRequired"))
      return
    }

    try {
      await mergeMutation.mutateAsync({ targetAssetId: manualTargetId, sourceAssetIds: sources })
      setMergedCount((c) => c + 1)
      setManualSourceIds(new Set())
      toast.success(m("groupMerged"))
      setStep("result")
    } catch (err) {
      toast.error(translateApiError(err))
      setResultErrors((e) => [...e, translateApiError(err)])
    }
  }

  useEffect(() => {
    if (step === "review" && groups.length === 0 && mergedCount + skippedCount > 0) {
      setStep("result")
    }
  }, [step, groups.length, mergedCount, skippedCount])

  const manualAssets = useMemo(
    () => (assets ?? []).filter((a) => !isInterestAsset(a)),
    [assets]
  )

  const manualVisibleAssets = useMemo(() => {
    if (!hideZeroInManual) return manualAssets
    return manualAssets.filter((a) => !isEmptyPosition(a, a.entries, a.eurRate ?? 1))
  }, [manualAssets, hideZeroInManual])

  const zeroHiddenInManualCount = useMemo(() => {
    if (!hideZeroInManual) return 0
    return manualAssets.filter((a) => isEmptyPosition(a, a.entries, a.eurRate ?? 1)).length
  }, [manualAssets, hideZeroInManual])

  const manualSourceCandidates = useMemo(
    () =>
      manualVisibleAssets
        .filter((a) => a.id !== manualTargetId)
        .filter((a) => assetMatchesSearch(a, manualSourceSearch)),
    [manualVisibleAssets, manualTargetId, manualSourceSearch]
  )

  useEffect(() => {
    if (step !== "manual") return
    const visibleIds = new Set(manualVisibleAssets.map((a) => a.id))
    if (manualTargetId && !visibleIds.has(manualTargetId)) {
      setManualTargetId("")
    }
    setManualSourceIds((prev) => {
      const next = new Set([...prev].filter((id) => visibleIds.has(id)))
      if (next.size === prev.size && [...next].every((id) => prev.has(id))) return prev
      return next
    })
  }, [step, manualVisibleAssets, manualTargetId])

  const highConfidenceCount = groups.filter((g) => g.confidence === "high").length
  const trRelevantCount = groups.filter((g) => g.trImportRelevant).length

  const reasonLabel = (reasonKey: string) => {
    const key = reasonKey.replace("merge.", "") as "reasonSameIsin"
    return t(`investments.merge.${key}` as "investments.merge.reasonSameIsin")
  }

  const confidenceLabel = (c: MergeSuggestionGroup["confidence"]) => {
    if (c === "high") return m("confidenceHigh")
    if (c === "medium") return m("confidenceMedium")
    return m("confidenceLow")
  }

  const confidenceVariant = (c: MergeSuggestionGroup["confidence"]) => {
    if (c === "high") return "default" as const
    if (c === "medium") return "secondary" as const
    return "outline" as const
  }

  const scanPercent = scanProgressPercent(scanProgress.phase, scanProgress.current, scanProgress.total)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="h-5 w-5" />
            {m("title")}
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
        {step === "intro" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{m("introBody")}</p>
            {source === "tr-import" && trAccount && (
              <div className="rounded-md border bg-muted/40 p-3 text-sm">{m("trImportContext", { account: trAccount })}</div>
            )}
            {!isAdmin && (
              <div className="flex items-start gap-2 rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                <p>{m("adminRequired")}</p>
              </div>
            )}
            <div className="rounded-md border bg-muted/40 p-3 text-sm">{m("backupHint")}</div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => handleClose(false)}>{m("close")}</Button>
              <Button onClick={startScan} disabled={!isAdmin}>{m("startScan")}</Button>
            </div>
          </div>
        )}

        {step === "scan" && (
          <div className="flex flex-col gap-3 py-8">
            <Progress value={scanPercent}>
              <ProgressLabel>{m("scanning")}</ProgressLabel>
            </Progress>
            <p className="text-center text-sm text-muted-foreground">{m("scanningHint")}</p>
          </div>
        )}

        {step === "suggestions" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{m("suggestionsHint", { n: groups.length })}</p>
            <div className="flex flex-wrap gap-2">
              {groups.map((g) => (
                <Badge key={g.id} variant={confidenceVariant(g.confidence)}>
                  {confidenceLabel(g.confidence)} · {g.assets.length}
                </Badge>
              ))}
            </div>
            {trRelevantCount > 0 && (
              <Badge variant="outline">{m("trImportHint", { n: trRelevantCount })}</Badge>
            )}
            <div className="flex flex-wrap gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setStep("manual")}>{m("manualMode")}</Button>
              {highConfidenceCount > 0 && (
                <Button variant="secondary" onClick={mergeAllHighConfidence} disabled={!isAdmin || batchMutation.isPending}>
                  {m("mergeAllHigh", { n: highConfidenceCount })}
                </Button>
              )}
              <Button onClick={() => setStep("review")}>{m("goToReview")}</Button>
            </div>
          </div>
        )}

        {step === "review" && (
          <div className="space-y-4">
            {groups.map((group) => (
              <div key={group.id} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={confidenceVariant(group.confidence)}>{confidenceLabel(group.confidence)}</Badge>
                  <span className="text-sm text-muted-foreground">{reasonLabel(group.reasonKey)}</span>
                  {group.trImportRelevant && (
                    <Badge variant="outline">{m("trImportBadge")}</Badge>
                  )}
                </div>
                <div className="space-y-2">
                  {group.assets.map((asset) => (
                    <label
                      key={asset.id}
                      className={cn(
                        "flex items-center gap-3 rounded-md border p-2 cursor-pointer hover:bg-muted/50",
                        (targetByGroup[group.id] ?? group.suggestedTargetId) === asset.id && "border-primary bg-primary/5"
                      )}
                    >
                      <input
                        type="radio"
                        name={`target-${group.id}`}
                        checked={(targetByGroup[group.id] ?? group.suggestedTargetId) === asset.id}
                        onChange={() => setTargetByGroup((prev) => ({ ...prev, [group.id]: asset.id }))}
                        className="shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium break-words">{asset.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {asset.ticker}
                          {asset.isin ? ` · ${asset.isin}` : ""}
                          {" · "}{asset.entryCount} {m("entries")}
                          {" · "}{formatMoney(asset.valueEur)}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => mergeGroup(group)} disabled={mergeMutation.isPending || !isAdmin}>
                    {m("mergeGroup")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => skipGroup(group.id)}>
                    {m("skipGroup")}
                  </Button>
                </div>
              </div>
            ))}
            <div className="flex gap-2 justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(groups.length > 0 ? "suggestions" : "intro")}>
                {m("back")}
              </Button>
              <Button variant="outline" onClick={() => setStep("manual")}>{m("manualMode")}</Button>
              <Button onClick={() => setStep("result")} disabled={groups.length > 0}>{m("done")}</Button>
            </div>
          </div>
        )}

        {step === "manual" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">{m("manualHint")}</p>
              <div className="flex items-center gap-2">
                {zeroHiddenInManualCount > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {m("hiddenZeroCount", { n: zeroHiddenInManualCount })}
                  </span>
                )}
                <Button
                  size="sm"
                  variant={hideZeroInManual ? "default" : "outline"}
                  onClick={() => setHideZeroInManual((v) => !v)}
                >
                  {m("hideZeroPositions")}
                </Button>
              </div>
            </div>

            {manualVisibleAssets.length === 0 && manualAssets.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
                <p className="text-muted-foreground">{m("allFilteredEmpty")}</p>
                <Button variant="outline" size="sm" onClick={() => setHideZeroInManual(false)}>
                  {m("hideZeroPositions")}
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <Label>{m("manualTarget")}</Label>
              <MergeAssetPicker
                assets={manualVisibleAssets}
                value={manualTargetId}
                onValueChange={setManualTargetId}
                placeholder={m("manualTargetPlaceholder")}
                searchPlaceholder={m("manualSearchPlaceholder")}
                noMatchLabel={m("manualNoMatch")}
                formatMoney={formatMoney}
              />
            </div>
            <div className="space-y-2">
              <Label>{m("manualSources")}</Label>
              <div className="rounded-md border">
                <div className="border-b p-2">
                  <Command shouldFilter={false} className="bg-transparent">
                    <CommandInput
                      placeholder={m("manualSearchPlaceholder")}
                      value={manualSourceSearch}
                      onValueChange={setManualSourceSearch}
                    />
                  </Command>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y">
                  {manualSourceCandidates.length === 0 && (
                    <p className="p-3 text-sm text-muted-foreground">{m("manualNoMatch")}</p>
                  )}
                  {manualSourceCandidates.map((a) => (
                    <label key={a.id} className="flex items-start gap-2 p-2 hover:bg-muted/50 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-1 shrink-0"
                        checked={manualSourceIds.has(a.id)}
                        onChange={(e) => {
                          setManualSourceIds((prev) => {
                            const next = new Set(prev)
                            if (e.target.checked) next.add(a.id)
                            else next.delete(a.id)
                            return next
                          })
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-sm break-words">{formatAssetSummary(a, formatMoney)}</span>
                        <p className="text-xs text-muted-foreground break-words">
                          {a.isin ? `${a.isin} · ` : ""}{a.account}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-between">
              <Button variant="outline" onClick={() => setStep(mergedCount > 0 || skippedCount > 0 || groups.length > 0 ? "review" : "intro")}>
                {m("back")}
              </Button>
              <Button onClick={mergeManual} disabled={mergeMutation.isPending || !isAdmin}>
                {m("mergeGroup")}
              </Button>
            </div>
          </div>
        )}

        {step === "applying" && (
          <div className="flex flex-col gap-3 py-8">
            <Progress value={batchProgress.total > 0 ? (batchProgress.current / batchProgress.total) * 100 : 50}>
              <ProgressLabel>{m("applying")}</ProgressLabel>
            </Progress>
            <p className="text-center text-sm text-muted-foreground">{m("applyingHint")}</p>
          </div>
        )}

        {step === "result" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <p className="font-medium">{m("resultTitle")}</p>
            </div>
            <ul className="space-y-1 text-sm">
              <li>{m("resultMerged", { n: mergedCount })}</li>
              <li>{m("resultSkipped", { n: skippedCount })}</li>
            </ul>
            {resultErrors.length > 0 && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm">
                <ul className="list-disc pl-4">{resultErrors.map((e) => <li key={e}>{e}</li>)}</ul>
              </div>
            )}
            <Button variant="outline" onClick={() => handleClose(false)}>{m("close")}</Button>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
