import type { AssetType } from "@/generated/prisma"
import { isInterestAsset } from "@/lib/constants/interest-asset"
import { getCurrentValue, type CalcEntry } from "@/lib/utils/calculations"

export type MergeConfidence = "high" | "medium" | "low"

export interface MergeScanEntry extends CalcEntry {
  importRef?: string | null
}

export interface MergeSuggestionAsset {
  id: string
  ticker: string
  name: string
  isin: string | null
  account: string
  type: AssetType
  entryCount: number
  quantity: string
  valueEur: number
  ownerName: string
  userId: string
}

export interface MergeSuggestionGroup {
  id: string
  confidence: MergeConfidence
  score: number
  reasonKey: string
  assets: MergeSuggestionAsset[]
  suggestedTargetId: string
  trImportRelevant: boolean
}

export interface AssetForMergeScan {
  id: string
  userId: string
  ticker: string
  name: string
  type: AssetType
  isin: string | null
  account: string
  quantity: string
  order: number
  ownerName: string
  entries: MergeScanEntry[]
  eurRate: number
}

const EXCHANGE_SUFFIXES = [".DE", ".L", ".AS", ".PA", ".MI", ".SW", ".ST", ".TO", ".V", ".HK", ".OL", ".CO", ".NS", ".BO"]

export function normalizeTicker(ticker: string): string {
  let t = ticker.trim().toUpperCase()
  for (const suffix of EXCHANGE_SUFFIXES) {
    if (t.endsWith(suffix)) {
      t = t.slice(0, -suffix.length)
      break
    }
  }
  if (t.endsWith("-USD")) t = t.slice(0, -4)
  return t
}

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function nameSimilarity(a: string, b: string): number {
  const na = normalizeName(a)
  const nb = normalizeName(b)
  if (!na || !nb) return 0
  if (na === nb) return 1
  if (na.includes(nb) || nb.includes(na)) return 0.92

  const tokensA = new Set(na.split(" ").filter((t) => t.length > 2))
  const tokensB = new Set(nb.split(" ").filter((t) => t.length > 2))
  if (tokensA.size === 0 || tokensB.size === 0) return 0

  let overlap = 0
  for (const t of tokensA) {
    if (tokensB.has(t)) overlap++
  }
  return overlap / Math.max(tokensA.size, tokensB.size)
}

interface PairMatch {
  reasonKey: string
  score: number
  confidence: MergeConfidence
}

export function matchAssetPair(a: AssetForMergeScan, b: AssetForMergeScan): PairMatch | null {
  if (a.userId !== b.userId) return null
  if (isInterestAsset(a) || isInterestAsset(b)) return null

  const isinA = a.isin?.trim().toUpperCase()
  const isinB = b.isin?.trim().toUpperCase()

  if (isinA && isinB && isinA === isinB) {
    return { reasonKey: "merge.reasonSameIsin", score: 95, confidence: "high" }
  }

  const nameSim = nameSimilarity(a.name, b.name)
  const oneIsin = (isinA && !isinB) || (!isinA && isinB)
  if (oneIsin && nameSim >= 0.85 && a.account === b.account) {
    return { reasonKey: "merge.reasonNameAndAccount", score: 75, confidence: "medium" }
  }

  const normTickerA = normalizeTicker(a.ticker)
  const normTickerB = normalizeTicker(b.ticker)
  if (normTickerA.length >= 2 && normTickerA === normTickerB) {
    return { reasonKey: "merge.reasonSameTicker", score: 70, confidence: "medium" }
  }

  if (nameSim >= 0.9 && a.type === b.type && a.account === b.account) {
    return { reasonKey: "merge.reasonSimilarName", score: 55, confidence: "low" }
  }

  return null
}

class UnionFind {
  private parent = new Map<string, string>()

  find(id: string): string {
    if (!this.parent.has(id)) this.parent.set(id, id)
    let root = id
    while (this.parent.get(root) !== root) root = this.parent.get(root)!
    let node = id
    while (this.parent.get(node) !== root) {
      const next = this.parent.get(node)!
      this.parent.set(node, root)
      node = next
    }
    return root
  }

  union(a: string, b: string) {
    const ra = this.find(a)
    const rb = this.find(b)
    if (ra !== rb) this.parent.set(rb, ra)
  }
}

function pairKey(idA: string, idB: string): string {
  return [idA, idB].sort().join(":")
}

function allPairsMatch(members: AssetForMergeScan[], pairMeta: Map<string, PairMatch>): boolean {
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      if (!pairMeta.has(pairKey(members[i]!.id, members[j]!.id))) return false
    }
  }
  return true
}

