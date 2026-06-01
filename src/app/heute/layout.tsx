import { AuthGuard } from "@/components/layout/AuthGuard"

export default function HeuteLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>
}
