import type { LucideIcon } from "lucide-react"
import {
  LayoutDashboard,
  Monitor,
  Sun,
  TrendingUp,
  DollarSign,
  PiggyBank,
  Calculator,
  Users,
  Settings,
  Wallet,
} from "lucide-react"
import type { MessageKey } from "@/i18n/messages"

export interface NavItem {
  href: string
  labelKey: MessageKey
  icon: LucideIcon
  children?: { href: string; labelKey: MessageKey; icon: LucideIcon }[]
}

export const navItems: NavItem[] = [
  { href: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { href: "/heute", labelKey: "nav.today", icon: Sun },
  { href: "/ambient", labelKey: "nav.ambient", icon: Monitor },
  { href: "/investments", labelKey: "nav.investments", icon: TrendingUp },
  { href: "/dividenden", labelKey: "nav.dividends", icon: DollarSign },
  {
    href: "/haushaltskasse",
    labelKey: "nav.householdFinance",
    icon: PiggyBank,
    children: [
      { href: "/haushaltskasse/simulation", labelKey: "nav.householdSimulation", icon: Calculator },
    ],
  },
  { href: "/einkommen", labelKey: "nav.personalIncome", icon: Wallet },
  { href: "/household", labelKey: "nav.users", icon: Users },
  { href: "/settings", labelKey: "nav.settings", icon: Settings },
]
