"use client"

import { useState, useRef } from "react"
import { toast } from "sonner"
import { Download, Upload, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useI18n } from "@/i18n/context"
import { translateApiError } from "@/i18n/api-errors"

export function BackupCard() {
  const { locale, t } = useI18n()
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleExport() {
    setExporting(true)
    try {
      const res = await fetch("/api/backup")
      if (!res.ok) {
        toast.error(t("backup.exportFailed"))
        return
      }
      const data = await res.json()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      const date = new Date().toISOString().slice(0, 10)
      a.href = url
      a.download = `financer-backup-${date}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(t("backup.downloaded"))
    } finally {
      setExporting(false)
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingFile(file)
    e.target.value = ""
  }

  async function handleImportConfirm() {
    if (!pendingFile) return
    setImporting(true)
    try {
      let parsed: unknown
      try {
        parsed = JSON.parse(await pendingFile.text())
      } catch {
        toast.error(t("backup.invalidJson"))
        return
      }

      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      })

      if (!res.ok) {
        toast.error(translateApiError(await res.json(), locale))
        return
      }

      toast.success(t("backup.restored"))
      setTimeout(() => window.location.reload(), 1500)
    } finally {
      setImporting(false)
      setPendingFile(null)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="h-4 w-4" />
            {t("backup.title")}
          </CardTitle>
          <CardDescription>{t("backup.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleExport} disabled={exporting} variant="outline" className="w-full sm:w-auto">
            {exporting ? t("backup.exporting") : t("backup.create")}
          </Button>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full sm:w-auto">
              <Upload className="h-4 w-4 mr-2" />
              {t("backup.restore")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!pendingFile} onOpenChange={(o) => !o && setPendingFile(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {t("backup.restoreConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("backup.restoreConfirmDescription").replace(
                "{filename}",
                pendingFile?.name ?? ""
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleImportConfirm} disabled={importing}>
              {importing ? t("backup.restoring") : t("backup.restoreConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
