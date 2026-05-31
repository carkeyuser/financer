export const INTEREST_ASSET_TICKER = "Interest"
export const INTEREST_ASSET_NAME = "Interest"

export function isInterestAsset(asset: { ticker: string }): boolean {
  return asset.ticker === INTEREST_ASSET_TICKER
}

/** Exclude dividend-only Interest placeholder from portfolio/investment queries. */
export const excludeInterestTicker = { not: INTEREST_ASSET_TICKER } as const
