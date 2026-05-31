import { AuthGuard } from "@/components/layout/AuthGuard"

export default function DividendenLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>
}
