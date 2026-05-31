import { AuthGuard } from "@/components/layout/AuthGuard"

export default function HaushaltskasseLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>
}
