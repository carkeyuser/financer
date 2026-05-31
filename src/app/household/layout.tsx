import { AuthGuard } from "@/components/layout/AuthGuard"

export default function HouseholdLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>
}
