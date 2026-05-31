"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { GitMerge, AlertTriangle, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress, ProgressLabel } from "@/components/ui/progress"
import { useHousehold } from "@/hooks/useHousehold"
import { useMergeAssets, useMergeSuggestions, type MergeSuggestionGroup } from "@/hooks/useAssetMerge"
import { useAssets } from "@/hooks/useAssets"
import { useI18n } from "@/i18n/context"
import { cn } from "@/lib/utils"

type WizardStep = "intro" | "scan" | "suggestions" | "manual" | "result"

interface PositionMergeWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PositionMergeWizard({ open, onOpenChange }: PositionMergeWizardProps) {
  const { t, formatMoney, translateApiError } = useI18n()
  const m = (key: string, params?: Record<string, string | number>) => {
    let s = t(`investments.merge.${key}` as "investments.merge.title")
    if (params) {
      for (const [k, v] of Object.entries(params)) s = s.replace(`{${k}}`, String(v))
    }
    return s
  }

  const [step, setStep] = useState<WizardStep>("intro")
  const [scanEnabled, setScanEnabled] = useState(false)
  const [groups, setGroups] = useState<MergeSuggestionGroup[]>([])
  const [targetByGroup, setTargetByGroup] = useState<Record<string, string>>({})
  const [mergedCount, setMergedCount] = useState(0)
  const [skippedCount, setSkippedCount] = useState(0)
  const [resultErrors, setResultErrors] = useState<string[]>([])
  const [manualTargetId, setManualTargetId] = useState("")
  const [manualSourceIds, setManualSourceIds] = useState<Set<string>>(new Set())
  const [applying, setApplying] = useState(false)

  const { data: household } = useHousehold()
  const isAdmin = household?.myRole === "OWNER" || household?.myRole === "ADMIN"
  const { data: assets } = useAssets()
  const suggestionsQuery = useMergeSuggestions(scanEnabled)
  const mergeMutation = useMergeAssets()

  const reset = useCallback(() => {
    setStep("intro")
    setScanEnabled(false)
    setGroups([])
    setTargetByGroup({})
    setMergedCount(0)
    setSkippedCount(0)
    setResultErrors([])
    setManualTargetId("")
    setManualSourceIds(new Set())
    setApplying(false)
  }, [])

  useEffect(() => {
    if (!open) reset()
  }, [open, reset])

  useEffect(() => {
    if (suggestionsQuery.isSuccess && suggestionsQuery.data) {
      const loaded = suggestionsQuery.data.groups
      setGroups(loaded)
      const defaults: Record<string, string> = {}
      for (const g of loaded) defaults[g.id] = g.suggestedTargetId
      setTargetByGroup(defaults)
      setStep(loaded.length > 0 ? "suggestions" : "manual")
    }
    if (suggestionsQuery.isError) {
      toast.error(translateApiError(suggestionsQuery.error))
      setStep("intro")
      setScanEnabled(false)
    }
  }, [suggestionsQuery.isSuccess, suggestionsQuery.isError, suggestionsQuery.data, suggestionsQuery.error, translateApiError])

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) reset()
    onOpenChange(nextOpen)
  }

  function startScan() {
    setStep("scan")
    setScanEnabled(true)
    void suggestionsQuery.refetch()
  }

  async function mergeGroup(group: MergeSuggestionGroup) {
    const targetId = targetByGroup[group.id] ?? group.suggestedTargetId
    const sourceIds = group.assets.filter((a) => a.id !== targetId).map((a) => a.id)
    if (sourceIds.length === 0) return

    setApplying(true)
    try {
      await mergeMutation.mutateAsync({ targetAssetId: targetId, sourceAssetIds: sourceIds })
      setMergedCount((c) => c + 1)
      setGroups((prev) => prev.filter((g) => g.id !== group.id))
      toast.success(m("groupMerged"))
    } catch (err) {
      toast.error(translateApiError(err))
      setResultErrors((e) => [...e, translateApiError(err)])
    } finally {
      setApplying(false)
    }
  }

  function skipGroup(groupId: string) {
    setSkippedCount((c) => c + 1)
    setGroups((prev) => prev.filter((g) => g.id !== groupId))
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

    setApplying(true)
    try {
      await mergeMutation.mutateAsync({ targetAssetId: manualTargetId, sourceAssetIds: sources })
      setMergedCount((c) => c + 1)
      setManualSourceIds(new Set())
      toast.success(m("groupMerged"))
      setStep("result")
    } catch (err) {
      toast.error(translateApiError(err))
      setResultErrors((e) => [...e, translateApiError(err)])
    } finally {
      setApplying(false)
    }
  }

  useEffect(() => {
    if (step === "suggestions" && groups.length === 0 && mergedCount + skippedCount > 0) {
      setStep("result")
    }
  }, [step, groups.length, mergedCount, skippedCount])

  const manualAssets = useMemo(
    () => (assets ?? []).filter((a) => a.ticker !== "Interest"),
    [assets]
  )

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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="h-5 w-5" />
            {m("title")}
          </DialogTitle>
        </DialogHeader>

        {step === "intro" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{m("introBody")}</p>
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
            <Progress value={suggestionsQuery.isFetching ? 40 : 90}>
              <ProgressLabel>{m("scanning")}</ProgressLabel>
            </Progress>
            <p className="text-center text-sm text-muted-foreground">{m("scanningHint")}</p>
          </div>
        )}

        {step === "suggestions" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{m("suggestionsHint", { n: groups.length })}</p>
            {groups.map((group) => (
              <div key={group.id} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={confidenceVariant(group.confidence)}>{confidenceLabel(group.confidence)}</Badge>
                  <span className="text-sm text-muted-foreground">{reasonLabel(group.reasonKey)}</span>
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
                        <p className="font-medium truncate">{asset.name}</p>
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
                  <Button size="sm" onClick={() => mergeGroup(group)} disabled={applying || mergeMutation.isPending}>
                    {m("mergeGroup")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => skipGroup(group.id)} disabled={applying}>
                    {m("skipGroup")}
                  </Button>
                </div>
              </div>
            ))}
            <div className="flex gap-2 justify-between pt-2">
              <Button variant="outline" onClick={() => setStep("manual")}>{m("manualMode")}</Button>
              <Button onClick={() => setStep("result")} disabled={groups.length > 0}>{m("done")}</Button>
            </div>
          </div>
        )}

        {step === "manual" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{m("manualHint")}</p>
            <div className="space-y-2">
              <Label>{m("manualTarget")}</Label>
              <Select value={manualTargetId} onValueChange={(v) => setManualTargetId(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder={m("manualTargetPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {manualAssets.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.ticker} — {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{m("manualSources")}</Label>
              <div className="max-h-48 overflow-y-auto rounded-md border divide-y">
                {manualAssets
                  .filter((a) => a.id !== manualTargetId)
                  .map((a) => (
                    <label key={a.id} className="flex items-center gap-2 p-2 hover:bg-muted/50 cursor-pointer">
                      <input
                        type="checkbox"
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
                      <span className="text-sm truncate">{a.ticker} — {a.name}</span>
                    </label>
                  ))}
              </div>
            </div>
            <div className="flex gap-2 justify-between">
              <Button variant="outline" onClick={() => setStep(mergedCount > 0 || skippedCount > 0 ? "suggestions" : "intro")}>
                {m("back")}
              </Button>
              <Button onClick={mergeManual} disabled={applying || mergeMutation.isPending || !isAdmin}>
                {m("mergeGroup")}
              </Button>
            </div>
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
      </DialogContent>
    </Dialog>
  )
}
