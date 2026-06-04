"use client"

import { useTheme } from "next-themes"
import { Sun, Moon, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/i18n/context"
import {
  cycleTheme,
  isAppTheme,
  themeLabelKey,
  type AppTheme,
} from "@/lib/constants/themes"
import { cn } from "@/lib/utils"

function resolveToggleTheme(theme: string | undefined, resolvedTheme: string | undefined): AppTheme {
  if (isAppTheme(theme)) return theme
  if (isAppTheme(resolvedTheme)) return resolvedTheme
  return "light"
}

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const { t } = useI18n()
  const activeTheme = resolveToggleTheme(theme, resolvedTheme)
  const labelKey = themeLabelKey(activeTheme)

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(cycleTheme(activeTheme))}
      aria-label={t("common.themeToggleTo", { theme: t(labelKey) })}
    >
      <Sun
        className={cn(
          "h-4 w-4 transition-all",
          activeTheme === "light" ? "scale-100 opacity-100" : "scale-0 opacity-0 absolute"
        )}
      />
      <Moon
        className={cn(
          "h-4 w-4 transition-all",
          activeTheme === "dark" ? "scale-100 opacity-100" : "scale-0 opacity-0 absolute"
        )}
      />
      <Sparkles
        className={cn(
          "h-4 w-4 transition-all",
          activeTheme === "retrowave" ? "scale-100 opacity-100" : "scale-0 opacity-0 absolute"
        )}
      />
    </Button>
  )
}
