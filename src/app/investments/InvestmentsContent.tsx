"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import Link from "next/link"
import { ArrowDownUp, Plus, TrendingUp, GripVertical, LayoutGrid, List, TrendingDown, Minus, Landmark, User, Upload, GitMerge } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { AssetCard } from "@/components/investments/AssetCard"
import { AssetLogo } from "@/components/investments/AssetLogo"
import { PortfolioChartPanel } from "@/components/investments/PortfolioChartPanel"
import { useAssets, useReorderAssets, type Asset } from "@/hooks/useAssets"
import {
  getCurrentValue,
  getTotalGainLoss,
  getGainLossPercent,
  getVWAP,
} from "@/lib/utils/calculations"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { hasMarketPrice, positionGlowRowClass } from "@/lib/utils/position-display"
import { useI18n } from "@/i18n/context"
import { TradeRepublicImportWizard } from "@/components/investments/tr-import/TradeRepublicImportWizard"
import { PositionMergeWizard } from "@/components/investments/merge/PositionMergeWizard"
import { isEmptyPosition } from "@/lib/services/asset-merge-suggestions"

const HIDE_ZERO_STORAGE_KEY = "financer.hideZeroPositions"

type SortMode = "depot" | "owner" | "value" | null
const ACCOUNT_FILTER_ALL = "__all_accounts__"

function SortableCardItem({ asset, viewMode }: { asset: Asset; viewMode: "cards" | "list" }) {
  const { t, formatMoney, formatNumber, formatPercent } = useI18n()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: asset.id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  if (viewMode === "list") {
    const eurRate = asset.eurRate ?? 1
    const value = getCurrentValue(asset, asset.entries) * eurRate
    const gainLoss = getTotalGainLoss(asset, asset.entries) * eurRate
    const gainLossPct = getGainLossPercent(asset, asset.entries)
    const vwap = getVWAP(asset.entries) * eurRate
    const qty = parseFloat(asset.quantity)
    const isPos = gainLoss > 0
    const isNeg = gainLoss < 0
    const hasPrice = hasMarketPrice(asset.entries)

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "space-y-3 rounded-md border-b px-3 py-3 transition-colors last:border-0 md:flex md:items-center md:gap-3 md:space-y-0 md:px-2 md:py-2.5",
          positionGlowRowClass(gainLoss, hasPrice)
        )}
      >
        <div className="flex items-center gap-3">
          <button {...attributes} {...listeners} className="flex h-10 w-10 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:text-foreground md:h-auto md:w-auto">
            <GripVertical className="h-4 w-4" />
          </button>
          <AssetLogo ticker={asset.ticker} type={asset.type} size="sm" />
          <div className="flex-1 min-w-0">
            <Link href={`/investments/${asset.id}`} className="font-medium text-sm hover:underline truncate block">
              {asset.name}
            </Link>
            <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
              <span>{asset.ticker}</span>
              {asset.account && (
                <>
                  <span>·</span>
                  <Landmark className="h-3 w-3 shrink-0" />
                  <span className="truncate max-w-[120px] md:max-w-[80px]">{asset.account}</span>
                </>
              )}
              {asset.ownerName && (
                <>
                  <span>·</span>
                  <User className="h-3 w-3 shrink-0" />
                  <span>{asset.ownerName}</span>
                </>
              )}
            </div>
          </div>
          <div className="hidden text-right text-sm shrink-0 md:block">
            <p className="font-medium">{formatMoney(value)}</p>
            <p className="text-xs text-muted-foreground">Ø {formatMoney(vwap)}</p>
          </div>
          <div className={`hidden text-right text-sm shrink-0 w-24 md:block ${isPos ? "text-green-500" : isNeg ? "text-red-500" : "text-muted-foreground"}`}>
            <div className="flex items-center justify-end gap-1">
              {isPos ? <TrendingUp className="h-3.5 w-3.5" /> : isNeg ? <TrendingDown className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
              <span>{isPos ? "+" : ""}{formatPercent(gainLossPct, 2)}</span>
            </div>
            <p className="text-xs">{isPos ? "+" : ""}{formatMoney(gainLoss)}</p>
          </div>
          <div className="hidden text-right text-xs text-muted-foreground shrink-0 w-16 md:block">
            {formatNumber(qty, { maximumFractionDigits: 4 })}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs md:hidden">
          <div>
            <p className="text-muted-foreground">{t("investments.valueVwap")}</p>
            <p className="font-medium">{formatMoney(value)}</p>
            <p className="text-muted-foreground">Ø {formatMoney(vwap)}</p>
          </div>
          <div className={isPos ? "text-green-500" : isNeg ? "text-red-500" : "text-muted-foreground"}>
            <p className="text-muted-foreground">{t("investments.gainLoss")}</p>
            <p className="font-medium">{isPos ? "+" : ""}{formatPercent(gainLossPct, 2)}</p>
            <p>{isPos ? "+" : ""}{formatMoney(gainLoss)}</p>
          </div>
          <div className="text-right text-muted-foreground">
            <p>{t("common.quantity")}</p>
            <p className="font-medium text-foreground">{formatNumber(qty, { maximumFractionDigits: 4 })}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <button
        {...attributes}
        {...listeners}
        className="absolute top-2 right-2 z-10 flex h-10 w-10 cursor-grab items-center justify-center rounded-md bg-background/80 text-muted-foreground opacity-70 backdrop-blur hover:!opacity-100 sm:h-auto sm:w-auto sm:bg-transparent sm:opacity-0 sm:group-hover:opacity-60"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <AssetCard asset={asset} />
    </div>
  )
}

