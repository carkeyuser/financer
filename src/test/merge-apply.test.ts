import { describe, it, expect, vi } from "vitest"
import { INTEREST_ASSET_TICKER } from "@/lib/constants/interest-asset"
import { MergeAssetsError, mergeAssets } from "@/lib/services/asset-merge-apply"
import type { Prisma } from "@/generated/prisma"

type Tx = Prisma.TransactionClient

function makeAsset(
  id: string,
  overrides: Partial<{
    userId: string
    ticker: string
    isin: string | null
    notes: string | null
    order: number
    quantity: string
  }> = {}
) {
  return {
    id,
    userId: overrides.userId ?? "user-1",
    ticker: overrides.ticker ?? "EUNL.DE",
    isin: overrides.isin ?? "IE00B4L5Y983",
    wkn: null,
    notes: overrides.notes ?? null,
    order: overrides.order ?? 0,
    quantity: overrides.quantity ?? "10",
    entries: [{ id: `entry-${id}` }],
  }
}

function createMockTx(options: {
  assets: ReturnType<typeof makeAsset>[]
  entries?: Array<{ type: string; quantity: string | null; date: Date; price: string | null }>
}) {
  const entries = options.entries ?? [
    { type: "PURCHASE", quantity: "10", date: new Date("2024-01-01"), price: "100" },
    { type: "PURCHASE", quantity: "5", date: new Date("2024-02-01"), price: "110" },
  ]

  const assetFindMany = vi.fn().mockResolvedValue(options.assets)
  const entryUpdateMany = vi.fn().mockResolvedValue({ count: 1 })
  const dividendUpdateMany = vi.fn().mockResolvedValue({ count: 0 })
  const entryFindMany = vi.fn().mockResolvedValue(entries)
  const assetUpdate = vi.fn().mockResolvedValue({})
  const assetDeleteMany = vi.fn().mockResolvedValue({ count: 1 })

  const tx = {
    asset: { findMany: assetFindMany, update: assetUpdate, deleteMany: assetDeleteMany },
    assetEntry: { updateMany: entryUpdateMany, findMany: entryFindMany },
    dividendPayment: { updateMany: dividendUpdateMany },
  } as unknown as Tx

  return { tx, assetFindMany, entryUpdateMany, dividendUpdateMany, entryFindMany, assetUpdate, assetDeleteMany }
}

describe("mergeAssets", () => {
  it("moves entries and dividends, deletes sources, recalculates quantity", async () => {
    const { tx, entryUpdateMany, dividendUpdateMany, assetUpdate, assetDeleteMany } = createMockTx({
      assets: [makeAsset("target"), makeAsset("source", { ticker: "EUNL", quantity: "0", order: 1 })],
    })

    const result = await mergeAssets(tx, {
      householdId: "hh-1",
      targetAssetId: "target",
      sourceAssetIds: ["source"],
    })

    expect(result.targetAssetId).toBe("target")
    expect(entryUpdateMany).toHaveBeenCalledWith({
      where: { assetId: "source" },
      data: { assetId: "target" },
    })
    expect(dividendUpdateMany).toHaveBeenCalledWith({
      where: { assetId: "source" },
      data: { assetId: "target" },
    })
    expect(assetUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "target" },
        data: expect.objectContaining({ quantity: "15" }),
      })
    )
    expect(assetDeleteMany).toHaveBeenCalledWith({ where: { id: { in: ["source"] } } })
  })

  it("rejects cross-user merge with 422", async () => {
    const { tx } = createMockTx({
      assets: [makeAsset("target"), makeAsset("source", { userId: "user-2" })],
    })

    await expect(
      mergeAssets(tx, { householdId: "hh-1", targetAssetId: "target", sourceAssetIds: ["source"] })
    ).rejects.toMatchObject({ status: 422 } satisfies Partial<MergeAssetsError>)
  })

  it("rejects interest asset merge with 403", async () => {
    const { tx } = createMockTx({
      assets: [makeAsset("target"), makeAsset("source", { ticker: INTEREST_ASSET_TICKER, isin: null })],
    })

    await expect(
      mergeAssets(tx, { householdId: "hh-1", targetAssetId: "target", sourceAssetIds: ["source"] })
    ).rejects.toMatchObject({ status: 403 } satisfies Partial<MergeAssetsError>)
  })

  it("rejects negative quantity after merge with 422", async () => {
    const { tx } = createMockTx({
      assets: [makeAsset("target"), makeAsset("source")],
      entries: [
        { type: "PURCHASE", quantity: "2", date: new Date("2024-01-01"), price: "100" },
        { type: "SALE", quantity: "10", date: new Date("2024-02-01"), price: "100" },
      ],
    })

    await expect(
      mergeAssets(tx, { householdId: "hh-1", targetAssetId: "target", sourceAssetIds: ["source"] })
    ).rejects.toMatchObject({ status: 422 } satisfies Partial<MergeAssetsError>)
  })
})
