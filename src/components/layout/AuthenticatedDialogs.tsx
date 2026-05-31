"use client"

import { useState } from "react"
import { PortfolioPriceRefresh } from "@/components/investments/PortfolioPriceRefresh"
import { LoginSnapshotDialog } from "@/components/dashboard/LoginSnapshotDialog"
import { UpdateNotesDialog } from "./UpdateNotesDialog"

export function AuthenticatedDialogs() {
  const [updateNotesDone, setUpdateNotesDone] = useState(false)

  return (
    <>
      <PortfolioPriceRefresh />
      <UpdateNotesDialog onDismiss={() => setUpdateNotesDone(true)} />
      {updateNotesDone && <LoginSnapshotDialog />}
    </>
  )
}