function PortfolioHeader({ total, gainLoss, gainLossPct }: { total: number; gainLoss: number; gainLossPct: number }) {
  const { t, formatMoney, formatPercent } = useI18n()
  const isPos = gainLoss >= 0
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{t("investments.portfolioTotal")}</p>
            <p className="text-3xl font-bold">{formatMoney(total)}</p>
          </div>
          <div className={`text-left sm:text-right ${isPos ? "text-green-500" : "text-red-500"}`}>
            <p className="text-sm font-medium">{isPos ? "+" : ""}{formatMoney(gainLoss)}</p>
            <p className="text-sm">{isPos ? "+" : ""}{formatPercent(gainLossPct, 2)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function applySortMode(assets: Asset[], sortMode: SortMode, compareLocale: (a: string, b: string) => number): Asset[] {
  if (sortMode === null) return assets
  return [...assets].sort((a, b) => {
    if (sortMode === "depot") return compareLocale(a.account ?? "", b.account ?? "")
    if (sortMode === "owner") return compareLocale(a.ownerName ?? "", b.ownerName ?? "")
    if (sortMode === "value") {
      const aVal = getCurrentValue(a, a.entries) * (a.eurRate ?? 1)
      const bVal = getCurrentValue(b, b.entries) * (b.eurRate ?? 1)
      return bVal - aVal
    }
    return 0
  })
}

function SortButton({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <Button
      size="sm"
      variant={active ? "default" : "outline"}
      className="h-10 px-3 text-xs gap-1 sm:h-7 sm:px-2"
      onClick={onClick}
    >
      <ArrowDownUp className="h-3 w-3" />
      {label}
    </Button>
  )
}

function InvestmentsInner({
  onOpenImport,
  hideZeroPositions,
  onHideZeroPositionsChange,
}: {
  onOpenImport: () => void
  hideZeroPositions: boolean
  onHideZeroPositionsChange: (value: boolean) => void
}) {
  const { t, compareLocale } = useI18n()
  const { data: rawAssets, isLoading, error } = useAssets()
  const reorder = useReorderAssets()
  const [localAssets, setLocalAssets] = useState<Asset[] | null>(null)
  const [viewMode, setViewMode] = useState<"cards" | "list">("list")
  const [sortMode, setSortMode] = useState<SortMode>(null)
  const [accountFilter, setAccountFilter] = useState(ACCOUNT_FILTER_ALL)

  const baseAssets = localAssets ?? rawAssets ?? []
  const accountOptions = useMemo(
    () => Array.from(new Set(baseAssets.map((asset) => asset.account?.trim()).filter(Boolean) as string[])).sort(compareLocale),
    [baseAssets, compareLocale]
  )
  const effectiveAccountFilter = accountOptions.includes(accountFilter) ? accountFilter : ACCOUNT_FILTER_ALL
  const accountFiltered = effectiveAccountFilter === ACCOUNT_FILTER_ALL
    ? baseAssets
    : baseAssets.filter((asset) => asset.account === effectiveAccountFilter)

  const zeroHiddenCount = hideZeroPositions
    ? accountFiltered.filter((asset) => isEmptyPosition(asset, asset.entries, asset.eurRate ?? 1)).length
    : 0

  const filteredAssets = hideZeroPositions
    ? accountFiltered.filter((asset) => !isEmptyPosition(asset, asset.entries, asset.eurRate ?? 1))
    : accountFiltered

  const assets = applySortMode(filteredAssets, sortMode, compareLocale)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id || !rawAssets) return

    const oldIndex = assets.findIndex((a) => a.id === active.id)
    const newIndex = assets.findIndex((a) => a.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return

    const reorderedVisible = arrayMove(assets, oldIndex, newIndex)
    const visibleIds = new Set(reorderedVisible.map((asset) => asset.id))
    let visibleIndex = 0
    const reordered = baseAssets.map((asset) => (
      visibleIds.has(asset.id) ? reorderedVisible[visibleIndex++] : asset
    ))
    setLocalAssets(reordered)
    setSortMode(null)
    reorder.mutate(reordered.map((a) => a.id))
  }, [assets, baseAssets, rawAssets, reorder])

  function handleSort(mode: SortMode) {
    setSortMode((prev) => (prev === mode ? null : mode))
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">{t("investments.loadingPortfolio")}</div>
  }
  if (error) {
    return <div className="flex items-center justify-center h-40 text-destructive text-sm">{t("investments.loadFailed")}</div>
  }
  if (!rawAssets || rawAssets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <TrendingUp className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">{t("investments.empty")}</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button variant="outline" onClick={onOpenImport}>
            <Upload className="h-4 w-4 mr-2" />{t("investments.trImport.button")}
          </Button>
          <Link href="/investments/new" className={cn(buttonVariants())}>
            <Plus className="h-4 w-4 mr-2" />{t("investments.addFirst")}
          </Link>
        </div>
      </div>
    )
  }

  const items = baseAssets.map((a) => ({ asset: a, entries: a.entries, eurRate: a.eurRate ?? 1 }))
  const total = items.reduce((s, { asset, entries, eurRate }) => s + getCurrentValue(asset, entries) * eurRate, 0)
  const gainLoss = items.reduce((s, { asset, entries, eurRate }) => s + getTotalGainLoss(asset, entries) * eurRate, 0)
  const costBasis = items.reduce((s, { asset, entries, eurRate }) => {
    const qty = parseFloat(asset.quantity)
    const v = entries.filter((e) => e.type === "PURCHASE" && e.quantity)
      .reduce((a, e) => ({ cost: a.cost + parseFloat(e.price) * parseFloat(e.quantity!), qty: a.qty + parseFloat(e.quantity!) }), { cost: 0, qty: 0 })
    return s + (v.qty > 0 ? (v.cost / v.qty) * qty * eurRate : 0)
  }, 0)
  const gainLossPct = costBasis === 0 ? 0 : (gainLoss / costBasis) * 100

  if (filteredAssets.length === 0 && baseAssets.length > 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <p className="text-muted-foreground">{t("investments.merge.allFilteredEmpty")}</p>
        <Button variant="outline" onClick={() => onHideZeroPositionsChange(false)}>
          {t("investments.merge.hideZeroPositions")}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PortfolioHeader total={total} gainLoss={gainLoss} gainLossPct={gainLossPct} />
      <PortfolioChartPanel assets={baseAssets} />

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
          <p className="text-sm text-muted-foreground">
            {assets.length} {t("common.positions")}
            {zeroHiddenCount > 0 && (
              <button
                type="button"
                className="ml-1 underline-offset-2 hover:underline"
                onClick={() => onHideZeroPositionsChange(false)}
              >
                {t("investments.merge.hiddenZeroCount", { n: zeroHiddenCount })}
              </button>
            )}
          </p>
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:overflow-visible sm:pb-0">
            <SortButton label={t("investments.sortAccount")} active={sortMode === "depot"} onClick={() => handleSort("depot")} />
            <SortButton label={t("investments.sortOwner")} active={sortMode === "owner"} onClick={() => handleSort("owner")} />
            <SortButton label={t("investments.sortValue")} active={sortMode === "value"} onClick={() => handleSort("value")} />
            <Button
              size="sm"
              variant={hideZeroPositions ? "default" : "outline"}
              className="h-10 px-3 text-xs sm:h-7 sm:px-2"
              onClick={() => onHideZeroPositionsChange(!hideZeroPositions)}
            >
              {t("investments.merge.hideZeroPositions")}
            </Button>
            <Select value={effectiveAccountFilter} onValueChange={(value) => setAccountFilter(value ?? ACCOUNT_FILTER_ALL)}>
              <SelectTrigger size="sm" className="h-10 w-[180px] sm:h-7" aria-label={t("investments.filterAccount")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectItem value={ACCOUNT_FILTER_ALL}>{t("investments.allAccounts")}</SelectItem>
                {accountOptions.map((account) => (
                  <SelectItem key={account} value={account}>{account}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {sortMode === null && (
            <span className="text-xs text-muted-foreground">{t("investments.dragToSort")}</span>
          )}
        </div>
        <div className="flex items-center gap-1 border rounded-md p-0.5">
          <Button
            size="sm" variant={viewMode === "cards" ? "default" : "ghost"}
            className="h-10 px-3 sm:h-7 sm:px-2" onClick={() => setViewMode("cards")}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm" variant={viewMode === "list" ? "default" : "ghost"}
            className="h-10 px-3 sm:h-7 sm:px-2" onClick={() => setViewMode("list")}
          >
            <List className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={assets.map((a) => a.id)}
          strategy={viewMode === "cards" ? rectSortingStrategy : verticalListSortingStrategy}
        >
          {viewMode === "cards" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {assets.map((asset) => (
                <SortableCardItem key={asset.id} asset={asset} viewMode="cards" />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="px-2 py-2">
                <div className="hidden items-center gap-3 px-2 pb-1 text-xs font-medium text-muted-foreground border-b mb-1 md:flex">
                  <div className="w-4 shrink-0" />
                  <div className="w-8 shrink-0" />
                  <span className="flex-1">{t("investments.position")}</span>
                  <span className="w-28 text-right">{t("investments.valueVwap")}</span>
                  <span className="w-24 text-right">{t("investments.gainLoss")}</span>
                  <span className="w-16 text-right">{t("common.quantity")}</span>
                </div>
                {assets.map((asset) => (
                  <SortableCardItem key={asset.id} asset={asset} viewMode="list" />
                ))}
              </CardContent>
            </Card>
          )}
        </SortableContext>
      </DndContext>
    </div>
  )
}

export function InvestmentsContent() {
  const { t } = useI18n()
  const [importOpen, setImportOpen] = useState(false)
  const [mergeOpen, setMergeOpen] = useState(false)
  const [hideZeroPositions, setHideZeroPositions] = useState(true)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(HIDE_ZERO_STORAGE_KEY)
      if (stored !== null) setHideZeroPositions(stored === "true")
    } catch {
      /* ignore */
    }
  }, [])

  function handleHideZeroChange(value: boolean) {
    setHideZeroPositions(value)
    try {
      localStorage.setItem(HIDE_ZERO_STORAGE_KEY, String(value))
    } catch {
      /* ignore */
    }
  }

  function openMergeWizard() {
    setMergeOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t("investments.title")}</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />{t("investments.trImport.button")}
          </Button>
          <Button variant="outline" onClick={openMergeWizard}>
            <GitMerge className="h-4 w-4 mr-2" />{t("investments.merge.button")}
          </Button>
          <Link href="/investments/new" className={cn(buttonVariants())}>
            <Plus className="h-4 w-4 mr-2" />{t("investments.add")}
          </Link>
        </div>
      </div>
      <InvestmentsInner
        onOpenImport={() => setImportOpen(true)}
        hideZeroPositions={hideZeroPositions}
        onHideZeroPositionsChange={handleHideZeroChange}
      />
      <TradeRepublicImportWizard
        open={importOpen}
        onOpenChange={setImportOpen}
        onOpenMerge={openMergeWizard}
      />
      <PositionMergeWizard open={mergeOpen} onOpenChange={setMergeOpen} />
    </div>
  )
}
