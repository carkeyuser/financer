import { AuthGuard } from "@/components/layout/AuthGuard"

export default function EinkommenLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>
}
