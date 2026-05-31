"use client"

import { useState } from "react"
import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/i18n/context"
import { UpdateNotesDialog } from "./UpdateNotesDialog"

export function ReleaseNotesMenuButton() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="ghost"
        className="w-full justify-start gap-3 text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Sparkles className="h-4 w-4" />
        {t("nav.releaseNotes")}
      </Button>
      <UpdateNotesDialog manualOpen={open} onManualOpenChange={setOpen} />
    </>
  )
}
