import type { AssetEntryType } from "@/generated/prisma"

export interface QuantityEntry {
  type: AssetEntryType
  quantity: string | null
  date: Date
}

const QTY_EPSILON = 1e-6

export function recalculateQuantityFromEntries(entries: QuantityEntry[]): number {
  const sorted = [...entries].sort((a, b) => a.date.getTime() - b.date.getTime())
  let qty = 0

  for (const entry of sorted) {
    if (entry.type === "PURCHASE" && entry.quantity) {
      qty += parseFloat(entry.quantity)
    } else if (entry.type === "SALE" && entry.quantity) {
      qty -= parseFloat(entry.quantity)
    } else if (entry.type === "QUANTITY_UPDATE" && entry.quantity) {
      qty = parseFloat(entry.quantity)
    }
  }

  return qty
}

export function isQuantityEffectivelyZero(quantity: number): boolean {
  return Math.abs(quantity) < QTY_EPSILON
}
