import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AssetDetailContent } from "./AssetDetailContent"

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) redirect("/auth/login")

  const { id } = await params
  return <AssetDetailContent assetId={id} />
}
