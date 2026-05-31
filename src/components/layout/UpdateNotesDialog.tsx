"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ChevronDown, Sparkles } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { useI18n } from "@/i18n/context"
import { APP_VERSION } from "@/lib/constants/app-version"
import { getLastSeenVersion, markVersionSeen } from "@/lib/constants/update-notes"
import {
  compareVersions,
  getReleaseNotesUpTo,
  getUnseenReleaseNotes,
  RELEASES_URL,
  type ReleaseNotes,
} from "@/data/release-notes"

type UpdateNotesDialogProps = {
  onDismiss?: () => void
  manualOpen?: boolean
  onManualOpenChange?: (open: boolean) => void
}

function ReleaseNotesBody({ notes }: { notes: ReleaseNotes[] }) {
  const { locale, t, formatDate } = useI18n()
  const [expanded, setExpanded] = useState<Set<string>>(() =>
    notes[0] ? new Set([notes[0].version]) : new Set(),
  )

  useEffect(() => {
    setExpanded(notes[0] ? new Set([notes[0].version]) : new Set())
  }, [notes])

  function toggleVersion(version: string, open: boolean) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (open) next.add(version)
      else next.delete(version)
      return next
    })
  }

  return (
    <div className="max-h-[50vh] space-y-1 overflow-y-auto pr-1">
      {notes.map((entry) => {
        const isOpen = expanded.has(entry.version)
        return (
          <Collapsible
            key={entry.version}
            open={isOpen}
            onOpenChange={(open) => toggleVersion(entry.version, open)}
            className="border-b border-border/60 last:border-b-0"
          >
            <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 rounded-md py-2 text-left transition-colors hover:bg-accent/50">
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {t("updateNotes.versionLabel", { version: entry.version })}
                </p>
                <p className="text-xs text-muted-foreground">{formatDate(entry.date)}</p>
              </div>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                  isOpen && "rotate-180",
                )}
                aria-hidden
              />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ul className="list-disc space-y-1 pb-3 pl-5 text-sm text-muted-foreground">
                {entry.highlights[locale].map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        )
      })}
    </div>
  )
}

export function UpdateNotesDialog({
  onDismiss,
  manualOpen = false,
  onManualOpenChange,
}: UpdateNotesDialogProps) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [notes, setNotes] = useState<ReleaseNotes[]>([])
  const onDismissRef = useRef(onDismiss)

  onDismissRef.current = onDismiss

  const isManual = onManualOpenChange !== undefined

  useEffect(() => {
    if (isManual) return

    const lastSeen = getLastSeenVersion()

    if (!lastSeen) {
      markVersionSeen(APP_VERSION)
      onDismissRef.current?.()
      return
    }

    if (compareVersions(lastSeen, APP_VERSION) >= 0) {
      onDismissRef.current?.()
      return
    }

    const unseen = getUnseenReleaseNotes(lastSeen, APP_VERSION)
    if (unseen.length === 0) {
      markVersionSeen(APP_VERSION)
      onDismissRef.current?.()
      return
    }

    setNotes(unseen)
    setOpen(true)
  }, [isManual])

  useEffect(() => {
    if (!isManual || !manualOpen) return
    setNotes(getReleaseNotesUpTo(APP_VERSION))
    setOpen(true)
  }, [isManual, manualOpen])

  function handleOpenChange(nextOpen: boolean) {
    if (isManual) {
      onManualOpenChange?.(nextOpen)
      if (!nextOpen) setOpen(false)
      return
    }

    setOpen(nextOpen)
    if (!nextOpen) {
      markVersionSeen(APP_VERSION)
      onDismissRef.current?.()
    }
  }

  if (!isManual && notes.length === 0 && !open) return null

  const titleVersion =
    notes.length === 1 ? notes[0]!.version : APP_VERSION

  return (
    <Dialog open={isManual ? manualOpen && open : open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {t("updateNotes.title", { version: titleVersion })}
          </DialogTitle>
          <DialogDescription>{t("updateNotes.description")}</DialogDescription>
        </DialogHeader>

        {notes.length > 0 ? <ReleaseNotesBody notes={notes} /> : null}

        <DialogFooter className="gap-2 sm:gap-0">
          <Link
            href={RELEASES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            {t("updateNotes.allReleases")}
          </Link>
          <Button onClick={() => handleOpenChange(false)}>{t("common.ok")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
