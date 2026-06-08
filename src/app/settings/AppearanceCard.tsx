"use client"

import Link from "next/link"
import { useTheme } from "next-themes"
import { Monitor } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useI18n } from "@/i18n/context"
import { APP_THEMES } from "@/lib/constants/themes"

const THEME_LABEL_KEYS = {
  light: "settings.themeLight",
  dark: "settings.themeDark",
  retrowave: "settings.themeRetrowave",
} as const

export function AppearanceCard() {
  const { theme, setTheme } = useTheme()
  const { t } = useI18n()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("settings.appearance")}</CardTitle>
        <CardDescription>{t("settings.appearanceDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-w-xs">
          <Label htmlFor="theme">{t("settings.appearance")}</Label>
          <Select
            value={theme ?? "system"}
            onValueChange={(value) => {
              if (value) setTheme(value)
            }}
          >
            <SelectTrigger id="theme" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">{t("settings.themeSystem")}</SelectItem>
              {APP_THEMES.map((appTheme) => (
                <SelectItem key={appTheme} value={appTheme}>
                  {t(THEME_LABEL_KEYS[appTheme])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="mt-6 pt-4 border-t space-y-2">
          <p className="text-sm font-medium">{t("settings.ambientKiosk")}</p>
          <p className="text-xs text-muted-foreground">{t("ambient.openKioskDescription")}</p>
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/ambient" />}>
            <Monitor className="h-4 w-4" />
            {t("ambient.openKiosk")}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
