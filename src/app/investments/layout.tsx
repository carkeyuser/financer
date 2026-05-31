import { AuthGuard } from "@/components/layout/AuthGuard"

export default function InvestmentsLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>
}
