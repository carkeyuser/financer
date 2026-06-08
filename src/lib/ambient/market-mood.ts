export type MarketMood = "bullish" | "bearish" | "calm" | "mixed" | "empty"

export interface MoodInput {
  gainLossPct: number
}

export function deriveMarketMood(
  positions: MoodInput[]
): MarketMood {
  if (positions.length === 0) return "empty"

  const pcts = positions.map((p) => p.gainLossPct).filter((p) => Number.isFinite(p))
  if (pcts.length === 0) return "empty"

  const avg = pcts.reduce((s, p) => s + p, 0) / pcts.length
  const max = Math.max(...pcts)
  const min = Math.min(...pcts)

  if (Math.abs(max) < 0.5 && Math.abs(min) < 0.5 && Math.abs(avg) < 0.3) {
    return "calm"
  }
  if (avg >= 1.5 && min > -4) return "bullish"
  if (avg <= -1.5 || min <= -4) return "bearish"
  return "mixed"
}

export const AMBIENT_PANEL_COUNT = 7
export const AMBIENT_PANEL_ROTATION_MS = 12_000
