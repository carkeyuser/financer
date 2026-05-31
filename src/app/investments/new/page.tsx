import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { AssetForm } from "@/components/investments/AssetForm"
import { NewInvestmentCardTitle, NewInvestmentPageHeader } from "@/components/investments/NewInvestmentPageHeader"

export default async function NewInvestmentPage() {
  const session = await auth()
  if (!session?.user) redirect("/auth/login")

  return (
    <div className="max-w-xl">
      <NewInvestmentPageHeader />
      <Card>
        <CardHeader>
          <NewInvestmentCardTitle />
        </CardHeader>
        <CardContent>
          <AssetForm />
        </CardContent>
      </Card>
    </div>
  )
}
