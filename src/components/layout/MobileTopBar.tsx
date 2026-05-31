"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { LogOut, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { HouseholdSwitcher } from "./HouseholdSwitcher"
import { ThemeToggle } from "./ThemeToggle"
import { useI18n } from "@/i18n/context"
import { cn } from "@/lib/utils"
import { navItems } from "./navigation"

interface MobileTopBarProps {
  householdName?: string | null
}

export function MobileTopBar({ householdName }: MobileTopBarProps) {
  const pathname = usePathname()
  const { t } = useI18n()

  return (
    <header className="sticky top-0 z-30 border-b bg-card/95 px-4 py-3 backdrop-blur md:hidden">
      <div className="flex items-center gap-2">
        <Sheet>
          <SheetTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("nav.openMenu")}
              />
            }
          >
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-80 max-w-[85vw] gap-0 p-0">
            <SheetHeader className="border-b">
              <SheetTitle>{t("nav.menu")}</SheetTitle>
              <div>
                <p className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                  {t("nav.householdLabel")}
                </p>
                <HouseholdSwitcher />
                <p className="truncate text-xs font-medium text-muted-foreground">
                  {householdName ?? t("common.dash")}
                </p>
              </div>
            </SheetHeader>
            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
              {navItems.map(({ href, labelKey, icon: Icon, children }) => {
                const active = pathname === href || pathname.startsWith(`${href}/`)
                return (
                  <div key={href} className="space-y-1">
                    <SheetClose
                      render={
                        <Link
                          href={href}
                          className={cn(
                            "flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm transition-all duration-100 active:scale-95",
                            active
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          )}
                        />
                      }
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {t(labelKey)}
                    </SheetClose>
                    {children && (
                      <div className="ml-5 space-y-1 border-l pl-2">
                        {children.map(({ href: childHref, labelKey: childLabelKey, icon: ChildIcon }) => {
                          const childActive = pathname === childHref || pathname.startsWith(`${childHref}/`)
                          return (
                            <SheetClose
                              key={childHref}
                              render={
                                <Link
                                  href={childHref}
                                  className={cn(
                                    "flex min-h-10 items-center gap-2 rounded-md px-3 py-2 text-sm transition-all duration-100 active:scale-95",
                                    childActive
                                      ? "bg-accent text-accent-foreground"
                                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                  )}
                                />
                              }
                            >
                              <ChildIcon className="h-3.5 w-3.5 shrink-0" />
                              {t(childLabelKey)}
                            </SheetClose>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </nav>
            <Separator />
            <div className="p-3">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-muted-foreground"
                onClick={() => signOut({ callbackUrl: "/auth/login" })}
              >
                <LogOut className="h-4 w-4" />
                {t("nav.logout")}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">
            {t("nav.householdLabel")}
          </p>
          <div className="flex items-center gap-2">
            <HouseholdSwitcher />
            <p className="truncate text-xs font-medium text-muted-foreground">
              {householdName ?? t("common.dash")}
            </p>
          </div>
        </div>
        <ThemeToggle />
      </div>
    </header>
  )
}
