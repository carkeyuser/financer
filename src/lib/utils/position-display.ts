/** Logo-URL (FMP); bei 404 zeigt AssetLogo den Typ-Badge. */
export function getAssetLogoUrl(ticker: string): string {
  const base = ticker.includes("-") ? ticker.split("-")[0] : ticker.split(".")[0]
  return `https://financialmodelingprep.com/image-stock/${encodeURIComponent(base.toUpperCase())}.png`
}

export function hasMarketPrice(entries: { type: string }[]): boolean {
  return entries.some((e) => e.type === "PRICE_UPDATE")
}

/** Dezenter Schimmer für Cards (F-27). */
export function positionGlowCardClass(gainLoss: number, hasPrice: boolean): string {
  if (!hasPrice || gainLoss === 0) return ""
  if (gainLoss > 0) {
    return "shadow-[0_0_20px_-6px] shadow-green-500/30 ring-1 ring-green-500/20"
  }
  return "shadow-[0_0_20px_-6px] shadow-red-500/30 ring-1 ring-red-500/20"
}

/** Dezenter Hintergrund für Listenzeilen (F-27). */
export function positionGlowRowClass(gainLoss: number, hasPrice: boolean): string {
  if (!hasPrice || gainLoss === 0) return "hover:bg-muted/20"
  if (gainLoss > 0) {
    return "bg-green-500/[0.06] ring-1 ring-inset ring-green-500/15 hover:bg-green-500/[0.09]"
  }
  return "bg-red-500/[0.06] ring-1 ring-inset ring-red-500/15 hover:bg-red-500/[0.09]"
}
