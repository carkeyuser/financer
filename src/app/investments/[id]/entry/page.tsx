import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AssetEntryForm } from "@/components/investments/AssetEntryForm"
import { AssetEntryPageHeader } from "@/components/investments/AssetEntryPageHeader"

export default async function AssetEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.householdId) redirect("/auth/login")

  const { id } = await params

  const asset = await prisma.asset.findFirst({
    where: { id, householdId: session.user.householdId },
    select: { id: true, name: true, ticker: true, currency: true },
  })

  if (!asset) redirect("/investments")

  return (
    <div className="max-w-xl">
      <AssetEntryPageHeader />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {asset.name} ({asset.ticker})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AssetEntryForm assetId={asset.id} assetName={asset.name} ticker={asset.ticker} assetCurrency={asset.currency} />
        </CardContent>
      </Card>
    </div>
  )
}
