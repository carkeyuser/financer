"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { LogOut } from "lucide-react"
import { HouseholdSwitcher } from "./HouseholdSwitcher"
import { ReleaseNotesMenuButton } from "./ReleaseNotesMenuButton"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useI18n } from "@/i18n/context"
import { navItems } from "./navigation"

interface SidebarProps {
  householdName?: string | null
}

export function Sidebar({ householdName }: SidebarProps) {
  const pathname = usePathname()
  const { t } = useI18n()

  return (
    <aside className="hidden flex-col w-60 min-h-screen border-r bg-card md:flex">
      <div className="px-4 py-5">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
          {t("nav.householdLabel")}
        </p>
        <HouseholdSwitcher />
        <p className="font-semibold text-sm truncate mt-1">{householdName ?? t("common.dash")}</p>
      </div>
      <Separator />
      <nav className="flex-1 px-2 py-3 space-y-1">
        {navItems.map(({ href, labelKey, icon: Icon, children }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <div key={href} className="space-y-1">
              <Link
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-100 active:scale-95",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {t(labelKey)}
              </Link>
              {children && active && (
                <div className="ml-5 space-y-1 border-l pl-2">
                  {children.map(({ href: childHref, labelKey: childLabelKey, icon: ChildIcon }) => {
                    const childActive = pathname === childHref || pathname.startsWith(`${childHref}/`)
                    return (
                      <Link
                        key={childHref}
                        href={childHref}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-all duration-100 active:scale-95",
                          childActive
                            ? "bg-accent text-accent-foreground"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        <ChildIcon className="h-3.5 w-3.5 shrink-0" />
                        {t(childLabelKey)}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>
      <Separator />
      <div className="p-2 space-y-1">
        <ReleaseNotesMenuButton />
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground"
          onClick={() => signOut({ callbackUrl: "/auth/login" })}
        >
          <LogOut className="h-4 w-4" />
          {t("nav.logout")}
        </Button>
      </div>
    </aside>
  )
}
