import type { TrImportPreviewRow, TrParsedRow, TrTickerOverride } from "@/lib/services/tr-import-types"

export interface TrImportPreviewCacheEntry {
  previewId: string
  householdId: string
  userId: string
  targetUserId: string
  account: string
  parsedRows: TrParsedRow[]
  previewRows: TrImportPreviewRow[]
  createdAt: number
}

const CACHE_TTL_MS = 30 * 60 * 1000
const cache = new Map<string, TrImportPreviewCacheEntry>()

export function storePreview(entry: TrImportPreviewCacheEntry): void {
  purgeExpired()
  cache.set(entry.previewId, entry)
}

export function getPreview(previewId: string, householdId: string, userId: string): TrImportPreviewCacheEntry | null {
  purgeExpired()
  const entry = cache.get(previewId)
  if (!entry) return null
  if (entry.householdId !== householdId) return null
  if (entry.userId !== userId && entry.targetUserId !== userId) return null
  return entry
}

export function deletePreview(previewId: string): void {
  cache.delete(previewId)
}

function purgeExpired() {
  const now = Date.now()
  for (const [key, entry] of cache.entries()) {
    if (now - entry.createdAt > CACHE_TTL_MS) cache.delete(key)
  }
}

export type { TrTickerOverride }