function splitIntoMaximalCliques(
  members: AssetForMergeScan[],
  pairMeta: Map<string, PairMatch>
): AssetForMergeScan[][] {
  const remaining = [...members]
  const cliques: AssetForMergeScan[][] = []

  while (remaining.length > 0) {
    const clique: AssetForMergeScan[] = [remaining[0]!]
    for (let i = 1; i < remaining.length; i++) {
      const candidate = remaining[i]!
      const fits = clique.every((m) => pairMeta.has(pairKey(m.id, candidate.id)))
      if (fits) clique.push(candidate)
    }
    cliques.push(clique)
    const cliqueIds = new Set(clique.map((m) => m.id))
    for (let i = remaining.length - 1; i >= 0; i--) {
      if (cliqueIds.has(remaining[i]!.id)) remaining.splice(i, 1)
    }
  }

  return cliques.filter((c) => c.length >= 2)
}

function toSuggestionAsset(asset: AssetForMergeScan): MergeSuggestionAsset {
  return {
    id: asset.id,
    ticker: asset.ticker,
    name: asset.name,
    isin: asset.isin,
    account: asset.account,
    type: asset.type,
    entryCount: asset.entries.length,
    quantity: asset.quantity,
    valueEur: getCurrentValue(asset, asset.entries) * asset.eurRate,
    ownerName: asset.ownerName,
    userId: asset.userId,
  }
}

function pickSuggestedTarget(assets: AssetForMergeScan[]): string {
  const scored = assets.map((a) => {
    let score = a.entries.length * 10
    if (a.isin) score += 50
    if (a.type === "STOCK" || a.type === "ETF") {
      if (a.ticker.toUpperCase().endsWith(".DE")) score += 30
      else if (a.ticker.includes(".")) score += 10
    }
    score += parseFloat(a.quantity) > 0 ? 20 : 0
    return { id: a.id, score }
  })
  scored.sort((x, y) => y.score - x.score)
  return scored[0]!.id
}

function isTrImportRelevant(members: AssetForMergeScan[], trAccount?: string): boolean {
  if (!trAccount) return false
  return members.some(
    (a) =>
      a.account === trAccount &&
      a.entries.some((e) => typeof e.importRef === "string" && e.importRef.startsWith("tr:"))
  )
}

function buildGroupFromMembers(
  members: AssetForMergeScan[],
  pairMeta: Map<string, PairMatch>,
  trAccount?: string
): MergeSuggestionGroup {
  let bestMeta: PairMatch = { reasonKey: "merge.reasonSimilarName", score: 55, confidence: "low" }
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const meta = pairMeta.get(pairKey(members[i]!.id, members[j]!.id))
      if (meta && meta.score > bestMeta.score) bestMeta = meta
    }
  }

  const suggestedTargetId = pickSuggestedTarget(members)
  return {
    id: members.map((m) => m.id).sort().join("-"),
    confidence: bestMeta.confidence,
    score: bestMeta.score,
    reasonKey: bestMeta.reasonKey,
    assets: members.map(toSuggestionAsset).sort((a, b) => b.valueEur - a.valueEur),
    suggestedTargetId,
    trImportRelevant: isTrImportRelevant(members, trAccount),
  }
}

export function buildMergeSuggestionGroups(
  assets: AssetForMergeScan[],
  options?: { trAccount?: string }
): MergeSuggestionGroup[] {
  const trAccount = options?.trAccount
  const eligible = assets.filter((a) => !isInterestAsset(a))
  const uf = new UnionFind()
  const pairMeta = new Map<string, PairMatch>()

  for (let i = 0; i < eligible.length; i++) {
    for (let j = i + 1; j < eligible.length; j++) {
      const match = matchAssetPair(eligible[i]!, eligible[j]!)
      if (match) {
        uf.union(eligible[i]!.id, eligible[j]!.id)
        const key = pairKey(eligible[i]!.id, eligible[j]!.id)
        const existing = pairMeta.get(key)
        if (!existing || match.score > existing.score) {
          pairMeta.set(key, match)
        }
      }
    }
  }

  const components = new Map<string, AssetForMergeScan[]>()
  for (const asset of eligible) {
    const root = uf.find(asset.id)
    if (!components.has(root)) components.set(root, [])
    components.get(root)!.push(asset)
  }

  const groups: MergeSuggestionGroup[] = []

  for (const [, members] of components) {
    if (members.length < 2) continue

    const subgroups =
      members.length >= 3 && !allPairsMatch(members, pairMeta)
        ? splitIntoMaximalCliques(members, pairMeta)
        : [members]

    for (const subgroup of subgroups) {
      if (subgroup.length < 2) continue
      groups.push(buildGroupFromMembers(subgroup, pairMeta, trAccount))
    }
  }

  return groups.sort((a, b) => b.score - a.score)
}

export function isEmptyPosition(
  asset: { id?: string; quantity: string; ticker: string },
  entries: CalcEntry[],
  eurRate: number
): boolean {
  if (isInterestAsset(asset)) return false
  const qty = parseFloat(asset.quantity)
  if (Math.abs(qty) < 1e-6) return true
  return getCurrentValue({ id: asset.id ?? "", quantity: asset.quantity }, entries) * eurRate < 0.01
}
