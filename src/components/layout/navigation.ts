import type { LucideIcon } from "lucide-react"
import {
  LayoutDashboard,
  TrendingUp,
  DollarSign,
  PiggyBank,
  Calculator,
  Users,
  Settings,
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
  { href: "/household", labelKey: "nav.users", icon: Users },
  { href: "/settings", labelKey: "nav.settings", icon: Settings },
]
